import { useState, useCallback, useRef } from 'react';
import { useLLM } from './useLLM';
import type {
  ChatMessage,
  ChatHookOptions,
  ConversationSummary,
  ExportData,
  ExportFormat,
} from '../types/chat.types';
import type { LLMRequest } from '../types/llm.types';

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string, options?: Partial<LLMRequest>) => Promise<ChatMessage | null>;
  sendMessageStream: (content: string, options?: Partial<LLMRequest>) => Promise<ChatMessage>;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => ChatMessage;
  clearMessages: () => void;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  regenerateLastResponse: (options?: Partial<LLMRequest>) => Promise<ChatMessage | null>;
  exportConversation: (format?: ExportFormat) => string | ExportData;
  loadConversation: (data: string | ExportData) => boolean;
  getConversationSummary: () => ConversationSummary;
  loading: boolean;
  isTyping: boolean;
  error: string | null;
  clearError: () => void;
  isReady: boolean;
}

export function useChat(systemPrompt?: string, config: ChatHookOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  const { complete, completeStream, loading, error, clearError } = useLLM(config);
  const messageIdCounter = useRef<number>(0);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg-${Date.now()}-${++messageIdCounter.current}`;
  }, []);

  // Validate message content
  const validateContent = (content: string): void => {
    if (!content?.trim()) {
      throw new Error('Message content cannot be empty');
    }
  };

  // Add a message to the conversation
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string): ChatMessage => {
    const message = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, message]);
    return message;
  }, [generateMessageId]);

  // Send a message and get response
  const sendMessage = useCallback(async (content: string, options: Partial<LLMRequest> = {}): Promise<ChatMessage | null> => {
    validateContent(content);

    clearError();

    // Add user message
    const userMessage = addMessage('user', content.trim());
    
    try {
      // Get response from LLM
      const response = await complete({
        messages: [...messages, userMessage],
        systemPrompt,
        cacheKey: options.enableCache ? `chat-${messages.length + 1}` : undefined,
        ...options,
      });

      if (response?.content) {
        // Add assistant response
        const assistantMessage = addMessage('assistant', response.content);
        return assistantMessage;
      }

      return null;

    } catch (error: any) {
      // Add error message for user feedback
      addMessage('system', `Error: ${error.message}`);
      throw error;
    }
  }, [messages, complete, systemPrompt, addMessage, clearError]);

  // Send message with streaming response
  const sendMessageStream = useCallback(async (content: string, options: Partial<LLMRequest> = {}): Promise<ChatMessage> => {
    validateContent(content);

    clearError();

    // Add user message
    const userMessage = addMessage('user', content.trim());
    
    // Create placeholder for assistant response
    const assistantMessageId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(true);

    try {
      const stream = completeStream({
        messages: [...messages, userMessage],
        systemPrompt,
        ...options,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        if (chunk.content) {
          fullContent += chunk.content;
          
          // Update the streaming message
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent }
              : msg,
          ));
        }
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, streaming: false }
          : msg,
      ));

      return { ...assistantMessage, streaming: false } as ChatMessage;

    } catch (error: any) {
      // Remove the failed streaming message and add error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      addMessage('system', `Error: ${error.message}`);
      throw error;
    } finally {
      setIsTyping(false);
    }
  }, [messages, completeStream, systemPrompt, addMessage, generateMessageId, clearError]);

  // Clear the conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Remove a specific message
  const removeMessage = useCallback((messageId: string): void => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Update a message
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>): void => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg,
    ));
  }, []);

  // Regenerate last assistant response
  const regenerateLastResponse = useCallback(async (options: Partial<LLMRequest> = {}): Promise<ChatMessage | null> => {
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      throw new Error('No user message found to regenerate from');
    }

    // Remove all messages after the last user message
    const userMessageIndex = messages.findIndex(msg => msg.id === lastUserMessage.id);
    const messagesUpToUser = messages.slice(0, userMessageIndex + 1);
    
    setMessages(messagesUpToUser);

    // Regenerate response
    return sendMessage(lastUserMessage.content, options);
  }, [messages, sendMessage]);

  // Get conversation summary for context
  const getConversationSummary = useCallback((): ConversationSummary => {
    const userMessages = messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
    const totalMessages = messages.length;

    return {
      userMessages,
      assistantMessages,
      totalMessages,
      lastMessage: messages[messages.length - 1] || null,
      conversationStarted: messages.length > 0 ? messages[0].timestamp : null,
    };
  }, [messages]);

  // Export conversation
  const exportConversation = useCallback((format: ExportFormat = 'json'): string | ExportData => {
    const exportData = {
      systemPrompt,
      messages: messages.filter(msg => msg.role !== 'system'),
      exportedAt: new Date().toISOString(),
      summary: getConversationSummary(),
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }

    if (format === 'markdown') {
      let markdown = '# Conversation Export\n\n';
      if (systemPrompt) {
        markdown += `**System Prompt:** ${systemPrompt}\n\n`;
      }
      
      for (const message of exportData.messages) {
        const role = message.role === 'user' ? 'You' : 'Assistant';
        markdown += `**${role}:** ${message.content}\n\n`;
      }
      
      return markdown;
    }

    return exportData;
  }, [messages, systemPrompt, getConversationSummary]);

  // Load conversation from export
  const loadConversation = useCallback((data: string | ExportData): boolean => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed.messages && Array.isArray(parsed.messages)) {
        setMessages(parsed.messages);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Failed to load conversation:', error);
      return false;
    }
  }, []);

  return {
    messages,
    sendMessage,
    sendMessageStream,
    addMessage,
    clearMessages,
    removeMessage,
    updateMessage,
    regenerateLastResponse,
    exportConversation,
    loadConversation,
    getConversationSummary,
    loading,
    isTyping,
    error: error?.message || null,
    clearError,
    isReady: !loading && !isTyping,
  };
}