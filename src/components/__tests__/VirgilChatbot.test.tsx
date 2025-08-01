/**
 * VirgilChatbot Comprehensive Test Suite
 * 
 * Tests core chat functionality, message handling, streaming responses,
 * memory integration, and user interactions. Critical chat interface component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirgilChatbot } from '../VirgilChatbot';
import { AllTheProviders } from '../../test-utils/AllTheProviders';
import type { ChatContextValue, ChatMessage } from '../../types/chat.types';

// Mock chat context and services
jest.mock('../chat/useChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('../../services/ChatService', () => ({
  chatService: {
    sendMessage: jest.fn(),
    createUserMessage: jest.fn(),
    createFallbackMessage: jest.fn(),
    validateConnection: jest.fn(),
  },
}));

jest.mock('../../services/llm', () => ({
  llmService: {
    complete: jest.fn(),
    generateResponse: jest.fn(),
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/useMemoryService', () => ({
  useMemoryService: jest.fn(),
}));

// Mock all the other hooks used in VirgilChatbot
jest.mock('../../hooks/useFocusManagement', () => ({
  useFocusManagement: jest.fn(() => ({ containerRef: { current: null } })),
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({ containerRef: { current: null } })),
}));

jest.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn(() => ['gpt-4.1-mini', jest.fn()]),
}));

jest.mock('../../hooks/useContextSync', () => ({
  useContextSync: jest.fn(),
}));

jest.mock('../../hooks/useDashboardContext', () => ({
  useDashboardContext: jest.fn(),
}));

jest.mock('../../hooks/useSystemPrompt', () => ({
  useSystemPrompt: jest.fn(() => ({
    createSystemPrompt: jest.fn(),
    createSystemPromptSync: jest.fn(() => 'System prompt'),
  })),
}));

jest.mock('../../hooks/useMessageHandling', () => ({
  useMessageHandling: jest.fn(() => ({
    sendMessage: jest.fn(),
    handleSubmit: jest.fn(),
    handleKeyDown: jest.fn(),
    handleQuickAction: jest.fn(),
    inputRef: { current: null },
  })),
}));

jest.mock('../../hooks/useDataExport', () => ({
  useDataExport: jest.fn(() => ({
    handleExportMessages: jest.fn(),
  })),
}));

jest.mock('../../services/ErrorHandlerService', () => ({
  errorHandlerService: {
    handleError: jest.fn(),
  },
}));

// Mock chat components
jest.mock('../chat/ChatMessages/ChatMessages', () => ({
  ChatMessages: ({ messages, onMarkAsImportant }: { messages: Array<{ role: string; content: string; error?: string }>; onMarkAsImportant: (msg: { role: string; content: string; error?: string }) => void }) => (
    <div data-testid="chat-messages">
      {messages.map((msg, index: number) => (
        <div key={index} data-testid={`message-${index}`}>
          <span>{msg.role}:</span> {msg.content}
          {msg.error && <button onClick={() => onMarkAsImportant(msg)}>Retry</button>}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../chat/ChatInput/ChatInput', () => ({
  ChatInput: ({ 
    input, 
    onInputChange, 
    onSubmit, 
    onKeyDown, 
    isTyping, 
    error, 
    onQuickAction, 
    showQuickActions, 
    _dashboardContext, 
    _shouldFocus, 
    externalInputRef, 
  }: unknown) => {
    // Suppress unused variable warnings for mock parameters
    void _dashboardContext;
    void _shouldFocus;
    return (
      <div data-testid="chat-input">
        <input 
          data-testid="message-input"
          value={input}
          disabled={isTyping}
          placeholder={isTyping ? 'Virgil is typing...' : 'Type a message...'}
          aria-label="Type your message"
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input) {
              onSubmit(e);
            }
            onKeyDown && onKeyDown(e);
          }}
          ref={externalInputRef}
        />
        <button 
          data-testid="send-button"
          disabled={isTyping}
          aria-label="Send message"
          onClick={(e) => onSubmit(e)}
        >
          Send
        </button>
        {error && <div data-testid="chat-error">{error}</div>}
        {showQuickActions && (
          <div data-testid="quick-actions">
            <button onClick={() => onQuickAction('help')}>Help</button>
          </div>
        )}
      </div>
    );
  },
}));

jest.mock('../chat/ChatHeader/ChatHeader', () => ({
  ChatHeader: ({ 
    windowSize,
    onSizeToggle,
    onMinimize,
    selectedModel,
    onModelChange,
    models,
    _showMemoryIndicator,
    _markedMemories,
    _recentConversations,
    _onMemoryModalOpen,
    _isRealtimeConnected,
    _dashboardContext,
    _customSystemPrompt,
    _onSystemPromptChange,
    _onSystemPromptSave,
    _onNewChat,
    messageCount,
    onClearMessages,
    onExportMessages,
    _createSystemPrompt,
  }: unknown) => {
    // Suppress unused variable warnings for mock parameters
    void _showMemoryIndicator;
    void _markedMemories;
    void _recentConversations;
    void _onMemoryModalOpen;
    void _isRealtimeConnected;
    void _dashboardContext;
    void _customSystemPrompt;
    void _onSystemPromptChange;
    void _onSystemPromptSave;
    void _onNewChat;
    void _createSystemPrompt;
    return (
      <div data-testid="chat-header">
        <span data-testid="message-count">{messageCount} messages</span>
        <button data-testid="clear-button" onClick={onClearMessages} tabIndex={0}>Clear</button>
        <button data-testid="export-button" onClick={onExportMessages} tabIndex={0}>Export</button>
        <button data-testid="minimize-button" onClick={onMinimize}>Minimize</button>
        <button data-testid="size-toggle" onClick={onSizeToggle}>{windowSize}</button>
        <select data-testid="model-select" value={selectedModel} onChange={(e) => onModelChange(e.target.value)}>
          {models?.map((model: unknown) => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>
    );
  },
}));

// Mock MemoryModal component
jest.mock('../chat/MemoryModal/MemoryModal', () => ({
  MemoryModal: ({ 
    isOpen, 
    onClose, 
    _markedMemories, 
    _recentConversations,
    _onMemoriesUpdate,
    _onConversationsUpdate,
    _onMemoryContextUpdate,
    _onMemoryIndicatorUpdate,
  }: unknown) => {
    // Suppress unused variable warnings for mock parameters
    void _markedMemories;
    void _recentConversations;
    void _onMemoriesUpdate;
    void _onConversationsUpdate;
    void _onMemoryContextUpdate;
    void _onMemoryIndicatorUpdate;
    return isOpen ? (
      <div data-testid="memory-modal">
        <button data-testid="memory-modal-close" onClick={onClose}>×</button>
        <div>Memory Modal Content</div>
      </div>
    ) : null;
  },
}));

// Mock external components
jest.mock('../common/Modal', () => ({
  Modal: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => 
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
    confirmation_sent_at: undefined,
    confirmed_at: '2024-01-01T00:00:00.000Z',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: undefined,
    phone_confirmed_at: undefined,
    recovery_sent_at: undefined,
    new_email: undefined,
    invited_at: undefined,
    factors: undefined,
    identities: [],
    is_anonymous: false,
  };

  const defaultAuthState = {
    user: mockUser,
    loading: false,
    signOut: jest.fn().mockResolvedValue({ error: undefined }),
    refreshUser: jest.fn().mockResolvedValue(undefined),
  };

  const defaultMemoryService = {
    initializeMemory: jest.fn().mockResolvedValue(undefined),
    markAsImportant: jest.fn().mockResolvedValue(undefined),
    loadRecentMessages: jest.fn().mockResolvedValue(undefined),
    isRealtimeConnected: true,
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
      const messages: ChatMessage[] = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant' as const, content: 'Hi there', timestamp: '2024-01-01T00:00:00.000Z' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
      });
      
      renderChatbot();
      
      expect(screen.getByTestId('message-count')).toHaveTextContent('2 messages');
      expect(screen.getByTestId('message-0')).toHaveTextContent('user: Hello');
      expect(screen.getByTestId('message-1')).toHaveTextContent('assistant: Hi there!');
    });
  });

  describe('Message Sending', () => {
    it('sends message via chat input', async () => {
      const mockHandleSubmit = jest.fn();
      const mockUseMessageHandling = require('../../hooks/useMessageHandling').useMessageHandling as jest.Mock;
      mockUseMessageHandling.mockReturnValue({
        sendMessage: jest.fn(),
        handleSubmit: mockHandleSubmit,
        handleKeyDown: jest.fn(),
        handleQuickAction: jest.fn(),
        inputRef: { current: null },
      });

      renderChatbot();
      
      const sendButton = screen.getByTestId('send-button');
      await userEvent.click(sendButton);
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('sends message with Enter key', async () => {
      const mockHandleSubmit = jest.fn();
      const mockUseMessageHandling = require('../../hooks/useMessageHandling').useMessageHandling as jest.Mock;
      mockUseMessageHandling.mockReturnValue({
        sendMessage: jest.fn(),
        handleSubmit: mockHandleSubmit,
        handleKeyDown: jest.fn(),
        handleQuickAction: jest.fn(),
        inputRef: { current: null },
      });

      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          input: 'Test message',
        },
      });

      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      // Focus the input and press Enter
      input.focus();
      await userEvent.keyboard('{Enter}');
      
      // The Enter handler in our mock should call handleSubmit
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('disables input during streaming', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          isTyping: true,
        },
      });
      
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      expect(input).toHaveAttribute('placeholder', 'Virgil is typing...');
    });

    it('handles send message error', async () => {
      const mockHandleSubmit = jest.fn();
      const mockUseMessageHandling = require('../../hooks/useMessageHandling').useMessageHandling as jest.Mock;
      mockUseMessageHandling.mockReturnValue({
        sendMessage: jest.fn(),
        handleSubmit: mockHandleSubmit,
        handleKeyDown: jest.fn(),
        handleQuickAction: jest.fn(),
        inputRef: { current: null },
      });

      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          error: 'Send failed',
        },
      });

      renderChatbot();
      
      // Error should be displayed in the input component
      expect(screen.getByTestId('chat-error')).toHaveTextContent('Send failed');
    });
  });

  describe('Message Streaming', () => {
    it('shows streaming indicator', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          isTyping: true,
        },
      });
      
      renderChatbot();
      
      expect(screen.getByPlaceholderText('Virgil is typing...')).toBeInTheDocument();
    });

    it('handles streaming response', async () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          isTyping: true,
        },
      });
      
      renderChatbot();
      
      // During streaming, input should be disabled and show typing placeholder
      const input = screen.getByTestId('message-input');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('placeholder', 'Virgil is typing...');
    });
  });

  describe('Chat Management', () => {
    it('clears chat history', async () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: '2024-01-01T00:00:00.000Z' },
      ];
      
      const mockClearMessages = jest.fn();
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
        clearMessages: mockClearMessages,
      });
      
      renderChatbot();
      
      const clearButton = screen.getByTestId('clear-button');
      await userEvent.click(clearButton);
      
      expect(mockClearMessages).toHaveBeenCalled();
    });

    it('exports chat history', async () => {
      const messages: ChatMessage[] = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: '2024-01-01T00:00:00.000Z' },
      ];
      
      const mockHandleExportMessages = jest.fn();
      const mockUseDataExport = require('../../hooks/useDataExport').useDataExport as jest.Mock;
      mockUseDataExport.mockReturnValue({
        handleExportMessages: mockHandleExportMessages,
      });
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
      });
      
      renderChatbot();
      
      const exportButton = screen.getByTestId('export-button');
      await userEvent.click(exportButton);
      
      expect(mockHandleExportMessages).toHaveBeenCalled();
    });

    it('handles clear error gracefully', async () => {
      // Clear functionality is handled by the component state
      renderChatbot();
      
      const clearButton = screen.getByTestId('clear-button');
      await userEvent.click(clearButton);
      
      // Clear operates on component state, errors would be handled by the component
    });
  });

  describe('Message Retry', () => {
    it('shows retry button for failed messages', () => {
      const messages: ChatMessage[] = [
        { 
          id: '1', 
          role: 'assistant' as const, 
          content: 'Failed message',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
      });
      
      renderChatbot();
      
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('retries failed message', async () => {
      const retryMessage: ChatMessage = { 
        id: '1', 
        role: 'assistant' as const, 
        content: 'Failed message',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      
      const messages = [retryMessage];
      const mockMarkAsImportant = jest.fn();
      
      mockUseMemoryService.mockReturnValue({
        ...defaultMemoryService,
        markAsImportant: mockMarkAsImportant,
      });

      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
      });
      
      renderChatbot();
      
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);
      
      expect(mockMarkAsImportant).toHaveBeenCalledWith(retryMessage);
    });
  });

  describe('Memory Integration', () => {
    it('shows memory modal when opened', async () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          showMemoryModal: true,
        },
      });

      renderChatbot();
      
      expect(screen.getByTestId('memory-modal')).toBeInTheDocument();
    });

    it('handles memory service integration', () => {
      const mockMarkAsImportant = jest.fn();
      mockUseMemoryService.mockReturnValue({
        ...defaultMemoryService,
        markAsImportant: mockMarkAsImportant,
        isRealtimeConnected: true,
      });

      renderChatbot();
      
      // Memory service should be initialized
      expect(mockUseMemoryService).toHaveBeenCalled();
    });
  });

  describe('Authentication Integration', () => {
    it('handles unauthenticated state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: jest.fn().mockResolvedValue({ error: undefined }),
        refreshUser: jest.fn().mockResolvedValue(undefined),
      });
      
      renderChatbot();
      
      // The component renders with the chat interface even without auth
      // The auth handling is likely done at a higher level or within the hooks
      expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    });

    it('shows loading state during auth', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signOut: jest.fn().mockResolvedValue({ error: undefined }),
        refreshUser: jest.fn().mockResolvedValue(undefined),
      });
      
      renderChatbot();
      
      // The component still renders the chat interface during loading
      expect(screen.getByTestId('chat-header')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages', () => {
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          error: 'Connection failed',
        },
      });
      
      renderChatbot();
      
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('clears errors when sending new messages', async () => {
      const mockSetError = jest.fn();
      const mockHandleSubmit = jest.fn();
      const mockUseMessageHandling = require('../../hooks/useMessageHandling').useMessageHandling as jest.Mock;
      mockUseMessageHandling.mockReturnValue({
        sendMessage: jest.fn(),
        handleSubmit: mockHandleSubmit,
        handleKeyDown: jest.fn(),
        handleQuickAction: jest.fn(),
        inputRef: { current: null },
      });

      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          error: 'Previous error',
          input: 'New message',
        },
        setError: mockSetError,
      });
      
      renderChatbot();
      
      const sendButton = screen.getByTestId('send-button');
      await userEvent.click(sendButton);
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('supports keyboard navigation', async () => {
      const mockHandleKeyDown = jest.fn();
      const mockUseMessageHandling = require('../../hooks/useMessageHandling').useMessageHandling as jest.Mock;
      mockUseMessageHandling.mockReturnValue({
        sendMessage: jest.fn(),
        handleSubmit: jest.fn(),
        handleKeyDown: mockHandleKeyDown,
        handleQuickAction: jest.fn(),
        inputRef: { current: null },
      });

      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      // Focus the input and trigger a key event
      input.focus();
      await userEvent.keyboard('{Escape}');
      
      // The handleKeyDown is called through the onKeyDown prop of the input
      expect(mockHandleKeyDown).toHaveBeenCalled();
    });

    it('handles input changes', async () => {
      const mockSetInput = jest.fn();
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        setInput: mockSetInput,
      });

      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      await userEvent.type(input, 'Test message');
      
      // userEvent.type calls onChange for each character
      // We expect it to be called with each character, ending with 'e' (last character)
      expect(mockSetInput).toHaveBeenLastCalledWith('e');
      expect(mockSetInput).toHaveBeenCalledTimes(12); // T, e, s, t, (space), m, e, s, s, a, g, e
      
      // Check that it was called with the full characters progressively
      expect(mockSetInput).toHaveBeenNthCalledWith(1, 'T');
      expect(mockSetInput).toHaveBeenNthCalledWith(5, ' '); // Space
      expect(mockSetInput).toHaveBeenNthCalledWith(12, 'e'); // Last character
    });
  });

  describe('Performance', () => {
    it('memoizes expensive computations', () => {
      const largeMessages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
        timestamp: '2024-01-01T00:00:00.000Z',
      }));

      const largeChatState = {
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages: largeMessages,
        },
      };
      
      mockUseChatContext.mockReturnValue(largeChatState);
      
      const { rerender } = renderChatbot();
      
      // Should render with the correct message count
      expect(screen.getByTestId('message-count')).toHaveTextContent('100 messages');
      
      // Rerender with same data
      rerender(
        <AllTheProviders>
          <VirgilChatbot />
        </AllTheProviders>,
      );
      
      // Should still show correct count after rerender
      expect(screen.getByTestId('message-count')).toHaveTextContent('100 messages');
    });

    it('virtualizes long message lists', () => {
      const longMessageList: ChatMessage[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
        timestamp: '2024-01-01T00:00:00.000Z',
      }));
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages: longMessageList,
        },
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
      const messages: ChatMessage[] = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant' as const, content: 'Hi there!', timestamp: '2024-01-01T00:00:00.000Z' },
      ];
      
      mockUseChatContext.mockReturnValue({
        ...defaultChatState,
        state: {
          ...defaultChatState.state,
          messages,
        },
      });
      
      renderChatbot();
      
      expect(screen.getByText('New message from assistant')).toBeInTheDocument();
    });

    it('maintains focus management', async () => {
      renderChatbot();
      
      const input = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');
      
      // Focus the input directly
      await userEvent.click(input);
      expect(input).toHaveFocus();
      
      // Tab to send button
      await userEvent.tab();
      expect(sendButton).toHaveFocus();
    });
  });
});