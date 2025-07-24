import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageHandling } from '../useMessageHandling';
import { chatService } from '../../services/ChatService';
import { memoryService } from '../../services/MemoryService';
import type { ChatMessage } from '../../types/chat.types';

// Mock dependencies
jest.mock('../../services/ChatService', () => ({
  chatService: {
    createUserMessage: jest.fn(),
  },
}));

jest.mock('../../services/MemoryService', () => ({
  memoryService: {
    saveConversation: jest.fn(),
  },
}));

jest.mock('../useChatApi', () => ({
  useChatApi: ({ onSuccess, onError, onTypingChange }: any) => {
    const sendMessage = jest.fn(async (text, system, messages, model) => {
      // Simulate API call
      if (text === 'error') {
        onError('API Error');
      } else {
        onTypingChange(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        onTypingChange(false);
        onSuccess({
          id: 'assistant-123',
          role: 'assistant',
          content: 'Assistant response',
          timestamp: Date.now(),
        });
      }
    });

    return {
      sendMessage,
      loadingState: {
        isTyping: false,
        type: 'idle',
      },
    };
  },
}));

describe('useMessageHandling Hook', () => {
  const mockProps = {
    selectedModel: 'gpt-4',
    messages: [] as ChatMessage[],
    createSystemPrompt: jest.fn((query?: string) => `System prompt for: ${query}`),
    addMessage: jest.fn(),
    setInput: jest.fn(),
    setError: jest.fn(),
    setTyping: jest.fn(),
    isTyping: false,
    input: 'Test message',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (chatService.createUserMessage as jest.Mock).mockImplementation(text => ({
      id: 'user-123',
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }));
    (memoryService.saveConversation as jest.Mock).mockResolvedValue(undefined);
  });

  describe('sendMessage', () => {
    it('sends a message successfully', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello Virgil');
      });

      // Verify user message was created and added
      expect(chatService.createUserMessage).toHaveBeenCalledWith('Hello Virgil');
      expect(mockProps.addMessage).toHaveBeenCalledWith({
        id: 'user-123',
        role: 'user',
        content: 'Hello Virgil',
        timestamp: expect.any(Number),
      });

      // Verify input was cleared and error reset
      expect(mockProps.setInput).toHaveBeenCalledWith('');
      expect(mockProps.setError).toHaveBeenCalledWith(null);

      // Verify memory service was called for both messages
      await waitFor(() => {
        expect(memoryService.saveConversation).toHaveBeenCalledTimes(2);
      });
    });

    it('does not send empty messages', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(chatService.createUserMessage).not.toHaveBeenCalled();
      expect(mockProps.addMessage).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (memoryService.saveConversation as jest.Mock).mockRejectedValue(new Error('Save failed'));
      
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save user message:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('focuses input after sending message', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));
      
      // Create a mock input element
      const mockInput = document.createElement('input');
      const focusSpy = jest.spyOn(mockInput, 'focus');
      
      // Mock the ref
      Object.defineProperty(result.current.inputRef, 'current', {
        writable: true,
        value: mockInput,
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Wait for setTimeout
      await waitFor(() => {
        expect(focusSpy).toHaveBeenCalled();
      });
    });

    it('uses system prompt with user query', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('What is the weather?');
      });

      expect(mockProps.createSystemPrompt).toHaveBeenCalledWith('What is the weather?');
    });
  });

  describe('handleSubmit', () => {
    it('sends message on form submit', async () => {
      const props = { ...mockProps, input: 'Submit test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(chatService.createUserMessage).toHaveBeenCalledWith('Submit test');
    });

    it('does not send when typing is in progress', async () => {
      const props = { ...mockProps, isTyping: true, input: 'Test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(chatService.createUserMessage).not.toHaveBeenCalled();
    });

    it('does not send empty input', async () => {
      const props = { ...mockProps, input: '   ' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent<HTMLFormElement>;

      await act(async () => {
        result.current.handleSubmit(mockEvent);
      });

      expect(chatService.createUserMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyDown', () => {
    it('sends message on Enter key', async () => {
      const props = { ...mockProps, input: 'Enter test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(chatService.createUserMessage).toHaveBeenCalledWith('Enter test');
    });

    it('does not send on Shift+Enter', async () => {
      const props = { ...mockProps, input: 'Test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        key: 'Enter',
        shiftKey: true,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(chatService.createUserMessage).not.toHaveBeenCalled();
    });

    it('does not send when typing is in progress', async () => {
      const props = { ...mockProps, isTyping: true, input: 'Test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(chatService.createUserMessage).not.toHaveBeenCalled();
    });

    it('ignores other keys', async () => {
      const props = { ...mockProps, input: 'Test' };
      const { result } = renderHook(() => useMessageHandling(props));
      
      const mockEvent = {
        key: 'a',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleKeyDown(mockEvent);
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(chatService.createUserMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleQuickAction', () => {
    it('sends quick action message', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        result.current.handleQuickAction('Show weather');
      });

      expect(chatService.createUserMessage).toHaveBeenCalledWith('Show weather');
      expect(mockProps.addMessage).toHaveBeenCalled();
    });
  });

  describe('API integration', () => {
    it('handles successful API response', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(mockProps.addMessage).toHaveBeenCalledWith({
          id: 'assistant-123',
          role: 'assistant',
          content: 'Assistant response',
          timestamp: expect.any(Number),
        });
      });
    });

    it('handles API errors', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('error');
      });

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith('API Error');
      });
    });

    it('manages typing state correctly', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      // Verify typing state changes
      await waitFor(() => {
        expect(mockProps.setTyping).toHaveBeenCalledWith(true);
      });

      await waitFor(() => {
        expect(mockProps.setTyping).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('memory service integration', () => {
    it('saves both user and assistant messages', async () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(memoryService.saveConversation).toHaveBeenCalledWith([
          expect.objectContaining({
            role: 'user',
            content: 'Hello',
          }),
        ]);
      });

      await waitFor(() => {
        expect(memoryService.saveConversation).toHaveBeenCalledWith([
          expect.objectContaining({
            role: 'assistant',
            content: 'Assistant response',
          }),
        ]);
      });
    });

    it('continues working even if memory save fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (memoryService.saveConversation as jest.Mock)
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useMessageHandling(mockProps));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      // Should still add messages even if save fails
      expect(mockProps.addMessage).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('inputRef', () => {
    it('provides a ref for the input element', () => {
      const { result } = renderHook(() => useMessageHandling(mockProps));
      
      expect(result.current.inputRef).toBeDefined();
      expect(result.current.inputRef.current).toBeNull();
    });
  });
});