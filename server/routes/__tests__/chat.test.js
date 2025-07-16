const request = require('supertest');
const express = require('express');

// Mock node-fetch before requiring the router
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

// Mock rate limiter to avoid rate limit issues in tests
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

const chatRouter = require('../chat');

describe('Chat Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/chat', chatRouter);
    
    // Reset mocks
    jest.clearAllMocks();
    fetch.mockClear();
    
    // Set up default environment
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.OPENAI_API_KEY;
  });

  describe('POST /api/v1/chat', () => {
    it('should successfully proxy chat request to OpenAI', async () => {
      const mockOpenAIResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Hello! How can I help you today?'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        })
      };
      
      fetch.mockResolvedValue(mockOpenAIResponse);

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you today?'
        },
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        })
      );
    });

    it('should use custom model and parameters when provided', async () => {
      const mockOpenAIResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
          usage: {}
        })
      };
      
      fetch.mockResolvedValue(mockOpenAIResponse);

      await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 500
        })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody).toMatchObject({
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 500
      });
    });

    it('should return 400 error when messages are missing', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
    });

    it('should return 400 error when messages is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: 'invalid'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
    });

    it('should return 400 error when messages array is empty', async () => {
      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: []
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Messages array is required and must not be empty'
      });
    });

    it('should return 500 error when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Chat service is not properly configured'
      });
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({
          error: {
            message: 'Rate limit exceeded'
          }
        })
      };
      
      fetch.mockResolvedValue(mockErrorResponse);

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(429);

      expect(response.body).toEqual({
        error: 'Failed to get response from chat service',
        status: 429
      });
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        message: 'Failed to process chat request'
      });
    });

    it('should handle malformed OpenAI responses', async () => {
      const mockBadResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing expected structure
          invalid: 'response'
        })
      };
      
      fetch.mockResolvedValue(mockBadResponse);

      const response = await request(app)
        .post('/api/v1/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/chat/health', () => {
    it('should return healthy status when API key is configured', async () => {
      const response = await request(app)
        .get('/api/v1/chat/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'chat',
        configured: true,
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy status when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .get('/api/v1/chat/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'unhealthy',
        service: 'chat',
        configured: false,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting middleware', async () => {
      // Since we mocked the rate limiter, we just verify it was called
      const rateLimit = require('express-rate-limit');
      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 60 * 1000,
        max: 30,
        message: 'Too many chat requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });
});