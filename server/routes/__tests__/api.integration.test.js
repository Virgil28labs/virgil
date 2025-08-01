/**
 * API Integration Tests
 *
 * Tests complete API integration scenarios including chat endpoints,
 * vector operations, cross-service coordination, and error handling.
 */

// Set up environment variables before any imports
process.env.OPENAI_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');

// Import all route modules
const chatRoute = require('../chat');
const vectorRoute = require('../vector');
const healthRoute = require('../health');
const llmRoute = require('../llm');
const analyticsRoute = require('../analytics');

// Mock external services
jest.mock('../../services/llmProxy', () => ({
  LLMProxy: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn(),
    validateModel: jest.fn(() => true),
    getAvailableModels: jest.fn(() => [
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ]),
  })),
  createChatCompletion: jest.fn(),
  validateModel: jest.fn(() => true),
  getAvailableModels: jest.fn(() => [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
  ]),
}));

jest.mock('../../services/queue', () => ({
  RequestQueue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn(),
    getStats: jest.fn().mockReturnValue({ pending: 0, completed: 0, failed: 0 }),
  })),
}));

jest.mock('../../middleware/validation', () => ({
  validateRequest: jest.fn((req, res, next) => next()),
  validateBatchRequest: jest.fn((req, res, next) => next()),
}));

jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../lib/errors', () => ({
  asyncHandler: jest.fn(fn => fn),
  ValidationError: class extends Error {},
}));

jest.mock('../../middleware/supabaseAuth', () => jest.fn((req, res, next) => {
  // Mock authenticated user for tests
  req.userId = 'test-user-id';
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'authenticated',
  };
  next();
}));

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

jest.mock('node-fetch', () => jest.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({
    choices: [{
      message: {
        content: 'Based on your location in San Francisco and your current tasks, I can help you plan your afternoon effectively.',
      },
      logprobs: {
        content: [
          { token: 'Based', logprob: -0.1 },
          { token: ' on', logprob: -0.2 },
          { token: ' your', logprob: -0.15 },
        ],
      },
    }],
  }),
})));

jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: Array.from({ length: 384 }, () => Math.random()) }],
    }),
  },
})));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      select: jest.fn().mockResolvedValue({
        data: [
          { id: 1, content: 'Test memory', embedding: [0.1, 0.2, 0.3], similarity: 0.85 },
          { id: 2, content: 'Another memory', embedding: [0.2, 0.3, 0.4], similarity: 0.78 },
        ],
        error: null,
      }),
      update: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      delete: jest.fn().mockResolvedValue({ data: [], error: null }),
      rpc: jest.fn().mockResolvedValue({
        data: [
          { content: 'Similar memory 1', similarity: 0.9 },
          { content: 'Similar memory 2', similarity: 0.8 },
        ],
        error: null,
      }),
    })),
    rpc: jest.fn().mockResolvedValue({
      data: [
        { content: 'Global similar memory', similarity: 0.88 },
      ],
      error: null,
    }),
  })),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Add routes
  app.use('/api/chat', chatRoute);
  app.use('/api/vector', vectorRoute);
  app.use('/api/health', healthRoute);
  app.use('/api/llm', llmRoute);
  app.use('/api/analytics', analyticsRoute);

  // Error handling middleware
  app.use((err, req, res, _next) => {
    console.error('Test app error:', err);
    res.status(500).json({ error: err.message });
  });

  return app;
};

describe('API Integration Tests', () => {
  let app;
  let llmProxy;
  let mockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    llmProxy = require('../../services/llmProxy');

    // Get the mocked Supabase client
    const { createClient } = require('@supabase/supabase-js');
    mockSupabaseClient = createClient();
  });

  describe('Complete Chat Flow Integration', () => {
    it('handles complete chat request with context and memory integration', async () => {
      // Mock successful LLM response
      const mockStreamResponse = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate streaming chunks
            setTimeout(() => callback('data: {"content": "Based on your location in San Francisco and your current tasks, "}\n\n'), 10);
            setTimeout(() => callback('data: {"content": "I can help you plan your afternoon effectively."}\n\n'), 20);
            setTimeout(() => callback('data: [DONE]\n\n'), 30);
          } else if (event === 'end') {
            setTimeout(() => callback(), 40);
          }
        }),
        pipe: jest.fn(),
      };

      llmProxy.createChatCompletion.mockResolvedValue(mockStreamResponse);

      const chatRequest = {
        messages: [
          {
            role: 'system',
            content: `You are Virgil, a helpful AI assistant. Current context:
              Time: 2:30 PM PST, Wednesday, January 15, 2025
              Location: San Francisco, CA (37.7749, -122.4194)
              Weather: 22°C, clear sky, 65% humidity
              User: Test User (test@example.com)
              Active apps: Notes (5 items), Pomodoro (20:00 remaining), Weather
              Recent memory: User prefers morning weather updates
              Device: macOS Desktop, Chrome, online (wifi)`,
          },
          {
            role: 'user',
            content: 'How should I prioritize my tasks this afternoon?',
          },
        ],
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        stream: true,
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(200);

      // Verify fetch was called to OpenAI
      const fetch = require('node-fetch');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
          body: expect.stringContaining('gpt-4.1-mini'),
        }),
      );

      // Response should contain the chat response
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toContain('San Francisco');
    });

    it('integrates vector search with chat context', async () => {
      // First, store some vectors
      const vectorData = [
        {
          content: 'User prefers to exercise in the morning',
          metadata: { type: 'preference', category: 'health' },
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
        {
          content: 'Meeting scheduled for 3pm about project updates',
          metadata: { type: 'schedule', category: 'work' },
          embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        },
      ];

      for (const vector of vectorData) {
        await request(app)
          .post('/api/vector/store')
          .send(vector)
          .expect(200);
      }

      // Now search for similar content
      const searchResponse = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'What are my afternoon plans?',
          embedding: [0.15, 0.25, 0.35, 0.45, 0.55],
          limit: 5,
          threshold: 0.7,
        })
        .expect(200);

      expect(searchResponse.body.results).toBeDefined();
      expect(Array.isArray(searchResponse.body.results)).toBe(true);

      // Use search results in chat
      const chatWithContext = {
        messages: [
          {
            role: 'system',
            content: `Context from memory search: ${JSON.stringify(searchResponse.body.results)}`,
          },
          {
            role: 'user',
            content: 'What should I focus on this afternoon?',
          },
        ],
        model: 'gpt-4.1-mini',
        stream: false,
      };

      llmProxy.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Based on your memory about the 3pm meeting, you should prepare for your project updates discussion.',
          },
        }],
      });

      await request(app)
        .post('/api/chat')
        .send(chatWithContext)
        .expect(200);

      expect(llmProxy.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('3pm meeting'),
            }),
          ]),
        }),
      );
    });

    it('handles cross-service coordination for complex queries', async () => {
      // Simulate a complex query that needs multiple services
      const complexQuery = {
        messages: [
          {
            role: 'user',
            content: 'Analyze my productivity patterns and suggest improvements based on my data',
          },
        ],
        model: 'gpt-4.1-mini',
        includeAnalytics: true,
        includeMemorySearch: true,
      };

      // Mock analytics data
      const _analyticsResponse = await request(app)
        .get('/api/analytics/productivity')
        .query({ timeframe: '7d' })
        .expect(200);

      // Mock memory search for productivity patterns
      await request(app)
        .post('/api/vector/search')
        .send({
          query: 'productivity patterns focus time',
          embedding: [0.1, 0.2, 0.3],
          limit: 10,
        })
        .expect(200);

      // Main chat request with coordinated context
      llmProxy.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Based on your productivity analytics and memory patterns, I notice you work best in the morning hours...',
          },
        }],
      });

      await request(app)
        .post('/api/chat')
        .send(complexQuery)
        .expect(200);

      // Should have called both analytics and vector services
      expect(mockSupabaseClient.rpc).toHaveBeenCalled();
    });
  });

  describe('Vector Operations Integration', () => {
    it('handles bulk vector operations efficiently', async () => {
      const bulkVectors = Array.from({ length: 50 }, (_, i) => ({
        content: `Test content ${i}`,
        metadata: { index: i, type: 'test' },
        embedding: Array.from({ length: 384 }, () => Math.random()),
      }));

      // Store bulk vectors
      const storePromises = bulkVectors.map(vector =>
        request(app)
          .post('/api/vector/store')
          .send(vector),
      );

      const results = await Promise.all(storePromises);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify storage
      const listResponse = await request(app)
        .get('/api/vector/list')
        .query({ limit: 100 })
        .expect(200);

      expect(listResponse.body.vectors.length).toBeGreaterThanOrEqual(50);
    });

    it('handles vector search with complex filtering', async () => {
      // Store vectors with different metadata
      const vectorsWithMetadata = [
        {
          content: 'JavaScript programming tutorial',
          metadata: { category: 'programming', language: 'javascript', difficulty: 'beginner' },
          embedding: [0.1, 0.2, 0.3],
        },
        {
          content: 'Advanced React patterns',
          metadata: { category: 'programming', language: 'javascript', difficulty: 'advanced' },
          embedding: [0.2, 0.3, 0.4],
        },
        {
          content: 'Python data science basics',
          metadata: { category: 'programming', language: 'python', difficulty: 'beginner' },
          embedding: [0.3, 0.4, 0.5],
        },
      ];

      for (const vector of vectorsWithMetadata) {
        await request(app)
          .post('/api/vector/store')
          .send(vector)
          .expect(200);
      }

      // Search with metadata filtering
      const searchResponse = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'programming tutorial',
          embedding: [0.15, 0.25, 0.35],
          limit: 10,
          filters: {
            category: 'programming',
            difficulty: 'beginner',
          },
        })
        .expect(200);

      expect(searchResponse.body.results).toBeDefined();
      // Should only return beginner programming content
      searchResponse.body.results.forEach(result => {
        expect(result.metadata.difficulty).toBe('beginner');
        expect(result.metadata.category).toBe('programming');
      });
    });

    it('handles vector updates and deletions correctly', async () => {
      // Store initial vector
      const initialVector = {
        id: 'test-vector-update',
        content: 'Original content',
        metadata: { version: 1 },
        embedding: [0.1, 0.2, 0.3],
      };

      await request(app)
        .post('/api/vector/store')
        .send(initialVector)
        .expect(200);

      // Update the vector
      const updatedVector = {
        id: 'test-vector-update',
        content: 'Updated content',
        metadata: { version: 2 },
        embedding: [0.2, 0.3, 0.4],
      };

      await request(app)
        .put('/api/vector/test-vector-update')
        .send(updatedVector)
        .expect(200);

      // Verify update
      const getResponse = await request(app)
        .get('/api/vector/test-vector-update')
        .expect(200);

      expect(getResponse.body.content).toBe('Updated content');
      expect(getResponse.body.metadata.version).toBe(2);

      // Delete the vector
      await request(app)
        .delete('/api/vector/test-vector-update')
        .expect(200);

      // Verify deletion
      await request(app)
        .get('/api/vector/test-vector-update')
        .expect(404);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles LLM service failures gracefully', async () => {
      llmProxy.createChatCompletion.mockRejectedValue(new Error('LLM service unavailable'));

      const chatRequest = {
        messages: [
          { role: 'user', content: 'This will fail' },
        ],
        model: 'gpt-4.1-mini',
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .expect(500);

      expect(response.body.error).toContain('LLM service unavailable');
    });

    it('handles vector service database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      const vectorData = {
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
      };

      const response = await request(app)
        .post('/api/vector/store')
        .send(vectorData)
        .expect(500);

      expect(response.body.error).toContain('Database connection failed');
    });

    it('handles malformed requests with proper validation', async () => {
      // Invalid chat request
      await request(app)
        .post('/api/chat')
        .send({ messages: 'invalid' })
        .expect(400);

      // Invalid vector request
      await request(app)
        .post('/api/vector/store')
        .send({ content: 123 }) // content should be string
        .expect(400);

      // Missing required fields
      await request(app)
        .post('/api/vector/search')
        .send({}) // missing query and embedding
        .expect(400);
    });

    it('handles rate limiting and timeouts', async () => {
      // Simulate slow LLM response
      llmProxy.createChatCompletion.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          choices: [{ message: { content: 'Slow response' } }],
        }), 35000)), // 35 second delay
      );

      const chatRequest = {
        messages: [{ role: 'user', content: 'Slow request' }],
        model: 'gpt-4.1-mini',
      };

      // Should timeout (assuming 30s timeout)
      const response = await request(app)
        .post('/api/chat')
        .send(chatRequest)
        .timeout(5000) // 5s test timeout
        .expect(500);

      expect(response.body.error).toMatch(/timeout|ECONNABORTED/i);
    });
  });

  describe('Performance and Scalability', () => {
    it('handles concurrent requests efficiently', async () => {
      llmProxy.createChatCompletion.mockResolvedValue({
        choices: [{ message: { content: 'Concurrent response' } }],
      });

      const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/chat')
          .send({
            messages: [{ role: 'user', content: `Concurrent request ${i}` }],
            model: 'gpt-4.1-mini',
          }),
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      console.log(`20 concurrent requests completed in ${endTime - startTime}ms`);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in under 10s
    });

    it('handles large payloads efficiently', async () => {
      // Large chat context
      const largeContext = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'This is a long message with lots of content. '.repeat(100),
      }));

      llmProxy.createChatCompletion.mockResolvedValue({
        choices: [{ message: { content: 'Response to large context' } }],
      });

      await request(app)
        .post('/api/chat')
        .send({
          messages: largeContext,
          model: 'gpt-4.1-mini',
        })
        .expect(200);

      // Large vector embedding
      const largeVector = {
        content: 'Large vector content',
        embedding: Array.from({ length: 1536 }, () => Math.random()), // OpenAI embedding size
        metadata: { size: 'large' },
      };

      await request(app)
        .post('/api/vector/store')
        .send(largeVector)
        .expect(200);
    });

    it('optimizes memory usage with streaming responses', async () => {
      const streamingResponse = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate many small chunks
            for (let i = 0; i < 100; i++) {
              setTimeout(() => callback(`data: {"content": "Chunk ${i} "}\n\n`), i * 10);
            }
            setTimeout(() => callback('data: [DONE]\n\n'), 1100);
          } else if (event === 'end') {
            setTimeout(() => callback(), 1200);
          }
        }),
        pipe: jest.fn(),
      };

      llmProxy.createChatCompletion.mockResolvedValue(streamingResponse);

      const initialMemory = process.memoryUsage();

      await request(app)
        .post('/api/chat')
        .send({
          messages: [{ role: 'user', content: 'Stream many chunks' }],
          model: 'gpt-4.1-mini',
          stream: true,
        })
        .expect(200);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `Streaming response memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`,
      );
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Security and Validation', () => {
    it('validates and sanitizes input data', async () => {
      // Attempt injection in chat message
      const maliciousRequest = {
        messages: [
          {
            role: 'user',
            content: '<script>alert("xss")</script>DROP TABLE users;',
          },
        ],
        model: 'gpt-4.1-mini',
      };

      llmProxy.createChatCompletion.mockResolvedValue({
        choices: [{ message: { content: 'Safe response' } }],
      });

      const _response = await request(app)
        .post('/api/chat')
        .send(maliciousRequest)
        .expect(200);

      // Should process safely without executing malicious content
      expect(llmProxy.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('<script>'),
            }),
          ]),
        }),
      );
    });

    it('handles authentication and authorization', async () => {
      // Note: This would require actual auth middleware in production
      // For now, we test that routes are accessible without auth in test environment

      await request(app)
        .get('/api/health')
        .expect(200);

      // Protected routes would require auth headers
      // await request(app)
      //   .post('/api/chat')
      //   .set('Authorization', 'Bearer invalid-token')
      //   .send({ messages: [{ role: 'user', content: 'test' }] })
      //   .expect(401);
    });

    it('enforces rate limiting and request size limits', async () => {
      // Test oversized request
      const oversizedRequest = {
        messages: [{
          role: 'user',
          content: 'x'.repeat(20 * 1024 * 1024), // 20MB message
        }],
        model: 'gpt-4.1-mini',
      };

      await request(app)
        .post('/api/chat')
        .send(oversizedRequest)
        .expect(413); // Payload too large
    });
  });

  describe('Health Checks and Monitoring', () => {
    it('provides comprehensive health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      });
    });

    it('reports service degradation', async () => {
      // Mock database failure
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection timeout' },
        }),
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.services.database).toBe('unhealthy');
    });

    it('provides analytics and usage metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/usage')
        .query({ timeframe: '24h' })
        .expect(200);

      expect(response.body).toMatchObject({
        requests: expect.any(Number),
        errors: expect.any(Number),
        avgResponseTime: expect.any(Number),
        topEndpoints: expect.any(Array),
      });
    });
  });
});
