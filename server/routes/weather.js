const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

// Constants
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Weather-specific rate limiter
const weatherLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 weather requests per minute
  message: 'Too many weather requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(weatherLimiter);

// Cache for weather data
const weatherCache = new Map();

// Middleware to validate API key configuration
const validateApiKey = (req, res, next) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Weather service is not properly configured',
    });
  }
  req.apiKey = apiKey;
  next();
};

// Utility function to transform OpenWeatherMap data to our format
const transformWeatherData = data => ({
  temperature: Math.round(data.main.temp),
  feelsLike: Math.round(data.main.feels_like),
  tempMin: Math.round(data.main.temp_min),
  tempMax: Math.round(data.main.temp_max),
  humidity: data.main.humidity,
  pressure: data.main.pressure,
  windSpeed: data.wind.speed,
  windDeg: data.wind.deg,
  clouds: data.clouds.all,
  visibility: data.visibility,
  condition: {
    id: data.weather[0].id,
    main: data.weather[0].main,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
  },
  sunrise: data.sys.sunrise * 1000,
  sunset: data.sys.sunset * 1000,
  timezone: data.timezone,
  cityName: data.name,
  country: data.sys.country,
  timestamp: Date.now(),
});

// Utility function to check cache
const checkCache = key => {
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Utility function to update cache
const updateCache = (key, data) => {
  weatherCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Utility function to make OpenWeatherMap API request
const fetchWeatherData = async url => {
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.message || 'Failed to fetch weather data',
    };
  }

  return response.json();
};

// Process 3-hour forecast data into daily summaries
const processForecastData = data => {
  const dailyData = {};

  // Group forecast data by day (using local timezone, not UTC)
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    // Use local date instead of UTC to prevent wrong day display
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    const dayKey = `${year}-${month}-${dayOfMonth}`; // Local YYYY-MM-DD format

    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        temps: [],
        conditions: [],
        icons: [],
        descriptions: [],
        humidity: [],
        windSpeed: [],
      };
    }

    const day = dailyData[dayKey];
    day.temps.push(item.main.temp);
    day.conditions.push(item.weather[0].main);
    day.icons.push(item.weather[0].icon);
    day.descriptions.push(item.weather[0].description);
    day.humidity.push(item.main.humidity);
    day.windSpeed.push(item.wind.speed);
  });

  // Convert to array and calculate daily summaries
  const forecasts = Object.values(dailyData).map(day => {
    // Find min/max temperatures
    const tempMin = Math.round(Math.min(...day.temps));
    const tempMax = Math.round(Math.max(...day.temps));

    // Find most common weather condition
    const conditionCounts = {};
    day.conditions.forEach(condition => {
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    const mainCondition = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Find corresponding icon for main condition
    const conditionIndex = day.conditions.findIndex(c => c === mainCondition);
    const icon = day.icons[conditionIndex];
    const description = day.descriptions[conditionIndex];

    // Calculate averages
    const avgHumidity = Math.round(
      day.humidity.reduce((a, b) => a + b) / day.humidity.length,
    );
    const avgWindSpeed = Math.round(
      day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length,
    );

    return {
      date: day.date,
      tempMin,
      tempMax,
      condition: {
        main: mainCondition,
        description,
        icon: icon.replace('n', 'd'), // Always use day icons for consistency
      },
      humidity: avgHumidity,
      windSpeed: avgWindSpeed,
    };
  });

  // Return only next 5 days
  return {
    cityName: data.city.name,
    country: data.city.country,
    forecasts: forecasts.slice(0, 5),
  };
};

/**
 * GET /api/v1/weather
 * Get current weather by coordinates or city
 * Query params: lat, lon OR city, country
 */
router.get('/', validateApiKey, async (req, res) => {
  try {
    const { lat, lon, city, country } = req.query;

    // Determine request type and build cache key
    let apiUrl;
    let cacheKey;

    if (lat && lon) {
      // Coordinates-based request
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates provided',
        });
      }

      cacheKey = `weather-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
      apiUrl = `${API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}` +
        `&appid=${req.apiKey}&units=imperial`;
    } else if (city) {
      // City-based request
      const location = country ? `${city},${country}` : city;
      cacheKey = `weather-city-${location.toLowerCase()}`;
      apiUrl = `${API_BASE_URL}/weather?q=${encodeURIComponent(location)}` +
        `&appid=${req.apiKey}&units=imperial`;
    } else {
      return res.status(400).json({
        error: 'Either coordinates (lat, lon) or city name is required',
      });
    }

    // Check cache
    const cachedData = checkCache(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // Fetch from OpenWeatherMap
    const data = await fetchWeatherData(apiUrl);
    const weatherData = transformWeatherData(data);

    // Update cache
    updateCache(cacheKey, weatherData);

    res.json({
      success: true,
      data: weatherData,
      cached: false,
    });

  } catch (error) {
    if (error.status) {
      res.status(error.status).json({
        error: error.message,
        status: error.status,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process weather request',
      });
    }
  }
});

/**
 * GET /api/v1/weather/forecast
 * Get 5-day weather forecast by coordinates or city
 * Query params: lat, lon OR city, country
 */
router.get('/forecast', validateApiKey, async (req, res) => {
  try {
    const { lat, lon, city, country } = req.query;

    // Determine request type and build cache key
    let apiUrl;
    let cacheKey;

    if (lat && lon) {
      // Coordinates-based request
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates provided',
        });
      }

      cacheKey = `forecast-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
      apiUrl = `${API_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}` +
        `&appid=${req.apiKey}&units=imperial`;
    } else if (city) {
      // City-based request
      const location = country ? `${city},${country}` : city;
      cacheKey = `forecast-city-${location.toLowerCase()}`;
      apiUrl = `${API_BASE_URL}/forecast?q=${encodeURIComponent(location)}` +
        `&appid=${req.apiKey}&units=imperial`;
    } else {
      return res.status(400).json({
        error: 'Either coordinates (lat, lon) or city name is required',
      });
    }

    // Check cache
    const cachedData = checkCache(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // Fetch from OpenWeatherMap
    const data = await fetchWeatherData(apiUrl);
    const forecastData = processForecastData(data);

    // Update cache
    updateCache(cacheKey, forecastData);

    res.json({
      success: true,
      data: forecastData,
      cached: false,
    });

  } catch (error) {
    if (error.status) {
      res.status(error.status).json({
        error: error.message,
        status: error.status,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process forecast request',
      });
    }
  }
});

/**
 * GET /api/v1/weather/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const hasApiKey = !!process.env.OPENWEATHER_API_KEY;

  res.json({
    status: hasApiKey ? 'healthy' : 'unhealthy',
    service: 'weather',
    configured: hasApiKey,
    cacheSize: weatherCache.size,
    timestamp: new Date().toISOString(),
  });
});

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of weatherCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      weatherCache.delete(key);
    }
  }
}, 60 * 1000); // Run every minute

module.exports = router;
