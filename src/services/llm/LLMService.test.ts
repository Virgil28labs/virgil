import { LLMService } from './LLMService';
import { ResponseCache } from './utils/cache';
import { RateLimiter } from './utils/rateLimit';
import { EventEmitter } from './utils/eventEmitter';

// Mock dependencies
jest.mock('./utils/cache');
jest.mock('./utils/rateLimit');
jest.mock('./utils/eventEmitter');

// Mock fetch
global.fetch = jest.fn();

const mockCache = ResponseCache as jest.MockedClass<typeof ResponseCache>;
const mockRateLimiter = RateLimiter as jest.MockedClass<typeof RateLimiter>;
const mockEventEmitter = EventEmitter as jest.MockedClass<typeof EventEmitter>;

describe('LLMService', () => {
  let service: LLMService;
  let mockCacheInstance: any;
  let mockRateLimiterInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock instances
    mockCacheInstance = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
      getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0 })
    };
    
    mockRateLimiterInstance = {
      checkLimit: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({ requests: 0, remaining: 20 })
    };
    
    mockCache.mockImplementation(() => mockCacheInstance);
    mockRateLimiter.mockImplementation(() => mockRateLimiterInstance);
    
    // Mock EventEmitter methods
    EventEmitter.prototype.emit = jest.fn();
    EventEmitter.prototype.removeAllListeners = jest.fn();
    
    service = new LLMService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('constructor', () => {
    it('initializes with default config', () => {
      expect(mockCache).toHaveBeenCalledWith({ ttl: 3600 });
      expect(mockRateLimiter).toHaveBeenCalledWith({ maxRequests: 20, windowMs: 60000 });
    });

    it('accepts custom config', () => {
      const customConfig = {
        apiUrl: 'https://custom.api.com',
        defaultModel: 'gpt-4',
        cacheTTL: 7200
      };
      
      const customService = new LLMService(customConfig);
      
      expect(mockCache).toHaveBeenCalledWith({ ttl: 7200 });
      customService.destroy();
    });
  });

  describe('complete', () => {
    const mockResponse = {
      choices: [{ message: { content: 'Test response' } }],
      usage: { total_tokens: 100 }
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResponse })
      });
    });

    it('makes a successful completion request', async () => {
      const options = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      };
      
      const result = await service.complete(options);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/llm/complete',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: options.messages,
            model: options.model,
            temperature: options.temperature,
            maxTokens: 256,
            context: {},
            provider: 'openai'
          })
        })
      );
      
      expect(result).toEqual(mockResponse);
      expect(service.emit).toHaveBeenCalledWith('request-start', expect.any(Object));
      expect(service.emit).toHaveBeenCalledWith('request-complete', expect.any(Object));
    });

    it('checks rate limit before making request', async () => {
      mockRateLimiterInstance.checkLimit.mockReturnValue(false);
      
      await expect(service.complete({ messages: [] })).rejects.toThrow('Rate limit exceeded');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('uses cache when enabled and cache key provided', async () => {
      const cachedResponse = { cached: true };
      mockCacheInstance.get.mockResolvedValue(cachedResponse);
      
      const result = await service.complete({
        messages: [],
        cacheKey: 'test-key'
      });
      
      expect(mockCacheInstance.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(cachedResponse);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(service.emit).toHaveBeenCalledWith('cache-hit', { cacheKey: 'test-key' });
    });

    it('caches successful responses', async () => {
      mockCacheInstance.get.mockResolvedValue(null);
      
      await service.complete({
        messages: [],
        cacheKey: 'test-key'
      });
      
      expect(mockCacheInstance.set).toHaveBeenCalledWith('test-key', mockResponse);
    });

    it('prepends system prompt when provided', async () => {
      await service.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are a helpful assistant'
      });
      
      const expectedMessages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ];
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(JSON.stringify(expectedMessages))
        })
      );
    });

    it('handles request errors', async () => {
      const error = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(error);
      
      await expect(service.complete({ messages: [] })).rejects.toThrow('Network error');
      expect(service.emit).toHaveBeenCalledWith('request-error', expect.any(Object));
    });

    it('retries on retryable errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockResponse })
        });
      
      const result = await service.complete({ messages: [] });
      
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(service.emit).toHaveBeenCalledWith('retry', expect.any(Object));
    });

    it('handles streaming requests', async () => {
      const streamResponse = { body: { getReader: jest.fn() } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        ...streamResponse
      });
      
      const result = await service.complete({
        messages: [],
        stream: true
      });
      
      expect(result).toEqual({ ok: true, ...streamResponse });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/llm/stream',
        expect.any(Object)
      );
    });
  });

  describe('completeStream', () => {
    it('yields parsed stream data', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"content":"Hello"}\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"content":" world"}\n')
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n')
          })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      });
      
      const results = [];
      for await (const chunk of service.completeStream({ messages: [] })) {
        results.push(chunk);
      }
      
      expect(results).toEqual([
        { content: 'Hello' },
        { content: ' world' }
      ]);
    });

    it('handles stream errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Stream error'));
      
      const generator = service.completeStream({ messages: [] });
      
      await expect(generator.next()).rejects.toThrow('Stream error');
      expect(service.emit).toHaveBeenCalledWith('stream-error', { error: 'Stream error' });
    });
  });

  describe('getModels', () => {
    it('fetches available models', async () => {
      const mockModels = {
        openai: ['gpt-3.5-turbo', 'gpt-4'],
        anthropic: ['claude-3']
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels })
      });
      
      const result = await service.getModels();
      
      expect(result).toEqual(mockModels);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:5002/api/v1/llm/models');
    });

    it('returns empty object on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));
      
      const result = await service.getModels();
      
      expect(result).toEqual({});
      expect(service.emit).toHaveBeenCalledWith('error', { error: 'Fetch error' });
    });
  });

  describe('countTokens', () => {
    it('counts tokens via API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { tokenCount: 42 } })
      });
      
      const result = await service.countTokens('Test text');
      
      expect(result).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/llm/tokenize',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Test text', model: 'gpt-4o-mini' })
        })
      );
    });

    it('falls back to estimation on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API error'));
      
      const result = await service.countTokens('Test text for token estimation');
      
      // Fallback estimation: text.length / 4
      expect(result).toBe(Math.ceil('Test text for token estimation'.length / 4));
    });
  });

  describe('getStats', () => {
    it('returns service statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toEqual({
        activeRequests: 0,
        cacheStats: { hits: 0, misses: 0 },
        rateLimitStats: { requests: 0, remaining: 20 }
      });
    });
  });

  describe('clearCache', () => {
    it('clears the cache', async () => {
      await service.clearCache();
      
      expect(mockCacheInstance.clear).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      service.destroy();
      
      expect(mockCacheInstance.destroy).toHaveBeenCalled();
      expect(service.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles non-JSON error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });
      
      await expect(service.complete({ messages: [] }))
        .rejects.toThrow('Unknown error');
    });

    it('handles rate limit errors as retryable', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { success: true } })
        });
      
      const result = await service.complete({ messages: [] });
      
      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('stops retrying after max attempts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));
      
      await expect(service.complete({ messages: [] }))
        .rejects.toThrow('network error');
      
      expect(global.fetch).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });
});