import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { useLLM } from './useLLM';
import type { ChatMessage, ConversationSummary } from '../types/chat.types';
import type { LLMResponse } from '../types/llm.types';

// Mock useLLM hook
jest.mock('./useLLM');

// Mock data
const mockLLMResponse: LLMResponse = {
  id: 'llm-response-1',
  content: 'Hello! How can I help you today?',
  model: 'gpt-4',
  usage: {
    promptTokens: 10,
    completionTokens: 8,
    totalTokens: 18
  }
};

const mockStreamChunks = [
  { content: 'Hello! ' },
  { content: 'How can ' },
  { content: 'I help ' },
  { content: 'you today?' }
];

describe('useChat', () => {
  let mockComplete: jest.Mock;
  let mockCompleteStream: jest.Mock;
  let mockClearError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockComplete = jest.fn().mockResolvedValue(mockLLMResponse);
    mockCompleteStream = jest.fn();
    mockClearError = jest.fn();
    
    (useLLM as jest.Mock).mockReturnValue({
      complete: mockComplete,
      completeStream: mockCompleteStream,
      loading: false,
      error: null,
      clearError: mockClearError
    });
  });

  describe('Basic Functionality', () => {
    it('initializes with empty messages', () => {
      const { result } = renderHook(() => useChat());
      
      expect(result.current.messages).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isReady).toBe(true);
    });

    it('initializes with system prompt', () => {
      const systemPrompt = 'You are a helpful assistant';
      const { result } = renderHook(() => useChat(systemPrompt));
      
      // System prompt should be passed to LLM calls, not stored in messages
      expect(result.current.messages).toEqual([]);
    });

    it('adds messages with unique IDs and timestamps', () => {
      const { result } = renderHook(() => useChat());
      
      let message1: ChatMessage;
      let message2: ChatMessage;
      
      act(() => {
        message1 = result.current.addMessage('user', 'Hello');
        message2 = result.current.addMessage('assistant', 'Hi there!');
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(message1!.id).toBeTruthy();
      expect(message1!.id).not.toBe(message2!.id);
      expect(message1!.timestamp).toBeTruthy();
      expect(message1!.content).toBe('Hello');
      expect(message1!.role).toBe('user');
    });
  });

  describe('Message Sending', () => {
    it('sends a message and receives response', async () => {
      const { result } = renderHook(() => useChat());
      
      let response: ChatMessage | null;
      
      await act(async () => {
        response = await result.current.sendMessage('Hello, AI!');
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello, AI!');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Hello! How can I help you today?');
      
      expect(mockComplete).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Hello, AI!'
          })
        ]),
        systemPrompt: undefined,
        cacheKey: undefined
      });
    });

    it('sends message with system prompt', async () => {
      const systemPrompt = 'You are a helpful assistant';
      const { result } = renderHook(() => useChat(systemPrompt));
      
      await act(async () => {
        await result.current.sendMessage('Hello!');
      });
      
      expect(mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt
        })
      );
    });

    it('sends message with custom options', async () => {
      const { result } = renderHook(() => useChat());
      
      await act(async () => {
        await result.current.sendMessage('Hello!', {
          model: 'gpt-4',
          temperature: 0.5,
          enableCache: true
        });
      });
      
      expect(mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.5,
          cacheKey: 'chat-1'
        })
      );
    });

    it('throws error for empty message', async () => {
      const { result } = renderHook(() => useChat());
      
      await expect(
        act(async () => {
          await result.current.sendMessage('   ');
        })
      ).rejects.toThrow('Message content cannot be empty');
    });

    it('handles errors from LLM', async () => {
      const error = new Error('API Error');
      mockComplete.mockRejectedValue(error);
      
      const { result } = renderHook(() => useChat());
      
      await expect(
        act(async () => {
          await result.current.sendMessage('Hello!');
        })
      ).rejects.toThrow('API Error');
      
      // Should add error message to conversation
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe('system');
      expect(result.current.messages[1].content).toBe('Error: API Error');
    });

    it('returns null when LLM response has no content', async () => {
      mockComplete.mockResolvedValue({ id: '1', content: null });
      
      const { result } = renderHook(() => useChat());
      
      let response: ChatMessage | null;
      
      await act(async () => {
        response = await result.current.sendMessage('Hello!');
      });
      
      expect(response!).toBeNull();
      expect(result.current.messages).toHaveLength(1); // Only user message
    });
  });

  describe('Streaming Messages', () => {
    beforeEach(() => {
      // Mock async generator for streaming
      mockCompleteStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamChunks) {
            yield chunk;
          }
        }
      });
    });

    it('sends message with streaming response', async () => {
      const { result } = renderHook(() => useChat());
      
      let streamingMessage: ChatMessage;
      
      await act(async () => {
        streamingMessage = await result.current.sendMessageStream('Hello!');
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toBe('Hello! How can I help you today?');
      expect(result.current.messages[1].streaming).toBe(false);
      expect(streamingMessage!.streaming).toBe(false);
    });

    it('updates message content during streaming', async () => {
      const { result } = renderHook(() => useChat());
      
      const messagePromise = act(async () => {
        return result.current.sendMessageStream('Hello!');
      });
      
      // Check intermediate states
      await waitFor(() => {
        const assistantMessage = result.current.messages.find(msg => msg.role === 'assistant');
        expect(assistantMessage).toBeDefined();
        expect(assistantMessage?.streaming).toBe(true);
      });
      
      await messagePromise;
      
      const finalMessage = result.current.messages[1];
      expect(finalMessage.content).toBe('Hello! How can I help you today?');
      expect(finalMessage.streaming).toBe(false);
    });

    it('sets isTyping during streaming', async () => {
      const { result } = renderHook(() => useChat());
      
      expect(result.current.isTyping).toBe(false);
      
      const messagePromise = act(async () => {
        return result.current.sendMessageStream('Hello!');
      });
      
      await waitFor(() => {
        expect(result.current.isTyping).toBe(true);
      });
      
      await messagePromise;
      
      expect(result.current.isTyping).toBe(false);
    });

    it('handles streaming errors', async () => {
      const error = new Error('Stream Error');
      mockCompleteStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { content: 'Hello' };
          throw error;
        }
      });
      
      const { result } = renderHook(() => useChat());
      
      await expect(
        act(async () => {
          await result.current.sendMessageStream('Hello!');
        })
      ).rejects.toThrow('Stream Error');
      
      // Should remove failed streaming message and add error
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe('system');
      expect(result.current.messages[1].content).toBe('Error: Stream Error');
      expect(result.current.isTyping).toBe(false);
    });
  });

  describe('Message Management', () => {
    it('clears all messages', () => {
      const { result } = renderHook(() => useChat());
      
      act(() => {
        result.current.addMessage('user', 'Message 1');
        result.current.addMessage('assistant', 'Response 1');
        result.current.clearMessages();
      });
      
      expect(result.current.messages).toEqual([]);
    });

    it('removes a specific message', () => {
      const { result } = renderHook(() => useChat());
      
      let message1: ChatMessage;
      let message2: ChatMessage;
      let message3: ChatMessage;
      
      act(() => {
        message1 = result.current.addMessage('user', 'Message 1');
        message2 = result.current.addMessage('assistant', 'Response 1');
        message3 = result.current.addMessage('user', 'Message 2');
      });
      
      act(() => {
        result.current.removeMessage(message2.id);
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].id).toBe(message1.id);
      expect(result.current.messages[1].id).toBe(message3.id);
    });

    it('updates a message', () => {
      const { result } = renderHook(() => useChat());
      
      let message: ChatMessage;
      
      act(() => {
        message = result.current.addMessage('user', 'Original content');
      });
      
      act(() => {
        result.current.updateMessage(message.id, {
          content: 'Updated content',
          edited: true
        });
      });
      
      expect(result.current.messages[0].content).toBe('Updated content');
      expect(result.current.messages[0].edited).toBe(true);
      expect(result.current.messages[0].role).toBe('user'); // Other properties unchanged
    });
  });

  describe('Regenerate Response', () => {
    it('regenerates last assistant response', async () => {
      const { result } = renderHook(() => useChat());
      
      // Setup initial conversation
      act(() => {
        result.current.addMessage('user', 'First message');
        result.current.addMessage('assistant', 'First response');
        result.current.addMessage('user', 'Second message');
        result.current.addMessage('assistant', 'Second response');
      });
      
      mockComplete.mockResolvedValue({
        ...mockLLMResponse,
        content: 'Regenerated response'
      });
      
      await act(async () => {
        await result.current.regenerateLastResponse();
      });
      
      expect(result.current.messages).toHaveLength(4);
      expect(result.current.messages[3].content).toBe('Regenerated response');
      expect(mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Second message' })
          ])
        })
      );
    });

    it('throws error when no user message to regenerate from', async () => {
      const { result } = renderHook(() => useChat());
      
      act(() => {
        result.current.addMessage('assistant', 'Only assistant message');
      });
      
      await expect(
        act(async () => {
          await result.current.regenerateLastResponse();
        })
      ).rejects.toThrow('No user message found to regenerate from');
    });

    it('removes messages after last user message when regenerating', async () => {
      const { result } = renderHook(() => useChat());
      
      act(() => {
        result.current.addMessage('user', 'User message');
        result.current.addMessage('assistant', 'Response 1');
        result.current.addMessage('system', 'System message');
        result.current.addMessage('assistant', 'Response 2');
      });
      
      await act(async () => {
        await result.current.regenerateLastResponse();
      });
      
      // Should only have user message and new response
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('User message');
      expect(result.current.messages[1].role).toBe('assistant');
    });
  });

  describe('Conversation Summary', () => {
    it('returns correct conversation summary', () => {
      const { result } = renderHook(() => useChat());
      
      act(() => {
        result.current.addMessage('user', 'Message 1');
        result.current.addMessage('assistant', 'Response 1');
        result.current.addMessage('user', 'Message 2');
        result.current.addMessage('assistant', 'Response 2');
        result.current.addMessage('system', 'System message');
      });
      
      const summary = result.current.getConversationSummary();
      
      expect(summary.userMessages).toBe(2);
      expect(summary.assistantMessages).toBe(2);
      expect(summary.totalMessages).toBe(5);
      expect(summary.lastMessage?.content).toBe('System message');
      expect(summary.conversationStarted).toBeTruthy();
    });

    it('returns correct summary for empty conversation', () => {
      const { result } = renderHook(() => useChat());
      
      const summary = result.current.getConversationSummary();
      
      expect(summary.userMessages).toBe(0);
      expect(summary.assistantMessages).toBe(0);
      expect(summary.totalMessages).toBe(0);
      expect(summary.lastMessage).toBeNull();
      expect(summary.conversationStarted).toBeNull();
    });
  });

  describe('Export and Import', () => {
    it('exports conversation as JSON', () => {
      const systemPrompt = 'You are helpful';
      const { result } = renderHook(() => useChat(systemPrompt));
      
      act(() => {
        result.current.addMessage('user', 'Hello');
        result.current.addMessage('assistant', 'Hi there!');
        result.current.addMessage('system', 'System message'); // Should be filtered out
      });
      
      const exported = result.current.exportConversation('json');
      const parsed = JSON.parse(exported as string);
      
      expect(parsed.systemPrompt).toBe(systemPrompt);
      expect(parsed.messages).toHaveLength(2); // System messages filtered
      expect(parsed.messages[0].role).toBe('user');
      expect(parsed.messages[1].role).toBe('assistant');
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.summary).toBeDefined();
    });

    it('exports conversation as markdown', () => {
      const systemPrompt = 'You are helpful';
      const { result } = renderHook(() => useChat(systemPrompt));
      
      act(() => {
        result.current.addMessage('user', 'Hello');
        result.current.addMessage('assistant', 'Hi there!');
      });
      
      const markdown = result.current.exportConversation('markdown') as string;
      
      expect(markdown).toContain('# Conversation Export');
      expect(markdown).toContain('**System Prompt:** You are helpful');
      expect(markdown).toContain('**You:** Hello');
      expect(markdown).toContain('**Assistant:** Hi there!');
    });

    it('exports conversation as raw data', () => {
      const { result } = renderHook(() => useChat());
      
      act(() => {
        result.current.addMessage('user', 'Hello');
      });
      
      const data = result.current.exportConversation('raw');
      
      expect(typeof data).toBe('object');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('summary');
    });

    it('loads conversation from JSON string', () => {
      const { result } = renderHook(() => useChat());
      
      const exportData = {
        messages: [
          { id: '1', role: 'user', content: 'Loaded message', timestamp: new Date().toISOString() },
          { id: '2', role: 'assistant', content: 'Loaded response', timestamp: new Date().toISOString() }
        ]
      };
      
      const success = result.current.loadConversation(JSON.stringify(exportData));
      
      expect(success).toBe(true);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('Loaded message');
      expect(result.current.messages[1].content).toBe('Loaded response');
    });

    it('loads conversation from export data object', () => {
      const { result } = renderHook(() => useChat());
      
      const exportData = {
        messages: [
          { id: '1', role: 'user', content: 'Loaded message', timestamp: new Date().toISOString() }
        ],
        systemPrompt: 'Test prompt',
        exportedAt: new Date().toISOString()
      };
      
      const success = result.current.loadConversation(exportData);
      
      expect(success).toBe(true);
      expect(result.current.messages).toHaveLength(1);
    });

    it('handles invalid import data', () => {
      const { result } = renderHook(() => useChat());
      
      // Invalid JSON
      expect(result.current.loadConversation('invalid json')).toBe(false);
      
      // Missing messages array
      expect(result.current.loadConversation(JSON.stringify({ data: 'invalid' }))).toBe(false);
      
      // Non-array messages
      expect(result.current.loadConversation(JSON.stringify({ messages: 'not array' }))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('clears error when requested', () => {
      (useLLM as jest.Mock).mockReturnValue({
        complete: mockComplete,
        completeStream: mockCompleteStream,
        loading: false,
        error: { message: 'Test error' },
        clearError: mockClearError
      });
      
      const { result } = renderHook(() => useChat());
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(mockClearError).toHaveBeenCalled();
    });

    it('clears error before sending message', async () => {
      const { result } = renderHook(() => useChat());
      
      await act(async () => {
        await result.current.sendMessage('Hello!');
      });
      
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('reflects loading state from useLLM', () => {
      (useLLM as jest.Mock).mockReturnValue({
        complete: mockComplete,
        completeStream: mockCompleteStream,
        loading: true,
        error: null,
        clearError: mockClearError
      });
      
      const { result } = renderHook(() => useChat());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.isReady).toBe(false);
    });

    it('isReady is false when typing', async () => {
      const { result } = renderHook(() => useChat());
      
      expect(result.current.isReady).toBe(true);
      
      const messagePromise = act(async () => {
        return result.current.sendMessageStream('Hello!');
      });
      
      await waitFor(() => {
        expect(result.current.isTyping).toBe(true);
        expect(result.current.isReady).toBe(false);
      });
      
      await messagePromise;
      
      expect(result.current.isReady).toBe(true);
    });
  });
});