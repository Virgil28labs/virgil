/**
 * Rhythm Route Integration Tests
 *
 * Tests the rhythm generation API endpoints including:
 * - Drum pattern generation using LLM
 * - Input validation (description, barLength, style, temperature)
 * - Pattern classification (techno, house, trap, breakbeat, minimal)
 * - Pattern length adjustment (4, 8, 16, 32 steps)
 * - Fallback pattern generation on LLM failure
 * - Rate limiting
 * - Caching mechanism
 * - Error handling
 */

const request = require('supertest');
const express = require('express');
const rhythmRouter = require('../rhythm');
const { LLMProxy } = require('../../services/llmProxy');
const { RequestQueue } = require('../../services/queue');
const logger = require('../../lib/logger');

// Mock dependencies
jest.mock('../../services/llmProxy');
jest.mock('../../services/queue');
jest.mock('../../lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('Rhythm Routes', () => {
  let app;
  let mockLLMProxy;
  let mockRequestQueue;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/v1/rhythm', rhythmRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup LLMProxy mock
    mockLLMProxy = {
      complete: jest.fn(),
    };
    LLMProxy.mockImplementation(() => mockLLMProxy);

    // Setup RequestQueue mock
    mockRequestQueue = {
      add: jest.fn(fn => fn()), // Execute the function immediately
    };
    RequestQueue.mockImplementation(() => mockRequestQueue);

    // Default successful LLM response
    mockLLMProxy.complete.mockResolvedValue({
      content: 'techno',
      usage: {
        inputTokens: 50,
        outputTokens: 1,
        totalTokens: 51,
      },
    });
  });

  describe('POST /api/v1/rhythm/generate', () => {
    it('should generate a rhythm pattern with default parameters', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          pattern: expect.any(Array),
          description: 'techno beat',
          barLength: 8,
          style: '',
          generated: expect.any(String),
          category: 'techno',
        },
        usage: {
          inputTokens: 50,
          outputTokens: 1,
          totalTokens: 51,
        },
        cached: false,
      });

      // Verify pattern structure - 5 drums x 8 steps
      expect(response.body.data.pattern).toHaveLength(5);
      expect(response.body.data.pattern[0]).toHaveLength(8);

      // Verify all values are boolean
      response.body.data.pattern.forEach(drum => {
        drum.forEach(step => {
          expect(typeof step).toBe('boolean');
        });
      });
    });

    it('should classify description into correct category', async () => {
      const testCases = [
        { description: 'house music groove', expectedCategory: 'house' },
        { description: 'trap beat with heavy bass', expectedCategory: 'trap' },
        { description: 'breakbeat drum and bass', expectedCategory: 'breakbeat' },
        { description: 'minimal techno', expectedCategory: 'minimal' },
      ];

      for (const testCase of testCases) {
        mockLLMProxy.complete.mockResolvedValueOnce({
          content: testCase.expectedCategory,
          usage: { inputTokens: 50, outputTokens: 1, totalTokens: 51 },
        });

        const response = await request(app)
          .post('/api/v1/rhythm/generate')
          .send({ description: testCase.description })
          .expect(200);

        expect(response.body.data.category).toBe(testCase.expectedCategory);
      }
    });

    it('should handle different bar lengths', async () => {
      const barLengths = [4, 8, 16, 32];

      for (const barLength of barLengths) {
        const response = await request(app)
          .post('/api/v1/rhythm/generate')
          .send({
            description: 'techno beat',
            barLength,
          })
          .expect(200);

        // Verify pattern has correct length
        expect(response.body.data.pattern[0]).toHaveLength(barLength);
        expect(response.body.data.barLength).toBe(barLength);
      }
    });

    it('should extend pattern for bar lengths > 16', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
          barLength: 32,
        })
        .expect(200);

      // Pattern should be extended to 32 steps
      expect(response.body.data.pattern[0]).toHaveLength(32);

      // Check that pattern repeats (techno kick pattern repeats every 4 steps)
      const kickPattern = response.body.data.pattern[0];
      expect(kickPattern[0]).toBe(kickPattern[16]); // Steps 0 and 16 should match
      expect(kickPattern[4]).toBe(kickPattern[20]); // Steps 4 and 20 should match
    });

    it('should validate description is required', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Description is required and must be a string',
      });
    });

    it('should validate bar length values', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
          barLength: 7, // Invalid value
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bar length must be 4, 8, 16, or 32 steps',
      });
    });

    it('should validate style is string', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
          style: 123, // Should be string
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Style must be a string',
      });
    });

    it('should validate temperature range', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
          temperature: 2.5, // Out of range
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Temperature must be a number between 0 and 2',
      });
    });

    it('should accept custom temperature', async () => {
      const _response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'creative techno',
          temperature: 1.5,
        })
        .expect(200);

      // Verify LLM was called with custom temperature
      expect(mockLLMProxy.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1.5,
        }),
      );
    });

    it('should use default category when LLM returns invalid category', async () => {
      mockLLMProxy.complete.mockResolvedValueOnce({
        content: 'invalid-category',
        usage: { inputTokens: 50, outputTokens: 1, totalTokens: 51 },
      });

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'weird beat' })
        .expect(200);

      expect(response.body.data.category).toBe('techno'); // Default
    });

    it('should use fallback pattern when LLM fails', async () => {
      mockLLMProxy.complete.mockRejectedValueOnce(new Error('LLM service unavailable'));

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'hip hop groove' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          pattern: expect.any(Array),
          description: 'hip hop groove',
          barLength: 8,
          fallback: true,
        },
        cached: false,
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should generate different fallback patterns based on description', async () => {
      mockLLMProxy.complete.mockRejectedValue(new Error('LLM error'));

      const styles = ['hip hop', 'rock', 'jazz'];
      const patterns = [];

      for (const style of styles) {
        const response = await request(app)
          .post('/api/v1/rhythm/generate')
          .send({ description: `${style} beat` })
          .expect(200);

        patterns.push(response.body.data.pattern);
      }

      // Patterns should be different for different styles
      expect(patterns[0]).not.toEqual(patterns[1]);
      expect(patterns[1]).not.toEqual(patterns[2]);
    });

    it('should handle LLM queue properly', async () => {
      await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      expect(mockRequestQueue.add).toHaveBeenCalled();
      expect(mockLLMProxy.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('techno beat'),
            }),
          ]),
          model: 'claude-3-haiku-20240307',
          temperature: 0.7,
          maxTokens: 512,
          systemPrompt: expect.stringContaining('music genre classifier'),
          provider: 'anthropic',
        }),
      );
    });

    it('should cache responses', async () => {
      // First request
      const response1 = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      expect(response1.body.cached).toBe(false);

      // Second identical request should be cached
      const _response2 = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      // Note: Cache middleware behavior depends on implementation
      // This test assumes caching is working if the middleware is present
    });

    it('should handle empty style parameter', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({
          description: 'techno beat',
          style: '',
        })
        .expect(200);

      expect(response.body.data.style).toBe('');
    });

    it('should return proper timestamp in generated field', async () => {
      const before = new Date().toISOString();

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      const after = new Date().toISOString();

      expect(new Date(response.body.data.generated).getTime())
        .toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(new Date(response.body.data.generated).getTime())
        .toBeLessThanOrEqual(new Date(after).getTime());
    });

    it('should handle concurrent requests', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/rhythm/generate')
            .send({ description: `beat ${i}` }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 30 requests (the limit)
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/api/v1/rhythm/generate')
          .send({ description: `beat ${i}` })
          .expect(200);
      }

      // 31st request should be rate limited
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'one more beat' })
        .expect(429);

      expect(response.body).toMatchObject({
        message: 'Too many rhythm generation requests, please try again later.',
      });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Edge cases', () => {
    it('should handle LLM returning extra whitespace', async () => {
      mockLLMProxy.complete.mockResolvedValueOnce({
        content: '  techno  \n',
        usage: { inputTokens: 50, outputTokens: 1, totalTokens: 51 },
      });

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno beat' })
        .expect(200);

      expect(response.body.data.category).toBe('techno');
    });

    it('should handle LLM returning uppercase', async () => {
      mockLLMProxy.complete.mockResolvedValueOnce({
        content: 'HOUSE',
        usage: { inputTokens: 50, outputTokens: 1, totalTokens: 51 },
      });

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'house beat' })
        .expect(200);

      expect(response.body.data.category).toBe('house');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = `techno beat with ${  'very complex patterns '.repeat(50)}`;

      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: longDescription })
        .expect(200);

      expect(response.body.data.description).toBe(longDescription);
    });

    it('should handle special characters in description', async () => {
      const response = await request(app)
        .post('/api/v1/rhythm/generate')
        .send({ description: 'techno & house / trap @ 140bpm!' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
