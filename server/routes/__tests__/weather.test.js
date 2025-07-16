const request = require('supertest');
const express = require('express');

// Mock node-fetch before requiring the router
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

// Mock rate limiter
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

const weatherRouter = require('../weather');

describe('Weather Routes', () => {
  let app;

  // Sample weather data from OpenWeatherMap
  const mockWeatherResponse = {
    coord: { lon: -74.006, lat: 40.7128 },
    weather: [{
      id: 800,
      main: 'Clear',
      description: 'clear sky',
      icon: '01d'
    }],
    main: {
      temp: 72.5,
      feels_like: 70.2,
      temp_min: 68.1,
      temp_max: 75.9,
      pressure: 1013,
      humidity: 45
    },
    visibility: 10000,
    wind: {
      speed: 8.5,
      deg: 230
    },
    clouds: { all: 1 },
    dt: 1624301234,
    sys: {
      type: 1,
      id: 5141,
      country: 'US',
      sunrise: 1624265400,
      sunset: 1624318800
    },
    timezone: -14400,
    id: 5128581,
    name: 'New York',
    cod: 200
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/weather', weatherRouter);
    
    // Reset mocks
    jest.clearAllMocks();
    fetch.mockClear();
    
    // Set up default environment
    process.env.OPENWEATHER_API_KEY = 'test-weather-api-key';

    // Clear the interval to prevent test interference
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.OPENWEATHER_API_KEY;
    jest.useRealTimers();
  });

  describe('GET /api/v1/weather/coordinates/:lat/:lon', () => {
    it('should fetch weather data by coordinates', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      const response = await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          temperature: 73,
          feelsLike: 70,
          tempMin: 68,
          tempMax: 76,
          humidity: 45,
          pressure: 1013,
          windSpeed: 8.5,
          windDeg: 230,
          clouds: 1,
          visibility: 10000,
          condition: {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d'
          },
          cityName: 'New York',
          country: 'US',
          timestamp: expect.any(Number)
        },
        cached: false
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.openweathermap.org/data/2.5/weather?lat=40.7128&lon=-74.006')
      );
    });

    it('should return cached data when available', async () => {
      // First request to populate cache
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(200);

      // Reset mock to ensure it's not called again
      fetch.mockClear();

      // Second request should use cache
      const response = await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(200);

      expect(response.body.cached).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/weather/coordinates/invalid/coordinates')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid coordinates provided'
      });
    });

    it('should return 500 when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const response = await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Weather service is not properly configured'
      });
    });

    it('should handle OpenWeatherMap API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Invalid API key' })
      });

      const response = await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Failed to fetch weather data',
        status: 401
      });
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Failed to process weather request'
      });
    });
  });

  describe('GET /api/v1/weather/city/:city', () => {
    it('should fetch weather data by city name', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      const response = await request(app)
        .get('/api/v1/weather/city/New York')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          cityName: 'New York',
          country: 'US'
        }),
        cached: false
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=New%20York')
      );
    });

    it('should fetch weather data by city and country', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      await request(app)
        .get('/api/v1/weather/city/London?country=UK')
        .expect(200);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=London%2CUK')
      );
    });

    it('should use cache for city searches', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      // First request
      await request(app)
        .get('/api/v1/weather/city/New York')
        .expect(200);

      fetch.mockClear();

      // Second request should use cache
      const response = await request(app)
        .get('/api/v1/weather/city/New York')
        .expect(200);

      expect(response.body.cached).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return 500 when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const response = await request(app)
        .get('/api/v1/weather/city/New York')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Weather service is not properly configured'
      });
    });

    it('should handle city not found errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'City not found' })
      });

      const response = await request(app)
        .get('/api/v1/weather/city/InvalidCityName')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Failed to fetch weather data',
        status: 404
      });
    });
  });

  describe('GET /api/v1/weather/health', () => {
    it('should return healthy status when API key is configured', async () => {
      const response = await request(app)
        .get('/api/v1/weather/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'weather',
        configured: true,
        apiKeyPrefix: 'test-wea...',
        cacheSize: 0,
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy status when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const response = await request(app)
        .get('/api/v1/weather/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'unhealthy',
        service: 'weather',
        configured: false,
        apiKeyPrefix: 'none',
        cacheSize: 0,
        timestamp: expect.any(String)
      });
    });

    it('should report cache size', async () => {
      // Populate cache with a request
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(200);

      const response = await request(app)
        .get('/api/v1/weather/health')
        .expect(200);

      expect(response.body.cacheSize).toBe(1);
    });
  });

  describe('GET /api/v1/weather/test', () => {
    it('should test weather API with NYC coordinates', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      const response = await request(app)
        .get('/api/v1/weather/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 200,
        data: mockWeatherResponse,
        error: null,
        apiKeyPrefix: 'test-wea...'
      });
    });

    it('should handle test endpoint errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Invalid API key' })
      });

      const response = await request(app)
        .get('/api/v1/weather/test')
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        status: 401,
        data: null,
        error: { message: 'Invalid API key' },
        apiKeyPrefix: 'test-wea...'
      });
    });

    it('should return error when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;

      const response = await request(app)
        .get('/api/v1/weather/test')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Weather service is not properly configured',
        hasKey: false
      });
    });
  });

  describe('Cache Management', () => {
    it('should clean up expired cache entries', async () => {
      // Populate cache
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWeatherResponse)
      });

      await request(app)
        .get('/api/v1/weather/coordinates/40.7128/-74.0060')
        .expect(200);

      // Check initial cache size
      let healthResponse = await request(app)
        .get('/api/v1/weather/health')
        .expect(200);
      
      expect(healthResponse.body.cacheSize).toBe(1);

      // Fast forward time past cache duration (10 minutes + 1 minute for cleanup interval)
      jest.advanceTimersByTime(11 * 60 * 1000);

      // Check cache should be cleaned
      healthResponse = await request(app)
        .get('/api/v1/weather/health')
        .expect(200);
      
      expect(healthResponse.body.cacheSize).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting middleware', () => {
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60 * 1000,
        max: 20,
        message: 'Too many weather requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });
});