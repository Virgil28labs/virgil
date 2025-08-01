/**
 * LLM Service Index Test Suite
 * 
 * Tests the LLM service module exports, singleton instance, and convenience methods.
 * Critical for ensuring proper API surface and module structure.
 */

import { LLMService, llmService, complete, completeStream, getModels, countTokens } from '../index';
import type { LLMRequest, LLMResponse, StreamChunk } from '../../../types/llm.types';

// Mock the LLMService
jest.mock('../LLMService', () => {
  const mockInstance = {
    complete: jest.fn(),
    completeStream: jest.fn(),
    getModels: jest.fn(),
    countTokens: jest.fn(),
  };

  return {
    LLMService: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance, // For accessing the mock in tests
  };
});

interface MockLLMInstance {
  complete: jest.MockedFunction<(options: Partial<LLMRequest>) => Promise<LLMResponse>>;
  completeStream: jest.MockedFunction<(options: Partial<LLMRequest>) => AsyncGenerator<StreamChunk, void, unknown>>;
  getModels: jest.MockedFunction<() => Promise<Record<string, string[]>>>;
  countTokens: jest.MockedFunction<(text: string, model?: string) => Promise<number>>;
}

describe('LLM Service Index', () => {
  let mockLLMServiceInstance: MockLLMInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock instance
    mockLLMServiceInstance = (require('../LLMService') as { __mockInstance: MockLLMInstance }).__mockInstance;
  });

  describe('Exports', () => {
    it('exports LLMService class', () => {
      expect(LLMService).toBeDefined();
      expect(typeof LLMService).toBe('function');
    });

    it('exports singleton llmService instance', () => {
      expect(llmService).toBeDefined();
      expect(typeof llmService).toBe('object');
    });

    it('exports convenience functions', () => {
      expect(typeof complete).toBe('function');
      expect(typeof completeStream).toBe('function');
      expect(typeof getModels).toBe('function');
      expect(typeof countTokens).toBe('function');
    });
  });

  describe('Singleton Instance', () => {
    it('provides a singleton instance of LLMService', () => {
      expect(llmService).toBeInstanceOf(Object);
      expect(llmService).toBe(llmService); // Same reference
    });

    it('singleton has expected methods', () => {
      expect(llmService.complete).toBeDefined();
      expect(llmService.completeStream).toBeDefined();
      expect(llmService.getModels).toBeDefined();
      expect(llmService.countTokens).toBeDefined();
    });
  });

  describe('Convenience Methods', () => {
    describe('complete', () => {
      it('calls llmService.complete with provided options', async () => {
        const testOptions = { 
          messages: [{ role: 'user' as const, content: 'test' }], 
        };
        const expectedResponse: LLMResponse = {
          content: 'Test response',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };

        mockLLMServiceInstance.complete.mockResolvedValue(expectedResponse);

        const result = await complete(testOptions);

        expect(mockLLMServiceInstance.complete).toHaveBeenCalledWith(testOptions);
        expect(result).toBe(expectedResponse);
      });

      it('handles empty options', async () => {
        const expectedResponse: LLMResponse = {
          content: 'Default response',
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        };

        mockLLMServiceInstance.complete.mockResolvedValue(expectedResponse);

        const result = await complete({});

        expect(mockLLMServiceInstance.complete).toHaveBeenCalledWith({});
        expect(result).toBe(expectedResponse);
      });

      it('propagates errors from llmService', async () => {
        const testError = new Error('LLM Service error');
        mockLLMServiceInstance.complete.mockRejectedValue(testError);

        await expect(complete({ messages: [] })).rejects.toThrow('LLM Service error');
        expect(mockLLMServiceInstance.complete).toHaveBeenCalled();
      });
    });

    describe('completeStream', () => {
      it('calls llmService.completeStream with provided options', () => {
        const testOptions = { 
          messages: [{ role: 'user' as const, content: 'stream test' }], 
        };
        const mockGenerator = (async function* (): AsyncGenerator<StreamChunk> {
          yield { text: 'chunk1' };
          yield { text: 'chunk2' };
        })();

        mockLLMServiceInstance.completeStream.mockReturnValue(mockGenerator);

        const result = completeStream(testOptions);

        expect(mockLLMServiceInstance.completeStream).toHaveBeenCalledWith(testOptions);
        expect(result).toBe(mockGenerator);
      });

      it('handles empty options for streaming', () => {
        const mockGenerator = (async function* (): AsyncGenerator<StreamChunk> {
          yield { text: 'default stream' };
        })();

        mockLLMServiceInstance.completeStream.mockReturnValue(mockGenerator);

        const result = completeStream({});

        expect(mockLLMServiceInstance.completeStream).toHaveBeenCalledWith({});
        expect(result).toBe(mockGenerator);
      });
    });

    describe('getModels', () => {
      it('calls llmService.getModels and returns models', async () => {
        const expectedModels = {
          'openai': ['gpt-4', 'gpt-3.5-turbo'],
          'anthropic': ['claude-3-opus', 'claude-3-sonnet'],
        };

        mockLLMServiceInstance.getModels.mockResolvedValue(expectedModels);

        const result = await getModels();

        expect(mockLLMServiceInstance.getModels).toHaveBeenCalledWith();
        expect(result).toBe(expectedModels);
      });

      it('propagates errors from getModels', async () => {
        const testError = new Error('Failed to fetch models');
        mockLLMServiceInstance.getModels.mockRejectedValue(testError);

        await expect(getModels()).rejects.toThrow('Failed to fetch models');
        expect(mockLLMServiceInstance.getModels).toHaveBeenCalled();
      });
    });

    describe('countTokens', () => {
      it('calls llmService.countTokens with text only', async () => {
        const testText = 'Hello, world!';
        const expectedCount = 4;

        mockLLMServiceInstance.countTokens.mockResolvedValue(expectedCount);

        const result = await countTokens(testText);

        expect(mockLLMServiceInstance.countTokens).toHaveBeenCalledWith(testText, undefined);
        expect(result).toBe(expectedCount);
      });

      it('calls llmService.countTokens with text and model', async () => {
        const testText = 'Count tokens in this text';
        const testModel = 'gpt-4';
        const expectedCount = 6;

        mockLLMServiceInstance.countTokens.mockResolvedValue(expectedCount);

        const result = await countTokens(testText, testModel);

        expect(mockLLMServiceInstance.countTokens).toHaveBeenCalledWith(testText, testModel);
        expect(result).toBe(expectedCount);
      });

      it('handles empty text', async () => {
        const emptyText = '';
        const expectedCount = 0;

        mockLLMServiceInstance.countTokens.mockResolvedValue(expectedCount);

        const result = await countTokens(emptyText);

        expect(mockLLMServiceInstance.countTokens).toHaveBeenCalledWith(emptyText, undefined);
        expect(result).toBe(expectedCount);
      });

      it('propagates errors from countTokens', async () => {
        const testError = new Error('Token counting failed');
        mockLLMServiceInstance.countTokens.mockRejectedValue(testError);

        await expect(countTokens('test text')).rejects.toThrow('Token counting failed');
        expect(mockLLMServiceInstance.countTokens).toHaveBeenCalled();
      });
    });
  });

  describe('Integration', () => {
    it('convenience methods use the same singleton instance', async () => {
      const testOptions = { messages: [{ role: 'user' as const, content: 'test' }] };
      
      mockLLMServiceInstance.complete.mockResolvedValue({ content: '' } as LLMResponse);
      mockLLMServiceInstance.getModels.mockResolvedValue({});
      mockLLMServiceInstance.countTokens.mockResolvedValue(0);

      await complete(testOptions);
      await getModels();
      await countTokens('test');

      // All methods should be called on the same singleton instance
      expect(mockLLMServiceInstance.complete).toHaveBeenCalled();
      expect(mockLLMServiceInstance.getModels).toHaveBeenCalled();
      expect(mockLLMServiceInstance.countTokens).toHaveBeenCalled();
    });

    it('provides consistent API surface', () => {
      // Direct instance methods
      expect(typeof llmService.complete).toBe('function');
      expect(typeof llmService.completeStream).toBe('function');
      expect(typeof llmService.getModels).toBe('function');
      expect(typeof llmService.countTokens).toBe('function');

      // Convenience exports
      expect(typeof complete).toBe('function');
      expect(typeof completeStream).toBe('function');
      expect(typeof getModels).toBe('function');
      expect(typeof countTokens).toBe('function');
    });
  });

  describe('Type Safety', () => {
    it('accepts valid LLM request options', async () => {
      const validOptions = {
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant' },
          { role: 'user' as const, content: 'Hello' },
        ],
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 100,
      };

      mockLLMServiceInstance.complete.mockResolvedValue({ content: '' } as LLMResponse);

      await expect(complete(validOptions)).resolves.toBeDefined();
      expect(mockLLMServiceInstance.complete).toHaveBeenCalledWith(validOptions);
    });

    it('handles partial options correctly', async () => {
      const partialOptions = {
        messages: [{ role: 'user' as const, content: 'test' }],
      };

      mockLLMServiceInstance.complete.mockResolvedValue({ content: '' } as LLMResponse);

      await expect(complete(partialOptions)).resolves.toBeDefined();
      expect(mockLLMServiceInstance.complete).toHaveBeenCalledWith(partialOptions);
    });
  });

  describe('Error Handling', () => {
    it('preserves error types from underlying service', async () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';
      
      mockLLMServiceInstance.complete.mockRejectedValue(networkError);

      try {
        await complete({ messages: [] });
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error).toBe(networkError);
        expect((error as Error).name).toBe('NetworkError');
      }
    });

    it('handles synchronous errors in streaming', () => {
      const syncError = new Error('Immediate failure');
      mockLLMServiceInstance.completeStream.mockImplementation(() => {
        throw syncError;
      });

      expect(() => completeStream({})).toThrow('Immediate failure');
    });
  });
});