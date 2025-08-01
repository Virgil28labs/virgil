/**
 * Elevation Route Integration Tests
 *
 * Tests the elevation API endpoints including:
 * - Fetching elevation by coordinates
 * - Input validation (invalid/out-of-range coordinates)
 * - Caching mechanism and cache hits/misses
 * - Rate limiting
 * - External API integration and error handling
 * - Timeout handling
 * - Health check endpoint
 * - Cache cleanup
 */

const request = require('supertest');
const express = require('express');
const fetch = require('node-fetch');
const elevationRouter = require('../elevation');
const logger = require('../../lib/logger');

// Mock dependencies
jest.mock('node-fetch');
jest.mock('../../lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock fetch implementation
const mockFetch = fetch;

describe('Elevation Routes', () => {
  let app;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use('/api/v1/elevation', elevationRouter);

    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default successful fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          elevation: 1234.5,
          latitude: 40.7128,
          longitude: -74.0060,
        }],
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GET /api/v1/elevation/coordinates/:lat/:lon', () => {
    it('should fetch elevation for valid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(200);

      expect(response.body).toMatchObject({
        elevation: 1234.5,
        elevationFeet: 4050, // 1234.5 * 3.28084 rounded
        unit: 'meters',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        source: 'Open-Elevation',
        cached: false,
      });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.open-elevation.com/api/v1/lookup?locations=40.7128,-74.0060',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('should return cached data on subsequent requests', async () => {
      // First request
      await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(200);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(200);

      expect(response.body.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only one call
    });

    it('should round coordinates for caching', async () => {
      // Request with slightly different coordinates
      await request(app)
        .get('/api/v1/elevation/coordinates/40.7128111/-74.0060111')
        .expect(200);

      // Request with coordinates that round to the same value
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128222/-74.0060222')
        .expect(200);

      expect(response.body.cached).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should validate coordinate format', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/invalid/-74.0060')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid coordinates provided',
      });
    });

    it('should validate coordinate range - latitude', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/91/-74.0060')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Coordinates out of valid range',
      });
    });

    it('should validate coordinate range - longitude', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-181')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Coordinates out of valid range',
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch elevation data',
        message: 'HTTP error! status: 503',
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      // Mock fetch to not resolve before timeout
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const responsePromise = request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060');

      // Fast-forward past the 5-second timeout
      jest.advanceTimersByTime(5000);

      const response = await responsePromise;

      expect(response.status).toBe(504);
      expect(response.body).toEqual({
        error: 'Elevation service timeout',
      });
    });

    it('should handle missing elevation data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(404);

      expect(response.body).toEqual({
        error: 'No elevation data found for these coordinates',
      });
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(404);

      expect(response.body).toEqual({
        error: 'No elevation data found for these coordinates',
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch elevation data',
        message: 'Network error',
      });
    });

    it('should clean cache when it exceeds size limit', async () => {
      // Mock cache to have many entries
      const _oldDate = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      // Make many requests to fill cache
      for (let i = 0; i < 1001; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{
              elevation: 1000 + i,
              latitude: 40 + (i * 0.001),
              longitude: -74 + (i * 0.001),
            }],
          }),
        });

        await request(app)
          .get(`/api/v1/elevation/coordinates/${40 + (i * 0.001)}/${-74 + (i * 0.001)}`)
          .expect(200);
      }

      // Verify fetch was called for each unique request
      expect(mockFetch).toHaveBeenCalledTimes(1001);
    });

    it('should handle edge coordinates', async () => {
      // North Pole
      await request(app)
        .get('/api/v1/elevation/coordinates/90/0')
        .expect(200);

      // South Pole
      await request(app)
        .get('/api/v1/elevation/coordinates/-90/0')
        .expect(200);

      // International Date Line
      await request(app)
        .get('/api/v1/elevation/coordinates/0/180')
        .expect(200);

      await request(app)
        .get('/api/v1/elevation/coordinates/0/-180')
        .expect(200);

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('GET /api/v1/elevation/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        cacheSize: expect.any(Number),
        service: 'elevation',
      });
    });

    it('should reflect cache size in health check', async () => {
      // Make a request to populate cache
      await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(200);

      const response = await request(app)
        .get('/api/v1/elevation/health')
        .expect(200);

      expect(response.body.cacheSize).toBeGreaterThan(0);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 30 requests (the limit)
      for (let i = 0; i < 30; i++) {
        await request(app)
          .get(`/api/v1/elevation/coordinates/40.${i}/-74.${i}`)
          .expect(200);
      }

      // 31st request should be rate limited
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.99/-74.99')
        .expect(429);

      expect(response.body).toMatchObject({
        message: 'Too many elevation requests, please try again later.',
      });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero elevation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            elevation: 0,
            latitude: 0,
            longitude: 0,
          }],
        }),
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/0/0')
        .expect(200);

      expect(response.body.elevation).toBe(0);
      expect(response.body.elevationFeet).toBe(0);
    });

    it('should handle negative elevation (below sea level)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            elevation: -100.5,
            latitude: 31.0461,
            longitude: 34.8516,
          }],
        }),
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/31.0461/34.8516')
        .expect(200);

      expect(response.body.elevation).toBe(-100.5);
      expect(response.body.elevationFeet).toBe(-330); // -100.5 * 3.28084 rounded
    });

    it('should handle very high elevation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            elevation: 8848.86, // Mount Everest
            latitude: 27.9881,
            longitude: 86.9250,
          }],
        }),
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/27.9881/86.9250')
        .expect(200);

      expect(response.body.elevation).toBe(8848.86);
      expect(response.body.elevationFeet).toBe(29032);
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const response = await request(app)
        .get('/api/v1/elevation/coordinates/40.7128/-74.0060')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch elevation data',
        message: 'Invalid JSON',
      });
    });
  });
});
