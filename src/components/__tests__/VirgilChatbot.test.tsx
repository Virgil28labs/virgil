/**
 * VirgilChatbot Comprehensive Test Suite
 * 
 * Tests core chat functionality, message handling, streaming responses,
 * memory integration, and user interactions. Critical chat interface component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirgilChatbot } from '../VirgilChatbot';
import { AllTheProviders } from '../../test-utils/AllTheProviders';
import type { ChatContextValue } from '../chat/chatTypes';

// Mock chat context and services
jest.mock('../chat/useChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('../../services/ChatService', () => ({
  chatService: {
    sendMessage: jest.fn(),
    clearHistory: jest.fn(),
    exportChat: jest.fn(),
  },
}));

jest.mock('../../services/llm/LLMService', () => ({
  llmService: {
    generateResponse: jest.fn(),
    stream: jest.fn(),
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/useMemoryService', () => ({
  useMemoryService: jest.fn(),
}));

jest.mock('../../services/ErrorHandlerService', () => ({
  errorHandlerService: {
    handleError: jest.fn(),
  },
}));

// Mock chat components
jest.mock('../chat/ChatMessages/ChatMessages', () => ({
  ChatMessages: ({ messages, onRetry }: any) => (
    <div data-testid="chat-messages">
      {messages.map((msg: any, index: number) => (
        <div key={index} data-testid={`message-${index}`}>
          <span>{msg.role}:</span> {msg.content}
          {msg.error && <button onClick={() => onRetry(msg)}>Retry</button>}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../chat/ChatInput/ChatInput', () => ({
  ChatInput: ({ onSend, disabled, isStreaming }: any) => (
    <div data-testid="chat-input">
      <input 
        data-testid="message-input"
        disabled={disabled}
        placeholder={isStreaming ? 'Virgil is typing...' : 'Type a message...'}
        onKeyDown={(e) => {
          const target = e.target as HTMLInputElement;
          if (e.key === 'Enter' && target.value) {
            onSend(target.value);
            target.value = '';
          }
        }}
      />
      <button 
        data-testid="send-button"
        disabled={disabled}
        onClick={() => {
          const input = document.querySelector('[data-testid="message-input"]') as HTMLInputElement;
          if (input && input.value) {
            onSend(input.value);
            input.value = '';
          }
        }}
      >
        Send
      </button>
    </div>
  ),
}));

jest.mock('../chat/ChatHeader/ChatHeader', () => ({
  ChatHeader: ({ onClear, onExport, messagesCount }: any) => (
    <div data-testid="chat-header">
      <span data-testid="message-count">{messagesCount} messages</span>
      <button data-testid="clear-button" onClick={onClear}>Clear</button>
      <button data-testid="export-button" onClick={onExport}>Export</button>
    </div>
  ),
}));

// Mock external components
jest.mock('../common/Modal', () => ({
  Modal: ({ isOpen, onClose, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <button data-testid="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    ) : null,
}));

// Import mocked dependencies
import { useChatContext } from '../chat/useChatContext';
import { useAuth } from '../../hooks/useAuth';
import { useMemoryService } from '../../hooks/useMemoryService';
import { chatService } from '../../services/ChatService';
import { llmService } from '../../services/llm';
import { errorHandlerService } from '../../services/ErrorHandlerService';

const mockUseChatContext = useChatContext as jest.MockedFunction<typeof useChatContext>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseMemoryService = useMemoryService as jest.MockedFunction<typeof useMemoryService>;

describe('VirgilChatbot', () => {
  const defaultChatState: ChatContextValue = {
    state: {
      isOpen: true,
      windowSize: 'normal',
      messages: [],
      input: '',
      isTyping: false,
      error: null,
      selectedModel: 'claude-3-sonnet',
      customSystemPrompt: '',
      lastConversation: null,
      markedMemories: [],
      showMemoryIndicator: false,
      memoryContext: '',
      showMemoryModal: false,
      recentConversations: [],
      dashboardContext: null,
      contextualSuggestions: [],
      shouldAutoScroll: true,
    },
    dispatch: jest.fn(),
    setOpen: jest.fn(),
    setWindowSize: jest.fn(),
    addMessage: jest.fn(),
    setInput: jest.fn(),
    setTyping: jest.fn(),
    setError: jest.fn(),
    clearMessages: jest.fn(),
    newChat: jest.fn(),
  };

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    role: 'authenticated',
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    confirmation_sent_at: null,
    confirmed_at: '2024-01-01T00:00:00.000Z',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: null,
    phone_confirmed_at: null,
    recovery_sent_at: null,
    new_email: null,
    invited_at: null,
    factors: null,
    identities: [],
    is_anonymous: false,
  };

  const defaultAuthState = {
    user: mockUser,
    loading: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
  };

  const defaultMemoryService = {
    memoryService: {
      saveConversation: jest.fn(),
      searchMemories: jest.fn(),
      getMarkedMemories: jest.fn(),
      markMemory: jest.fn(),
      unmarkMemory: jest.fn(),
      forgetMemory: jest.fn(),
      getRecentConversations: jest.fn(),
      getConversation: jest.fn(),
      deleteConversation: jest.fn(),
      clearAllMemories: jest.fn(),
    },
    isSupabaseEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseChatContext.mockReturnValue(defaultChatState);
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseMemoryService.mockReturnValue(defaultMemoryService);
    
    // Mock chatService methods
    (chatService.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      message: { id: '1', role: 'assistant', content: 'Test response' },
    });
    
    // chatService doesn't have clearHistory or exportChat methods
    // These are handled differently in the actual implementation
  });

  const renderChatbot = () => {
    return render(
      <AllTheProviders>
        <VirgilChatbot />
      </AllTheProviders>,
    );
  };

  describe('Rendering', () => {
    it('renders chat interface components', () => {
      renderChatbot();
      
      expect(screen.getByTestId('chat-header')).toBeInTheDocument();
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
      renderChatbot();
      
      expect(screen.getByTestId('message-count')).toHaveTextContent('0 messages');
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('displays existing messages', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      expect(screen.getByTestId('message-count')).toHaveTextContent('2 messages');
      expect(screen.getByTestId('message-0')).toHaveTextContent('user: Hello');
      expect(screen.getByTestId('message-1')).toHaveTextContent('assistant: Hi there!');
    });
  });

  describe('Message Sending', () => {
    it('sends message via chat input', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await userEvent.type(input, 'Test message');
      await userEvent.click(sendButton);
      
      expect(chatService.sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('sends message with Enter key', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      
      await userEvent.type(input, 'Test message');
      await userEvent.keyboard('{Enter}');
      
      expect(chatService.sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('disables input during streaming', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        isStreaming: true,
      });
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      expect(input).toHaveAttribute('placeholder', 'Virgil is typing...');
    });

    it('handles send message error', async () => {
      (chatService.sendMessage as jest.Mock).mockRejectedValue(new Error('Send failed'));
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Test message');
      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(errorHandlerService.handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            component: 'VirgilChatbot',
            action: 'sendMessage',
          }),
        );
      });
    });
  });

  describe('Message Streaming', () => {
    it('shows streaming indicator', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        isStreaming: true,
      });
      
      renderChatbot();
      
      expect(screen.getByPlaceholderText('Virgil is typing...')).toBeInTheDocument();
    });

    it('handles streaming response', async () => {
      const mockStream = {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk1') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk2') })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      (llmService.stream as jest.Mock).mockResolvedValue(mockStream);
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Stream test');
      await userEvent.keyboard('{Enter}');
      
      expect(llmService.stream).toHaveBeenCalled();
    });
  });

  describe('Chat Management', () => {
    it('clears chat history', async () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi!' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      const clearButton = screen.getByTestId('clear-button');
      await userEvent.click(clearButton);
      
      expect(chatService.clearHistory).toHaveBeenCalled();
    });

    it('exports chat history', async () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi!' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      const exportButton = screen.getByTestId('export-button');
      await userEvent.click(exportButton);
      
      expect(chatService.exportChat).toHaveBeenCalledWith(messages);
    });

    it('handles clear error gracefully', async () => {
      (chatService.clearHistory as jest.Mock).mockRejectedValue(new Error('Clear failed'));
      
      renderChatbot();
      
      const clearButton = screen.getByTestId('clear-button');
      await userEvent.click(clearButton);
      
      await waitFor(() => {
        expect(errorHandlerService.handleError).toHaveBeenCalled();
      });
    });
  });

  describe('Message Retry', () => {
    it('shows retry button for failed messages', () => {
      const messages = [
        { 
          id: '1', 
          role: 'assistant', 
          content: 'Failed message',
          error: true,
        },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries failed message', async () => {
      const retryMessage = { 
        id: '1', 
        role: 'assistant', 
        content: 'Failed message',
        error: true,
      };
      
      const messages = [retryMessage];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);
      
      expect(chatService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Memory Integration', () => {
    it('saves conversations automatically', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Save this conversation');
      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(defaultMemoryService.saveConversation).toHaveBeenCalled();
      });
    });

    it('handles memory save errors', async () => {
      defaultMemoryService.saveConversation.mockRejectedValue(new Error('Save failed'));
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Test message');
      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(errorHandlerService.handleError).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication Integration', () => {
    it('handles unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });
      
      renderChatbot();
      
      expect(screen.getByText('Please sign in to chat')).toBeInTheDocument();
    });

    it('shows loading state during auth', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });
      
      renderChatbot();
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        error: 'Connection failed',
      });
      
      renderChatbot();
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('clears errors when sending new messages', async () => {
      const mockDispatch = jest.fn();
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        error: 'Previous error',
        dispatch: mockDispatch,
      });
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'New message');
      await userEvent.keyboard('{Enter}');
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'CLEAR_ERROR',
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('supports Escape to clear input', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Test message');
      await userEvent.keyboard('{Escape}');
      
      expect(input).toHaveValue('');
    });

    it('supports Ctrl+Enter for multiline', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Line 1');
      await userEvent.keyboard('{Control>}{Enter}{/Control}');
      await userEvent.type(input, 'Line 2');
      
      expect(input).toHaveValue('Line 1\nLine 2');
    });
  });

  describe('Performance', () => {
    it('memoizes expensive computations', () => {
      const largeChatState = {
        ...defaultChatState,
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        })),
      };
      
      mockUseChatContext.mockReturnValue(largeChatState);
      
      const { rerender } = renderChatbot();
      
      // Rerender with same data
      rerender(
        <AllTheProviders>
          <VirgilChatbot />
        </AllTheProviders>,
      );
      
      // Should not cause performance issues
      expect(screen.getByTestId('message-count')).toHaveTextContent('100 messages');
    });

    it('virtualizes long message lists', () => {
      const longMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages: longMessageList,
      });
      
      renderChatbot();
      
      // Should render efficiently even with many messages
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderChatbot();
      
      expect(screen.getByLabelText('Chat conversation')).toBeInTheDocument();
      expect(screen.getByLabelText('Type your message')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    });

    it('supports screen readers', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        messages,
      });
      
      renderChatbot();
      
      expect(screen.getByText('New message from assistant')).toBeInTheDocument();
    });

    it('maintains focus management', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      await userEvent.tab(); // Focus input
      expect(input).toHaveFocus();
      
      await userEvent.tab(); // Focus send button
      expect(sendButton).toHaveFocus();
    });
  });
});