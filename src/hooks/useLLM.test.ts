import { renderHook, act, waitFor } from '@testing-library/react';
import { useLLM } from './useLLM';
import { llmService } from '../services/llm';
import type { LLMResponse } from '../types/llm.types';

// Mock the llm service
jest.mock('../services/llm', () => ({
  llmService: {
    complete: jest.fn(),
    completeStream: jest.fn()
  }
}));

// Mock data
const mockResponse: LLMResponse = {
  id: 'test-response-id',
  content: 'Test response content',
  model: 'gpt-4',
  usage: {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150
  }
};

const mockStreamChunks = [
  { id: '1', content: 'Hello ', delta: { content: 'Hello ' } },
  { id: '2', content: 'world!', delta: { content: 'world!' } }
];

describe('useLLM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (llmService.complete as jest.Mock).mockResolvedValue(mockResponse);
    (llmService.completeStream as jest.Mock).mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of mockStreamChunks) {
          yield chunk;
        }
      }
    });
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useLLM());
      
      expect(result.current.loading).toBe(false);
      expect(result.current.streaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isReady).toBe(true);
    });

    it('accepts configuration options', () => {
      const config = { model: 'gpt-4', temperature: 0.7 };
      const { result } = renderHook(() => useLLM(config));
      
      // Configuration is internal, but we can verify it's used in requests
      act(async () => {
        await result.current.complete({ messages: [] });
      });
      
      expect(llmService.complete).toHaveBeenCalledWith(
        expect.objectContaining(config)
      );
    });
  });

  describe('Complete Function', () => {
    it('successfully completes a request', async () => {
      const { result } = renderHook(() => useLLM());
      
      let response: LLMResponse | null = null;
      
      await act(async () => {
        response = await result.current.complete({
          messages: [{ role: 'user', content: 'Hello' }]
        });
      });
      
      expect(response).toEqual(mockResponse);
      expect(llmService.complete).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'Hello' }]
      });
    });

    it('sets loading state during request', async () => {
      const { result } = renderHook(() => useLLM());
      
      expect(result.current.loading).toBe(false);
      
      const promise = act(async () => {
        await result.current.complete({ messages: [] });
      });
      
      // Check loading state immediately after starting request
      expect(result.current.loading).toBe(true);
      expect(result.current.isReady).toBe(false);
      
      await promise;
      
      expect(result.current.loading).toBe(false);
      expect(result.current.isReady).toBe(true);
    });

    it('handles errors properly', async () => {
      const error = new Error('API Error');
      (llmService.complete as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useLLM());
      
      await expect(
        act(async () => {
          await result.current.complete({ messages: [] });
        })
      ).rejects.toThrow('API Error');
      
      expect(result.current.error).toEqual(error);
      expect(result.current.loading).toBe(false);
    });

    it('prevents concurrent requests', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { result } = renderHook(() => useLLM());
      
      // Start first request but don't await
      act(() => {
        result.current.complete({ messages: [] });
      });
      
      expect(result.current.loading).toBe(true);
      
      // Try to start second request
      let secondResponse: LLMResponse | null = null;
      await act(async () => {
        secondResponse = await result.current.complete({ messages: [] });
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Request already in progress');
      expect(secondResponse).toBeNull();
      expect(llmService.complete).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    it('merges config with request options', async () => {
      const config = { model: 'gpt-4', temperature: 0.7 };
      const { result } = renderHook(() => useLLM(config));
      
      await act(async () => {
        await result.current.complete({
          messages: [],
          temperature: 0.5 // Override config
        });
      });
      
      expect(llmService.complete).toHaveBeenCalledWith({
        model: 'gpt-4',
        temperature: 0.5, // Request option overrides config
        messages: []
      });
    });

    it('handles abort errors gracefully', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (llmService.complete as jest.Mock).mockRejectedValue(abortError);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { result } = renderHook(() => useLLM());
      
      let response: LLMResponse | null = null;
      
      await act(async () => {
        response = await result.current.complete({ messages: [] });
      });
      
      expect(response).toBeNull();
      expect(result.current.error).toBeNull(); // Abort errors don't set error state
      expect(consoleSpy).toHaveBeenCalledWith('Request was cancelled');
      
      consoleSpy.mockRestore();
    });
  });

  describe('CompleteStream Function', () => {
    it('successfully streams a response', async () => {
      const { result } = renderHook(() => useLLM());
      
      const chunks: any[] = [];
      
      await act(async () => {
        const stream = result.current.completeStream({
          messages: [{ role: 'user', content: 'Hello' }]
        });
        
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      });
      
      expect(chunks).toEqual(mockStreamChunks);
      expect(llmService.completeStream).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'Hello' }]
      });
    });

    it('sets streaming state during request', async () => {
      const { result } = renderHook(() => useLLM());
      
      expect(result.current.streaming).toBe(false);
      
      const streamPromise = act(async () => {
        const stream = result.current.completeStream({ messages: [] });
        
        // Check streaming state immediately
        expect(result.current.streaming).toBe(true);
        expect(result.current.isReady).toBe(false);
        
        // Consume stream
        for await (const chunk of stream) {
          // Process chunks
        }
      });
      
      await streamPromise;
      
      expect(result.current.streaming).toBe(false);
      expect(result.current.isReady).toBe(true);
    });

    it('handles streaming errors', async () => {
      const error = new Error('Stream Error');
      (llmService.completeStream as jest.Mock).mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield mockStreamChunks[0];
          throw error;
        }
      });
      
      const { result } = renderHook(() => useLLM());
      
      await expect(
        act(async () => {
          const stream = result.current.completeStream({ messages: [] });
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        })
      ).rejects.toThrow('Stream Error');
      
      expect(result.current.error).toEqual(error);
      expect(result.current.streaming).toBe(false);
    });

    it('prevents concurrent streams', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { result } = renderHook(() => useLLM());
      
      // Create a long-running stream
      (llmService.completeStream as jest.Mock).mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { content: 'Start' };
          await new Promise(resolve => setTimeout(resolve, 100));
          yield { content: 'End' };
        }
      });
      
      // Start first stream but don't await
      act(() => {
        const stream1 = result.current.completeStream({ messages: [] });
        // Start consuming stream1 but don't await
        (async () => {
          for await (const chunk of stream1) {
            // Process chunks
          }
        })();
      });
      
      expect(result.current.streaming).toBe(true);
      
      // Try to start second stream
      await act(async () => {
        const stream2 = result.current.completeStream({ messages: [] });
        const chunks = [];
        for await (const chunk of stream2) {
          chunks.push(chunk);
        }
        expect(chunks).toEqual([]); // No chunks from second stream
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Stream already in progress');
      
      consoleSpy.mockRestore();
    });

    it('merges config with stream options', async () => {
      const config = { model: 'gpt-4', stream: true };
      const { result } = renderHook(() => useLLM(config));
      
      await act(async () => {
        const stream = result.current.completeStream({
          messages: [],
          temperature: 0.5
        });
        
        for await (const chunk of stream) {
          // Consume stream
        }
      });
      
      expect(llmService.completeStream).toHaveBeenCalledWith({
        model: 'gpt-4',
        stream: true,
        temperature: 0.5,
        messages: []
      });
    });
  });

  describe('Cancel Function', () => {
    it('cancels an ongoing request', () => {
      const mockAbort = jest.fn();
      global.AbortController = jest.fn().mockImplementation(() => ({
        abort: mockAbort,
        signal: {}
      }));
      
      const { result } = renderHook(() => useLLM());
      
      // Start a request
      act(() => {
        result.current.complete({ messages: [] });
      });
      
      // Cancel it
      act(() => {
        result.current.cancel();
      });
      
      expect(mockAbort).toHaveBeenCalled();
    });

    it('does nothing when no request is active', () => {
      const { result } = renderHook(() => useLLM());
      
      // Cancel without active request
      expect(() => {
        act(() => {
          result.current.cancel();
        });
      }).not.toThrow();
    });
  });

  describe('ClearError Function', () => {
    it('clears error state', async () => {
      const error = new Error('Test Error');
      (llmService.complete as jest.Mock).mockRejectedValue(error);
      
      const { result } = renderHook(() => useLLM());
      
      // Generate an error
      try {
        await act(async () => {
          await result.current.complete({ messages: [] });
        });
      } catch (e) {
        // Expected error
      }
      
      expect(result.current.error).toEqual(error);
      
      // Clear the error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('isReady State', () => {
    it('is false when loading', async () => {
      const { result } = renderHook(() => useLLM());
      
      const promise = act(async () => {
        await result.current.complete({ messages: [] });
      });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.isReady).toBe(false);
      
      await promise;
      
      expect(result.current.isReady).toBe(true);
    });

    it('is false when streaming', async () => {
      const { result } = renderHook(() => useLLM());
      
      const streamPromise = act(async () => {
        const stream = result.current.completeStream({ messages: [] });
        
        expect(result.current.streaming).toBe(true);
        expect(result.current.isReady).toBe(false);
        
        for await (const chunk of stream) {
          // Consume stream
        }
      });
      
      await streamPromise;
      
      expect(result.current.isReady).toBe(true);
    });

    it('is true when neither loading nor streaming', () => {
      const { result } = renderHook(() => useLLM());
      
      expect(result.current.loading).toBe(false);
      expect(result.current.streaming).toBe(false);
      expect(result.current.isReady).toBe(true);
    });
  });
});