import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { ChatProvider, useChatContext } from '../ChatContext';
import { StorageService, STORAGE_KEYS } from '../../../services/StorageService';
import type { ChatMessage } from '../../../types/chat.types';

// Mock StorageService
jest.mock('../../../services/StorageService', () => ({
  StorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
  STORAGE_KEYS: {
    WINDOW_SIZE: 'windowSize',
    CUSTOM_SYSTEM_PROMPT: 'customSystemPrompt',
    SELECTED_MODEL: 'selectedModel',
    ACTIVE_CONVERSATION: 'activeConversation',
  },
}));

describe('ChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock returns
    (StorageService.get as jest.Mock).mockImplementation((key, defaultValue) => defaultValue);
  });

  describe('ChatProvider', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useChatContext(), {
        wrapper: ChatProvider,
      });

      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.windowSize).toBe('normal');
      expect(result.current.state.messages).toEqual([]);
      expect(result.current.state.input).toBe('');
      expect(result.current.state.isTyping).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('initializes with values from localStorage', () => {
      (StorageService.get as jest.Mock).mockImplementation((key) => {
        switch (key) {
          case STORAGE_KEYS.WINDOW_SIZE:
            return 'large';
          case STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT:
            return 'Custom prompt';
          case STORAGE_KEYS.SELECTED_MODEL:
            return 'gpt-4';
          default:
            return undefined;
        }
      });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: ChatProvider,
      });

      expect(result.current.state.windowSize).toBe('large');
      expect(result.current.state.customSystemPrompt).toBe('Custom prompt');
      expect(result.current.state.selectedModel).toBe('gpt-4');
    });

    it('handles localStorage errors gracefully', () => {
      (StorageService.get as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useChatContext(), {
        wrapper: ChatProvider,
      });

      // Should fall back to default values
      expect(result.current.state.windowSize).toBe('normal');
      expect(result.current.state.customSystemPrompt).toBe('');
      expect(result.current.state.selectedModel).toBe('gpt-4o-mini');
    });
  });

  describe('useChatContext', () => {
    it('throws error when used outside provider', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useChatContext());
      }).toThrow('useChatContext must be used within a ChatProvider');
      
      consoleErrorSpy.mockRestore();
    });

    it('provides context value when used within provider', () => {
      const { result } = renderHook(() => useChatContext(), {
        wrapper: ChatProvider,
      });

      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('dispatch');
      expect(result.current).toHaveProperty('setOpen');
      expect(result.current).toHaveProperty('setWindowSize');
      expect(result.current).toHaveProperty('addMessage');
      expect(result.current).toHaveProperty('setInput');
      expect(result.current).toHaveProperty('setTyping');
      expect(result.current).toHaveProperty('setError');
      expect(result.current).toHaveProperty('clearMessages');
      expect(result.current).toHaveProperty('newChat');
    });
  });

  describe('Convenience Methods', () => {
    describe('setOpen', () => {
      it('updates isOpen state', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        expect(result.current.state.isOpen).toBe(false);

        act(() => {
          result.current.setOpen(true);
        });

        expect(result.current.state.isOpen).toBe(true);

        act(() => {
          result.current.setOpen(false);
        });

        expect(result.current.state.isOpen).toBe(false);
      });
    });

    describe('setWindowSize', () => {
      it('updates window size and saves to storage', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        act(() => {
          result.current.setWindowSize('large');
        });

        expect(result.current.state.windowSize).toBe('large');
        expect(StorageService.set).toHaveBeenCalledWith(STORAGE_KEYS.WINDOW_SIZE, 'large');

        act(() => {
          result.current.setWindowSize('fullscreen');
        });

        expect(result.current.state.windowSize).toBe('fullscreen');
        expect(StorageService.set).toHaveBeenCalledWith(STORAGE_KEYS.WINDOW_SIZE, 'fullscreen');
      });
    });

    describe('addMessage', () => {
      it('adds message to messages array', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        const message: ChatMessage = {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        expect(result.current.state.messages).toHaveLength(1);
        expect(result.current.state.messages[0]).toEqual(message);

        const message2: ChatMessage = {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message2);
        });

        expect(result.current.state.messages).toHaveLength(2);
        expect(result.current.state.messages[1]).toEqual(message2);
      });
    });

    describe('setInput', () => {
      it('updates input state', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        act(() => {
          result.current.setInput('Test input');
        });

        expect(result.current.state.input).toBe('Test input');

        act(() => {
          result.current.setInput('');
        });

        expect(result.current.state.input).toBe('');
      });
    });

    describe('setTyping', () => {
      it('updates typing state', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        act(() => {
          result.current.setTyping(true);
        });

        expect(result.current.state.isTyping).toBe(true);

        act(() => {
          result.current.setTyping(false);
        });

        expect(result.current.state.isTyping).toBe(false);
      });
    });

    describe('setError', () => {
      it('updates error state', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        act(() => {
          result.current.setError('Error message');
        });

        expect(result.current.state.error).toBe('Error message');

        act(() => {
          result.current.setError(null);
        });

        expect(result.current.state.error).toBeNull();
      });
    });

    describe('clearMessages', () => {
      it('clears all messages', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        // Add some messages
        act(() => {
          result.current.addMessage({
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          });
          result.current.addMessage({
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi!',
            timestamp: Date.now(),
          });
        });

        expect(result.current.state.messages).toHaveLength(2);

        act(() => {
          result.current.clearMessages();
        });

        expect(result.current.state.messages).toHaveLength(0);
      });
    });

    describe('newChat', () => {
      it('clears messages and removes active conversation from storage', () => {
        const { result } = renderHook(() => useChatContext(), {
          wrapper: ChatProvider,
        });

        // Add messages and error
        act(() => {
          result.current.addMessage({
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          });
          result.current.setError('Some error');
          result.current.setInput('Some input');
        });

        act(() => {
          result.current.newChat();
        });

        expect(result.current.state.messages).toHaveLength(0);
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.input).toBe('');
        expect(StorageService.remove).toHaveBeenCalledWith(STORAGE_KEYS.ACTIVE_CONVERSATION);
      });
    });
  });

  describe('Memoization', () => {
    it('memoizes context value to prevent unnecessary re-renders', () => {
      let renderCount = 0;
      
      function TestComponent() {
        const context = useChatContext();
        renderCount++;
        return <div>{context.state.input}</div>;
      }

      const { rerender } = render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      );

      expect(renderCount).toBe(1);

      // Re-render without state changes
      rerender(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      );

      // Should not cause additional render
      expect(renderCount).toBe(1);
    });

    it('re-renders when state changes', () => {
      let renderCount = 0;
      
      function TestComponent() {
        const context = useChatContext();
        renderCount++;
        return (
          <div>
            <span>{context.state.input}</span>
            <button onClick={() => context.setInput('new input')}>Update</button>
          </div>
        );
      }

      render(
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      );

      expect(renderCount).toBe(1);

      // Trigger state change
      act(() => {
        screen.getByRole('button').click();
      });

      expect(renderCount).toBe(2);
    });
  });

  describe('Multiple Providers', () => {
    it('allows multiple independent providers', () => {
      const { result: result1 } = renderHook(() => useChatContext(), {
        wrapper: ({ children }) => <ChatProvider>{children}</ChatProvider>,
      });

      const { result: result2 } = renderHook(() => useChatContext(), {
        wrapper: ({ children }) => <ChatProvider>{children}</ChatProvider>,
      });

      // Change state in first provider
      act(() => {
        result1.current.setInput('Provider 1');
      });

      // Should not affect second provider
      expect(result1.current.state.input).toBe('Provider 1');
      expect(result2.current.state.input).toBe('');
    });
  });
});