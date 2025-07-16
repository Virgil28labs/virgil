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
      const errorData = await response.json().catch(() => ({}));
      
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

  } catch (error) {
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
      const errorData = await response.json().catch(() => ({}));
      
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

  } catch (error) {
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