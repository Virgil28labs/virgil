/**
 * Vector Route Integration Tests
 *
 * Tests the vector memory API endpoints including:
 * - Health check endpoint
 * - Memory count endpoint
 * - Storing text with embeddings
 * - Searching for similar content
 * - Authentication middleware
 * - Rate limiting
 * - OpenAI embedding integration
 * - Supabase vector storage
 * - User isolation
 * - Error handling
 */

const request = require('supertest');
const express = require('express');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const _vectorRouter = require('../vector');
const logger = require('../../lib/logger');

// Mock dependencies
jest.mock('openai');
jest.mock('@supabase/supabase-js');
jest.mock('../../lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock the auth middleware
jest.mock('../../middleware/supabaseAuth', () => (req, res, next) => {
  // Add userId for authenticated routes
  req.userId = req.headers.authorization === 'Bearer valid-token' ? 'test-user-id' : null;

  if (req.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

describe('Vector Routes', () => {
  let app;
  let mockOpenAI;
  let mockSupabase;
  let mockEmbeddings;
  let mockFrom;
  let mockRpc;
  let mockSelect;
  let mockInsert;
  let mockSingle;

  beforeEach(() => {
    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Setup mocks
    mockSingle = jest.fn().mockReturnThis();
    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
    mockRpc = jest.fn();

    mockSupabase = {
      from: mockFrom,
      rpc: mockRpc,
    };

    createClient.mockReturnValue(mockSupabase);

    mockEmbeddings = {
      create: jest.fn(),
    };

    mockOpenAI = {
      embeddings: mockEmbeddings,
    };

    OpenAI.mockImplementation(() => mockOpenAI);

    // Clear require cache and re-require router to pick up mocks
    jest.resetModules();
    const vectorRouter = require('../vector');
    app.use('/api/v1/vector', vectorRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Default successful responses
    mockSelect.mockResolvedValue({ data: null, error: null });
    mockEmbeddings.create.mockResolvedValue({
      data: [{
        embedding: new Array(1536).fill(0.1), // Mock embedding
      }],
    });
  });

  describe('GET /api/v1/vector/health', () => {
    it('should return healthy when database is accessible', async () => {
      mockSelect.mockResolvedValueOnce({ error: null });

      const response = await request(app)
        .get('/api/v1/vector/health')
        .expect(200);

      expect(response.body).toEqual({
        healthy: true,
        message: 'Vector service is operational',
      });

      expect(mockFrom).toHaveBeenCalledWith('memory_vectors');
      expect(mockSelect).toHaveBeenCalledWith('count');
    });

    it('should return unhealthy when database has errors', async () => {
      mockSelect.mockResolvedValueOnce({
        error: { message: 'Database connection failed' },
      });

      const response = await request(app)
        .get('/api/v1/vector/health')
        .expect(503);

      expect(response.body).toEqual({
        healthy: false,
        error: 'Database connection failed',
      });
    });

    it('should handle unexpected errors', async () => {
      mockSelect.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .get('/api/v1/vector/health')
        .expect(503);

      expect(response.body).toEqual({
        healthy: false,
        error: 'Service unavailable',
      });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/vector/count', () => {
    it('should return memory count', async () => {
      mockSelect.mockResolvedValueOnce({ count: 42, error: null });

      const response = await request(app)
        .get('/api/v1/vector/count')
        .expect(200);

      expect(response.body).toEqual({ count: 42 });

      expect(mockFrom).toHaveBeenCalledWith('memory_vectors');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('should return 0 when no memories exist', async () => {
      mockSelect.mockResolvedValueOnce({ count: 0, error: null });

      const response = await request(app)
        .get('/api/v1/vector/count')
        .expect(200);

      expect(response.body).toEqual({ count: 0 });
    });

    it('should handle database errors', async () => {
      mockSelect.mockResolvedValueOnce({
        error: { message: 'Query failed' },
      });

      const response = await request(app)
        .get('/api/v1/vector/count')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get memory count',
      });
    });

    it('should handle null count', async () => {
      mockSelect.mockResolvedValueOnce({ count: null, error: null });

      const response = await request(app)
        .get('/api/v1/vector/count')
        .expect(200);

      expect(response.body).toEqual({ count: 0 });
    });
  });

  describe('POST /api/v1/vector/store', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/vector/store')
        .send({ content: 'Test memory' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should store memory with embedding', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'memory-123' },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Remember this important fact' })
        .expect(200);

      expect(response.body).toEqual({
        id: 'memory-123',
        message: 'Memory stored successfully',
      });

      // Verify OpenAI was called
      expect(mockEmbeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'Remember this important fact',
      });

      // Verify Supabase insert
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        content: 'Remember this important fact',
        embedding: expect.any(String), // JSON stringified embedding
      });
    });

    it('should validate content is provided', async () => {
      const response = await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Content must be a non-empty string',
      });
    });

    it('should validate content is string', async () => {
      const response = await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 123 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Content must be a non-empty string',
      });
    });

    it('should handle OpenAI errors', async () => {
      mockEmbeddings.create.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Test content' })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
      });

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle Supabase errors', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const response = await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Test content' })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to store memory',
      });
    });

    it('should store embedding as JSON string', async () => {
      const mockEmbedding = new Array(1536).fill(0.5);
      mockEmbeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      mockSingle.mockResolvedValueOnce({
        data: { id: 'memory-123' },
        error: null,
      });

      await request(app)
        .post('/api/v1/vector/store')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Test' })
        .expect(200);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        content: 'Test',
        embedding: JSON.stringify(mockEmbedding),
      });
    });
  });

  describe('POST /api/v1/vector/search', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/vector/search')
        .send({ query: 'Find something' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should search for similar content', async () => {
      const mockResults = [
        { id: '1', content: 'Similar memory 1', similarity: 0.95 },
        { id: '2', content: 'Similar memory 2', similarity: 0.85 },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockResults,
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Find similar memories' })
        .expect(200);

      expect(response.body).toEqual({
        results: mockResults,
      });

      // Verify OpenAI was called
      expect(mockEmbeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'Find similar memories',
      });

      // Verify RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('search_user_memories_with_id', {
        p_user_id: 'test-user-id',
        query_embedding: expect.any(Array),
        threshold: 0.3,
        match_count: 10,
      });
    });

    it('should accept custom limit', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Search', limit: 5 })
        .expect(200);

      expect(mockRpc).toHaveBeenCalledWith('search_user_memories_with_id', {
        p_user_id: 'test-user-id',
        query_embedding: expect.any(Array),
        threshold: 0.3,
        match_count: 5,
      });
    });

    it('should validate query is provided', async () => {
      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Query must be a non-empty string',
      });
    });

    it('should validate query is string', async () => {
      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 123 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Query must be a non-empty string',
      });
    });

    it('should handle OpenAI errors', async () => {
      mockEmbeddings.create.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Search query' })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
      });
    });

    it('should handle Supabase RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function error' },
      });

      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Search query' })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to search memories',
      });
    });

    it('should return empty results when no matches', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'No matches' })
        .expect(200);

      expect(response.body).toEqual({
        results: [],
      });
    });

    it('should handle null data from RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/vector/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Search' })
        .expect(200);

      expect(response.body).toEqual({
        results: [],
      });
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 30 requests (the limit)
      for (let i = 0; i < 30; i++) {
        await request(app)
          .get('/api/v1/vector/health')
          .expect(200);
      }

      // 31st request should be rate limited
      const response = await request(app)
        .get('/api/v1/vector/health')
        .expect(429);

      expect(response.body).toMatchObject({
        message: 'Too many vector requests, please try again later.',
      });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/v1/vector/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Environment configuration', () => {
    it('should throw error if OpenAI API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      jest.resetModules();

      expect(() => {
        require('../vector');
      }).toThrow('OpenAI configuration missing');
    });

    it('should throw error if Supabase URL is missing', () => {
      delete process.env.SUPABASE_URL;
      jest.resetModules();

      expect(() => {
        require('../vector');
      }).toThrow('Supabase configuration missing');
    });

    it('should throw error if Supabase key is missing', () => {
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_KEY;
      jest.resetModules();

      expect(() => {
        require('../vector');
      }).toThrow('Supabase configuration missing');
    });
  });
});
