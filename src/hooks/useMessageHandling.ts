import { useCallback, useRef } from 'react';
import type React from 'react';
import { chatService } from '../services/ChatService';
import { memoryService } from '../services/MemoryService';
import { vectorMemoryService } from '../services/VectorMemoryService';
import type { ChatMessage } from '../types/chat.types';
import { logger } from '../lib/logger';

interface UseMessageHandlingProps {
  selectedModel: string;
  messages: ChatMessage[];
  createSystemPrompt: (userQuery?: string) => Promise<string>;
  addMessage: (message: ChatMessage) => void;
  setInput: (input: string) => void;
  setError: (error: string | null) => void;
  setTyping: (typing: boolean) => void;
  isTyping: boolean;
  input: string;
}

interface UseMessageHandlingReturn {
  sendMessage: (messageText: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleQuickAction: (action: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useMessageHandling({
  selectedModel,
  messages,
  createSystemPrompt,
  addMessage,
  setInput,
  setError,
  setTyping,
  isTyping,
  input,
}: UseMessageHandlingProps): UseMessageHandlingReturn {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage = chatService.createUserMessage(messageText);
    addMessage(userMessage);
    setInput('');
    setError(null);
    setTyping(true);

    try {
      // Save user message to continuous conversation
      await memoryService.saveConversation([userMessage]);
      
      // Store in vector memory (async, don't wait)
      vectorMemoryService.storeMessageWithEmbedding(userMessage).catch(error => {
        logger.error('Failed to save user message to vector memory', error as Error, {
          component: 'useMessageHandling',
          action: 'saveUserMessage',
        });
      });

      // Build system prompt
      const systemPrompt = await createSystemPrompt(messageText);

      // Send to chat API
      const response = await chatService.sendMessage(
        messageText,
        systemPrompt,
        messages,
        selectedModel,
      );

      // Add assistant message
      addMessage(response);
      
      // Save assistant message (async, don't wait)
      Promise.all([
        memoryService.saveConversation([response]),
        vectorMemoryService.storeMessageWithEmbedding(response),
      ]).catch(error => {
        logger.error('Failed to save assistant message', error as Error, {
          component: 'useMessageHandling',
          action: 'saveAssistantMessage',
        });
      });

      setTyping(false);
      
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      setTyping(false);

      // Send fallback message
      const fallbackMessage = chatService.createFallbackMessage();
      addMessage(fallbackMessage);
      
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [selectedModel, messages, createSystemPrompt, addMessage, setInput, setError, setTyping]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input?.trim() && !isTyping) {
      sendMessage(input);
    }
  }, [isTyping, input, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && input.trim()) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [isTyping, input, sendMessage]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  return {
    sendMessage,
    handleSubmit,
    handleKeyDown,
    handleQuickAction,
    inputRef,
  };
}
