import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { chatService } from '../services/ChatService';

export interface LoadingState {
  type: 'generating' | 'processing' | 'thinking' | 'searching';
  progress?: number;
}

export interface UseChatApiOptions {
  onSuccess?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onLoadingStateChange?: (loadingState: LoadingState | null) => void;
}

/**
 * Custom hook for chat API interactions
 * 
 * Handles sending messages, loading states, and error handling
 */
export function useChatApi(options: UseChatApiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);

  const sendMessage = useCallback(async (
    userMessage: string,
    systemPrompt: string,
    previousMessages: ChatMessage[],
    model: string,
  ): Promise<void> => {
    if (!userMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    options.onTypingChange?.(true);
    
    // Enhanced loading states
    setLoadingState({ type: 'processing' });
    options.onLoadingStateChange?.({ type: 'processing' });
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingState(prev => {
        if (!prev) return null;
        const newProgress = (prev.progress || 0) + Math.random() * 15;
        const progress = Math.min(newProgress, 85); // Don't go to 100% until complete
        const newState = { ...prev, progress };
        options.onLoadingStateChange?.(newState);
        return newState;
      });
    }, 500);

    try {
      // Update to thinking state
      setLoadingState({ type: 'thinking', progress: 90 });
      options.onLoadingStateChange?.({ type: 'thinking', progress: 90 });
      
      const response = await chatService.sendMessage(
        userMessage,
        systemPrompt,
        previousMessages,
        model,
      );
      
      // Complete the progress
      setLoadingState({ type: 'generating', progress: 100 });
      options.onLoadingStateChange?.({ type: 'generating', progress: 100 });
      
      options.onSuccess?.(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options.onError?.(errorMessage);
      
      // Send fallback message
      const fallbackMessage = chatService.createFallbackMessage();
      options.onSuccess?.(fallbackMessage);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setLoadingState(null);
      options.onTypingChange?.(false);
      options.onLoadingStateChange?.(null);
    }
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    isLoading,
    error,
    clearError,
    loadingState,
  };
}