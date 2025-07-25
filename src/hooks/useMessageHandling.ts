import { useCallback, useRef } from 'react';
import type React from 'react';
import { chatService } from '../services/ChatService';
import { memoryService } from '../services/MemoryService';
import { useChatApi, type LoadingState } from './useChatApi';
import type { ChatMessage } from '../types/chat.types';

interface UseMessageHandlingProps {
  selectedModel: string;
  messages: ChatMessage[];
  createSystemPrompt: (userQuery?: string) => string;
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
  loadingState: LoadingState | null;
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

  // Use chat API hook with enhanced loading states
  const { sendMessage: sendChatMessage, loadingState } = useChatApi({
    onSuccess: async (message) => {
      addMessage(message);
      
      // Save assistant message to continuous conversation
      try {
        await memoryService.saveConversation([message]);
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
      
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (error) => {
      setError(error);
    },
    onTypingChange: setTyping,
  });

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage = chatService.createUserMessage(messageText);
    addMessage(userMessage);
    setInput('');
    setError(null);
    
    // Save user message to continuous conversation
    try {
      await memoryService.saveConversation([userMessage]);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }
    
    setTimeout(() => inputRef.current?.focus(), 0);

    const systemPrompt = createSystemPrompt(messageText);
    await sendChatMessage(messageText, systemPrompt, messages, selectedModel);
  }, [selectedModel, messages, createSystemPrompt, addMessage, setInput, setError, sendChatMessage]);

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
    loadingState,
    inputRef,
  };
}