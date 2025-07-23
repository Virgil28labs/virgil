import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { chatService } from '../services/ChatService';

export interface UseChatApiOptions {
  onSuccess?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

/**
 * Custom hook for chat API interactions
 * 
 * Handles sending messages, loading states, and error handling
 */
export function useChatApi(options: UseChatApiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    userMessage: string,
    systemPrompt: string,
    previousMessages: ChatMessage[],
    model: string
  ): Promise<void> => {
    if (!userMessage.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    options.onTypingChange?.(true);

    try {
      const response = await chatService.sendMessage(
        userMessage,
        systemPrompt,
        previousMessages,
        model
      );
      
      options.onSuccess?.(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options.onError?.(errorMessage);
      
      // Send fallback message
      const fallbackMessage = chatService.createFallbackMessage();
      options.onSuccess?.(fallbackMessage);
    } finally {
      setIsLoading(false);
      options.onTypingChange?.(false);
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
  };
}