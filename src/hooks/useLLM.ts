import { useState, useRef, useCallback } from 'react';
import { llmService } from '../services/llm';
import type { LLMRequest, LLMResponse, LLMConfig } from '../types/llm.types';

interface UseLLMReturn {
  complete: (options: Partial<LLMRequest>) => Promise<LLMResponse | null>;
  completeStream: (options: Partial<LLMRequest>) => AsyncGenerator<string, void, unknown>;
  cancel: () => void;
  clearError: () => void;
  loading: boolean;
  streaming: boolean;
  error: Error | null;
  isReady: boolean;
}

export function useLLM(config: Partial<LLMConfig> = {}): UseLLMReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [streaming, setStreaming] = useState<boolean>(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const service = useRef(llmService);

  const complete = useCallback(async (options: Partial<LLMRequest>): Promise<LLMResponse | null> => {
    if (loading) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await service.current.complete({
        ...config,
        ...options,
      });

      return response;

    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [loading, config]);

  const completeStream = useCallback(async function* (options: Partial<LLMRequest>): AsyncGenerator<string, void, unknown> {
    if (streaming) {
      return;
    }

    setStreaming(true);
    setError(null);

    try {
      const stream = service.current.completeStream({
        ...config,
        ...options,
      });

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setStreaming(false);
    }
  }, [streaming, config]);

  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    complete,
    completeStream,
    cancel,
    clearError,
    loading,
    streaming,
    error,
    isReady: !loading && !streaming,
  };
}