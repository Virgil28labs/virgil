const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/v1/weather/coordinates/:lat/:lon
 * Get weather by coordinates
 */
router.get('/coordinates/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    
    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided'
      });
    }

    // Check cache
    const cacheKey = `${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Validate API key
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'Weather service is not properly configured'
      });
    }

    // Fetch from OpenWeatherMap
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
      await response.json().catch(() => ({}));
      
      return res.status(response.status).json({
        error: 'Failed to fetch weather data',
        status: response.status
      });
    }

    const data = await response.json();
    
    // Transform data to our format
    const weatherData = {
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
        icon: data.weather[0].icon
      },
      sunrise: data.sys.sunrise * 1000,
      sunset: data.sys.sunset * 1000,
      timezone: data.timezone,
      cityName: data.name,
      country: data.sys.country,
      timestamp: Date.now()
    };

    // Update cache
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: weatherData,
      cached: false
    });

  } catch {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process weather request'
    });
  }
});

/**
 * GET /api/v1/weather/city/:city
 * Get weather by city name
 */
router.get('/city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const { country } = req.query;
    
    if (!city) {
      return res.status(400).json({
        error: 'City name is required'
      });
    }

    // Build location string
    const location = country ? `${city},${country}` : city;
    const cacheKey = `city-${location.toLowerCase()}`;
    
    // Check cache
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Validate API key
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Weather service is not properly configured'
      });
    }

    // Fetch from OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      await response.json().catch(() => ({}));
      
      return res.status(response.status).json({
        error: 'Failed to fetch weather data',
        status: response.status
      });
    }

    const data = await response.json();
    
    // Transform data
    const weatherData = {
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
        icon: data.weather[0].icon
      },
      sunrise: data.sys.sunrise * 1000,
      sunset: data.sys.sunset * 1000,
      timezone: data.timezone,
      cityName: data.name,
      country: data.sys.country,
      timestamp: Date.now()
    };

    // Update cache
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: weatherData,
      cached: false
    });

  } catch {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process weather request'
    });
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
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/weather/forecast/coordinates/:lat/:lon
 * Get 5-day weather forecast by coordinates
 */
router.get('/forecast/coordinates/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    
    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided'
      });
    }

    // Check cache
    const cacheKey = `forecast-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Validate API key
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'Weather service is not properly configured'
      });
    }

    // Fetch from OpenWeatherMap forecast API
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
      await response.json().catch(() => ({}));
      
      return res.status(response.status).json({
        error: 'Failed to fetch forecast data',
        status: response.status
      });
    }

    const data = await response.json();
    
    // Process 3-hour forecast data into daily summaries
    const dailyForecasts = processForecastData(data);
    
    // Update cache
    weatherCache.set(cacheKey, {
      data: dailyForecasts,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: dailyForecasts,
      cached: false
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process forecast request'
    });
  }
});

/**
 * GET /api/v1/weather/forecast/city/:city
 * Get 5-day weather forecast by city name
 */
router.get('/forecast/city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const { country } = req.query;
    
    if (!city) {
      return res.status(400).json({
        error: 'City name is required'
      });
    }

    // Build location string
    const location = country ? `${city},${country}` : city;
    const cacheKey = `forecast-city-${location.toLowerCase()}`;
    
    // Check cache
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Validate API key
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Weather service is not properly configured'
      });
    }

    // Fetch from OpenWeatherMap forecast API
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      await response.json().catch(() => ({}));
      
      return res.status(response.status).json({
        error: 'Failed to fetch forecast data',
        status: response.status
      });
    }

    const data = await response.json();
    
    // Process 3-hour forecast data into daily summaries
    const dailyForecasts = processForecastData(data);
    
    // Update cache
    weatherCache.set(cacheKey, {
      data: dailyForecasts,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: dailyForecasts,
      cached: false
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process forecast request'
    });
  }
});

/**
 * Process 3-hour forecast data into daily summaries
 */
function processForecastData(data) {
  const dailyData = {};
  
  // Group forecast data by day
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailyData[dayKey]) {
      dailyData[dayKey] = {
        date: dayKey,
        temps: [],
        conditions: [],
        icons: [],
        descriptions: [],
        humidity: [],
        windSpeed: []
      };
    }
    
    dailyData[dayKey].temps.push(item.main.temp);
    dailyData[dayKey].conditions.push(item.weather[0].main);
    dailyData[dayKey].icons.push(item.weather[0].icon);
    dailyData[dayKey].descriptions.push(item.weather[0].description);
    dailyData[dayKey].humidity.push(item.main.humidity);
    dailyData[dayKey].windSpeed.push(item.wind.speed);
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
    const avgHumidity = Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length);
    const avgWindSpeed = Math.round(day.windSpeed.reduce((a, b) => a + b) / day.windSpeed.length);
    
    return {
      date: day.date,
      tempMin,
      tempMax,
      condition: {
        main: mainCondition,
        description,
        icon: icon.replace('n', 'd') // Always use day icons for consistency
      },
      humidity: avgHumidity,
      windSpeed: avgWindSpeed
    };
  });
  
  // Return only next 5 days
  return {
    cityName: data.city.name,
    country: data.city.country,
    forecasts: forecasts.slice(0, 5)
  };
}

/**
 * GET /api/v1/weather/test
 * Test endpoint with hardcoded coordinates
 */
router.get('/test', async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Weather service is not properly configured',
        hasKey: false
      });
    }

    // Test with New York coordinates
    const lat = 40.7128;
    const lon = -74.0060;
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    res.json({
      success: response.ok,
      status: response.status,
      data: response.ok ? data : null,
      error: !response.ok ? data : null
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
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