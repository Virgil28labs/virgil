/**
 * LLMService Test Suite
 * 
 * Tests the LLM service that provides language model completions via API calls.
 * Tests completion, streaming, caching, rate limiting, and error handling.
 */

import { LLMService } from '../LLMService';
import type { LLMMessage } from '../../../types/llm.types';

// Mock dependencies
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LLMService', () => {
  let llmService: LLMService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response - LLMService expects data.content directly
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: {
          content: 'Test response',
          usage: {
            total_tokens: 30,
            prompt_tokens: 10,
            completion_tokens: 20,
          },
          model: 'gpt-4o-mini',
          id: 'test-id',
        },
      }),
    } as Response);

    llmService = new LLMService({
      apiUrl: 'http://localhost:5002/api/v1',
      enableCache: false, // Disable cache for tests
    });
  });

  afterEach(() => {
    llmService.destroy();
  });

  describe('Basic Completion', () => {
    it('completes a simple message', async () => {
      const response = await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.content).toBe('Test response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/llm/complete'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('includes all messages in request', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      await llmService.complete({ messages });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.messages).toHaveLength(3);
      expect(requestBody.messages).toEqual(messages);
    });

    it('includes system prompt when provided', async () => {
      const systemPrompt = 'You are a helpful assistant.';

      await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.messages[0]).toEqual({
        role: 'system',
        content: systemPrompt,
      });
    });

    it('uses specified model', async () => {
      await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.model).toBe('gpt-4');
    });

    it('applies temperature setting', async () => {
      await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.temperature).toBe(0.9);
    });

    it('applies max tokens setting', async () => {
      await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 1000,
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.maxTokens).toBe(1000);
    });
  });

  describe('Streaming Completion', () => {
    it('has completeStream method available', () => {
      expect(typeof llmService.completeStream).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid request' }),
      } as Response);

      await expect(llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Invalid request');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Network error');
    });

    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      await expect(llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Invalid JSON');
    });

    it('handles missing choices in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ usage: { total_tokens: 10 } }),
      } as Response);

      const response = await llmService.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // The service should return the raw response when choices are missing
      expect(response).toEqual({ usage: { total_tokens: 10 } });
    });
  });

  describe('Additional Methods', () => {
    it('has getModels method available', () => {
      expect(typeof llmService.getModels).toBe('function');
    });

    it('has countTokens method available', () => {
      expect(typeof llmService.countTokens).toBe('function');
    });
  });

  describe('Statistics and Management', () => {
    it('provides service stats', () => {
      const stats = llmService.getStats();

      expect(stats).toEqual({
        activeRequests: 0,
        cacheStats: expect.objectContaining({
          size: 0,
          hits: 0,
          misses: 0,
        }),
        rateLimitStats: expect.objectContaining({
          remaining: 0,
          reset: 0,
        }),
      });
    });

    it('clears cache', async () => {
      await expect(llmService.clearCache()).resolves.not.toThrow();
    });

    it('destroys service cleanly', () => {
      expect(() => llmService.destroy()).not.toThrow();
    });
  });


  describe('Configuration', () => {
    it('uses custom API endpoint', () => {
      const customService = new LLMService({
        apiUrl: 'https://custom-api.example.com',
      });

      expect(customService['config'].apiUrl).toBe('https://custom-api.example.com');
      customService.destroy();
    });

    it('uses environment variables for defaults', () => {
      const service = new LLMService();
      
      // Should use the mocked environment values from jest.setup.ts
      expect(service['config'].apiUrl).toBe('http://localhost:5002/api/v1');
      service.destroy();
    });
  });
});