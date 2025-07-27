const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

// Constants
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

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
    const error = new Error(errorData.message || 'Failed to fetch weather data');
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// Helper function to build API URLs
const buildApiUrl = (endpoint, params, apiKey) => {
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  url.searchParams.append('appid', apiKey);
  url.searchParams.append('units', 'imperial');
  return url.toString();
};

// Helper function to fetch air quality data
const fetchAirQualityData = async (lat, lon, apiKey) => {
  try {
    const url = buildApiUrl('air_pollution', { lat, lon }, apiKey);
    const data = await fetchWeatherData(url);

    return {
      aqi: data.list[0].main.aqi,
      pm2_5: data.list[0].components.pm2_5,
      pm10: data.list[0].components.pm10,
      co: data.list[0].components.co,
      no2: data.list[0].components.no2,
      o3: data.list[0].components.o3,
      so2: data.list[0].components.so2,
    };
  } catch (_error) {
    // Return null if air quality fetch fails (non-critical)
    return null;
  }
};

// Process 3-hour forecast data into daily summaries
const processForecastData = data => {
  // Group forecast data by day
  const dailyMap = data.list.reduce((acc, item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!acc[dayKey]) {
      acc[dayKey] = {
        date: dayKey,
        temps: [],
        conditions: new Map(),
        icons: [],
        descriptions: [],
        humidity: [],
        windSpeed: [],
      };
    }

    const day = acc[dayKey];
    day.temps.push(item.main.temp);
    day.icons.push(item.weather[0].icon);
    day.descriptions.push(item.weather[0].description);
    day.humidity.push(item.main.humidity);
    day.windSpeed.push(item.wind.speed);

    // Count condition occurrences
    const condition = item.weather[0].main;
    day.conditions.set(condition, (day.conditions.get(condition) || 0) + 1);

    return acc;
  }, {});

  // Convert to array and calculate daily summaries
  const forecasts = Object.values(dailyMap)
    .map(day => {
      // Find most common condition
      const mainCondition = [...day.conditions.entries()]
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];

      const conditionIndex = day.icons.findIndex((_, i) =>
        data.list[i]?.weather[0].main === mainCondition,
      );

      return {
        date: day.date,
        tempMin: Math.round(Math.min(...day.temps)),
        tempMax: Math.round(Math.max(...day.temps)),
        condition: {
          main: mainCondition,
          description: day.descriptions[conditionIndex] || day.descriptions[0],
          icon: (day.icons[conditionIndex] || day.icons[0]).replace('n', 'd'),
        },
        humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        windSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length),
      };
    })
    .slice(0, 5); // Only next 5 days

  return {
    cityName: data.city.name,
    country: data.city.country,
    forecasts,
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
      apiUrl = buildApiUrl('weather', { lat: latitude, lon: longitude }, req.apiKey);
    } else if (city) {
      // City-based request
      const location = country ? `${city},${country}` : city;
      cacheKey = `weather-city-${location.toLowerCase()}`;
      apiUrl = buildApiUrl('weather', { q: location }, req.apiKey);
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

    // Fetch weather data first
    const weatherResponse = await fetchWeatherData(apiUrl);

    // Fetch air quality data in parallel using coordinates from weather response
    const [weatherData, airQualityData] = await Promise.all([
      Promise.resolve(transformWeatherData(weatherResponse)),
      fetchAirQualityData(weatherResponse.coord.lat, weatherResponse.coord.lon, req.apiKey),
    ]);

    // Include air quality data if available
    if (airQualityData) {
      weatherData.airQuality = airQualityData;
    }

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
      apiUrl = buildApiUrl('forecast', { lat: latitude, lon: longitude }, req.apiKey);
    } else if (city) {
      // City-based request
      const location = country ? `${city},${country}` : city;
      cacheKey = `forecast-city-${location.toLowerCase()}`;
      apiUrl = buildApiUrl('forecast', { q: location }, req.apiKey);
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
}, CACHE_CLEANUP_INTERVAL); // Run every 5 minutes

module.exports = router;
