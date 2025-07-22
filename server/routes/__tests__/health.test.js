const request = require('supertest');
const express = require('express');
const healthRouter = require('../health');

// Mock the cache and queue modules to avoid import errors
jest.mock('../../middleware/cache', () => ({
  cache: {
    get: jest.fn(),
  },
}));

jest.mock('../../services/queue', () => ({
  RequestQueue: {},
}));

describe('Health Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', healthRouter);
  });

  describe('GET /api', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
      });
    });

    it('should include proper headers', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/detailed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        process: {
          pid: expect.any(Number),
          version: expect.any(String),
          memoryUsage: {
            rss: expect.stringMatching(/\d+\.\d+ MB/),
            heapTotal: expect.stringMatching(/\d+\.\d+ MB/),
            heapUsed: expect.stringMatching(/\d+\.\d+ MB/),
            external: expect.stringMatching(/\d+\.\d+ MB/),
          },
        },
        system: expect.any(Object),
        services: expect.any(Object),
      });
    });

    it('should check OpenAI service status', async () => {
      // Temporarily remove OpenAI API key
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .get('/api/detailed')
        .expect(200);

      expect(response.body.services.openai).toBe(false);

      // Restore API key
      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('GET /api/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('ready');
    });
  });

  describe('GET /api/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/live')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({ alive: true });
    });
  });
});
