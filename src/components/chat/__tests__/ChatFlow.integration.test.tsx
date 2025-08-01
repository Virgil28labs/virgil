/**
 * Chat Flow Integration Tests
 * 
 * Tests the complete chat flow integration including context synchronization,
 * memory integration, real-time updates, and cross-component communication.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllTheProviders } from '../../../test-utils/AllTheProviders';
import { ChatProvider } from '../ChatContext';
import { ChatMessages } from '../ChatMessages/ChatMessages';
import { ChatInput } from '../ChatInput/ChatInput';
import { ChatHeader } from '../ChatHeader/ChatHeader';
import { MemoryModal } from '../MemoryModal/MemoryModal';

// Mock all services
jest.mock('../../../services/MemoryService', () => ({
  MemoryService: jest.fn(() => ({
    init: jest.fn<any, any>().mockResolvedValue(undefined),
    getContextForPrompt: jest.fn<any, any>().mockResolvedValue('Memory context: Previous conversation about weather and tasks'),
    markAsImportant: jest.fn<any, any>().mockResolvedValue(undefined),
    getRecentMessages: jest.fn<any, any>().mockResolvedValue([
      {
        id: 'prev-1',
        role: 'user',
        content: 'What\'s the weather like?',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: 'prev-2',
        role: 'assistant',
        content: 'It\'s currently 22°C and sunny in San Francisco.',
        timestamp: new Date(Date.now() - 299000).toISOString(),
      },
    ]),
    saveConversation: jest.fn<any, any>().mockResolvedValue(undefined),
    getMarkedMemories: jest.fn<any, any>().mockResolvedValue([
      {
        id: 'mem-1',
        content: 'User prefers morning weather updates',
        context: 'Weather preferences',
        timestamp: Date.now() - 86400000,
        tag: 'preferences',
      },
    ]),
    searchConversations: jest.fn<any, any>().mockResolvedValue([]),
  })),
}));

jest.mock('../../../services/SupabaseMemoryService', () => ({
  supabaseMemoryService: {
    isConnected: jest.fn(() => true),
    connect: jest.fn<any, any>().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    storeVector: jest.fn<any, any>().mockResolvedValue(undefined),
    searchSimilar: jest.fn<any, any>().mockResolvedValue([
      {
        content: 'Similar conversation about weather preferences',
        similarity: 0.85,
        timestamp: Date.now() - 172800000,
      },
    ]),
    getConnectionStatus: jest.fn(() => ({ 
      connected: true, 
      lastSync: Date.now() - 1000,
      pendingOperations: 0,
    })),
  },
}));

jest.mock('../../../services/DashboardContextService', () => ({
  dashboardContextService: {
    getContext: jest.fn(() => ({
      currentTime: '2:30 PM',
      currentDate: 'January 15, 2025',
      timeOfDay: 'afternoon',
      dayOfWeek: 'Wednesday',
      location: {
        hasGPS: true,
        city: 'San Francisco',
        region: 'California',
        country: 'US',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        timezone: 'America/Los_Angeles',
      },
      weather: {
        hasData: true,
        temperature: 22,
        condition: 'Clear',
        description: 'clear sky',
        humidity: 65,
        windSpeed: 5,
        unit: 'celsius',
      },
      user: {
        isAuthenticated: true,
        name: 'Test User',
        email: 'test@example.com',
        memberSince: '2024-01-01',
      },
      device: {
        hasData: true,
        os: 'macOS',
        browser: 'Chrome',
        device: 'Desktop',
        screen: '1920x1080',
        online: true,
        networkType: 'wifi',
      },
      activity: {
        activeComponents: ['weather', 'notes'],
        recentActions: ['check_weather', 'open_notes'],
        timeSpentInSession: 1800,
        lastInteraction: Date.now() - 30000,
      },
      environment: {
        isOnline: true,
        deviceType: 'desktop',
        prefersDarkMode: false,
        language: 'en-US',
      },
      apps: {
        apps: new Map([
          ['weather', { temperature: 22, condition: 'clear' }],
          ['notes', { count: 5, lastNote: 'Team meeting at 3pm' }],
          ['pomodoro', { isActive: true, remainingTime: 1200 }],
        ]),
        activeApps: ['weather', 'notes', 'pomodoro'],
        lastUpdated: Date.now(),
      },
    })),
    subscribe: jest.fn(() => jest.fn()),
    logActivity: jest.fn(),
  },
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock streaming response
const createMockStreamingResponse = (chunks: string[]) => {
  let chunkIndex = 0;
  
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () => {
          if (chunkIndex < chunks.length) {
            const chunk = chunks[chunkIndex++];
            return Promise.resolve({
              done: false,
              value: new TextEncoder().encode(chunk),
            });
          } else {
            return Promise.resolve({ done: true, value: undefined });
          }
        },
      }),
    },
  };
};

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful streaming response
    mockFetch.mockResolvedValue(createMockStreamingResponse([
      'data: {"content": "I can see you\'re in San Francisco where it\'s currently 22°C and clear. "}\n\n',
      'data: {"content": "Based on your recent notes about the team meeting at 3pm, "}\n\n',
      'data: {"content": "and your active pomodoro session, it looks like you\'re having a productive afternoon!"}\n\n',
      'data: [DONE]\n\n',
    ]));
  });

  const mockChatHeaderProps = {
    windowSize: 'normal' as const,
    onSizeToggle: jest.fn(),
    onMinimize: jest.fn(),
    selectedModel: 'gpt-4.1-mini',
    onModelChange: jest.fn(),
    models: [{ id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast model' }],
    showMemoryIndicator: false,
    markedMemories: [],
    recentConversations: [],
    onMemoryModalOpen: jest.fn(),
    dashboardContext: null,
    customSystemPrompt: '',
    onSystemPromptChange: jest.fn(),
    onSystemPromptSave: jest.fn(),
    onNewChat: jest.fn(),
    messageCount: 0,
    isRealtimeConnected: true,
    onClearMessages: jest.fn(),
    onExportMessages: jest.fn(),
    createSystemPrompt: jest.fn(() => 'System prompt'),
  };

  const mockChatMessagesProps = {
    messages: [],
    error: null,
    onErrorDismiss: jest.fn(),
    onMarkAsImportant: jest.fn(),
    user: null,
    lastConversation: null,
    isTyping: false,
  };

  const mockChatInputProps = {
    input: '',
    onInputChange: jest.fn(),
    onSubmit: jest.fn(),
    onKeyDown: jest.fn(),
    isTyping: false,
    error: null,
    onQuickAction: jest.fn(),
    showQuickActions: false,
    dashboardContext: null,
    shouldFocus: false,
  };

  const mockMemoryModalProps = {
    isOpen: false,
    onClose: jest.fn(),
    markedMemories: [],
    recentConversations: [],
    onMemoriesUpdate: jest.fn(),
    onConversationsUpdate: jest.fn(),
    onMemoryContextUpdate: jest.fn(),
    onMemoryIndicatorUpdate: jest.fn(),
  };

  const renderChatFlow = () => {
    return render(
      <AllTheProviders>
        <ChatProvider>
          <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <ChatHeader {...mockChatHeaderProps} />
            <ChatMessages {...mockChatMessagesProps} />
            <ChatInput {...mockChatInputProps} />
            <MemoryModal {...mockMemoryModalProps} />
          </div>
        </ChatProvider>
      </AllTheProviders>,
    );
  };

  describe('Complete Chat Flow', () => {
    it('handles complete conversation flow with context integration', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      // Find chat input and submit a message
      const input = screen.getByPlaceholderText(/ask me anything/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'How is my day going so far?');
      await user.click(sendButton);

      // Should show user message immediately
      await waitFor(() => {
        expect(screen.getByText('How is my day going so far?')).toBeInTheDocument();
      });

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText(/typing/i)).toBeInTheDocument();
      });

      // Should call API with context
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('How is my day going so far?'),
      }));

      // Verify system prompt includes context
      const apiCall = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(apiCall.body);
      expect(requestBody.messages[0].content).toContain('San Francisco');
      expect(requestBody.messages[0].content).toContain('22°C');
      expect(requestBody.messages[0].content).toContain('team meeting at 3pm');
      expect(requestBody.messages[0].content).toContain('pomodoro session');

      // Should display streamed response
      await waitFor(() => {
        expect(screen.getByText(/San Francisco where it's currently 22°C/)).toBeInTheDocument();
        expect(screen.getByText(/team meeting at 3pm/)).toBeInTheDocument();
        expect(screen.getByText(/productive afternoon/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should clear input
      expect(input).toHaveValue('');

      // Should remove typing indicator
      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });

    it('integrates memory context in conversations', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      
      await user.type(input, 'Remember my weather preferences for next time');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Remember my weather preferences for next time')).toBeInTheDocument();
      });

      // Should include memory context in API call
      const apiCall = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(apiCall.body);
      expect(requestBody.messages[0].content).toContain('Memory context: Previous conversation about weather');
      expect(requestBody.messages[0].content).toContain('User prefers morning weather updates');
    });

    it('handles real-time context updates during conversation', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      // Start a conversation
      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'What should I focus on right now?');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Simulate context update while conversation is in progress
      const dashboardContextService = require('../../../services/DashboardContextService').dashboardContextService;
      const contextUpdateCallback = dashboardContextService.subscribe.mock.calls[0][0];
      
      act(() => {
        contextUpdateCallback({
          currentTime: '2:45 PM',
          apps: {
            apps: new Map([
              ['pomodoro', { isActive: false, justCompleted: true, nextBreak: '2:50 PM' }],
              ['notes', { count: 6, lastNote: 'Call client about project update' }],
            ]),
            activeApps: ['notes'],
            lastUpdated: Date.now(),
          },
          activity: {
            activeComponents: ['notes'],
            recentActions: ['complete_pomodoro', 'add_note'],
            timeSpentInSession: 2100,
            lastInteraction: Date.now(),
          },
        });
      });

      // Next message should include updated context
      await user.clear(input);
      await user.type(input, 'What changed since we last talked?');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const secondApiCall = mockFetch.mock.calls[1][1];
        const requestBody = JSON.parse(secondApiCall.body);
        expect(requestBody.messages[0].content).toContain('justCompleted: true');
        expect(requestBody.messages[0].content).toContain('Call client about project update');
      });
    });
  });

  describe('Memory Integration', () => {
    it('allows marking messages as important with full context', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      // Send a message first
      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'I need to remember to call my doctor tomorrow at 2pm');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/call my doctor tomorrow at 2pm/)).toBeInTheDocument();
      });

      // Find and click the memory button (bookmark icon)
      const memoryButton = screen.getByRole('button', { name: /mark as important/i });
      await user.click(memoryButton);

      // Should open memory modal
      await waitFor(() => {
        expect(screen.getByText(/mark as important memory/i)).toBeInTheDocument();
      });

      // Add context and save
      const contextInput = screen.getByPlaceholderText(/add context/i);
      await user.type(contextInput, 'Medical appointment reminder');
      
      const saveButton = screen.getByRole('button', { name: /save memory/i });
      await user.click(saveButton);

      // Should call memory service with correct data
      const memoryService = require('../../../services/MemoryService').MemoryService;
      const mockInstance = memoryService.mock.results[0].value;
      expect(mockInstance.markAsImportant).toHaveBeenCalledWith(
        expect.any(String), // message ID
        'I need to remember to call my doctor tomorrow at 2pm',
        'Medical appointment reminder',
        undefined, // no tag specified
      );
    });

    it('searches and displays memory in conversations', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      // Open memory modal
      const memoryButton = screen.getByRole('button', { name: /open memory/i });
      await user.click(memoryButton);

      await waitFor(() => {
        expect(screen.getByText(/search memories/i)).toBeInTheDocument();
      });

      // Search for specific memory
      const searchInput = screen.getByPlaceholderText(/search memories/i);
      await user.type(searchInput, 'weather');

      await waitFor(() => {
        expect(screen.getByText(/User prefers morning weather updates/)).toBeInTheDocument();
      });

      // Should show similar conversations
      expect(screen.getByText(/Similar conversation about weather preferences/)).toBeInTheDocument();
    });

    it('integrates vector search in conversation flow', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'What did we discuss about weather before?');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should include vector search results in context
      const apiCall = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(apiCall.body);
      expect(requestBody.messages[0].content).toContain('Similar conversation about weather preferences');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'This will fail');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('This will fail')).toBeInTheDocument();
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
      });

      // Should stop typing indicator
      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });

    it('recovers from memory service errors', async () => {
      const memoryService = require('../../../services/MemoryService').MemoryService;
      const mockInstance = memoryService.mock.results[0].value;
      mockInstance.getContextForPrompt.mockRejectedValueOnce(new Error('Memory service error'));

      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Continue without memory context');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should still send message without memory context
      await waitFor(() => {
        expect(screen.getByText('Continue without memory context')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles streaming interruptions', async () => {
      // Mock a streaming response that fails midway
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"content": "Starting response..."}\n\n'),
              })
              .mockRejectedValueOnce(new Error('Stream interrupted')),
          }),
        },
      });

      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'This stream will be interrupted');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should show partial response and error
      await waitFor(() => {
        expect(screen.getByText(/starting response/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/stream.*interrupted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('handles rapid message sending efficiently', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages rapidly
      const messages = ['First message', 'Second message', 'Third message'];
      
      for (let i = 0; i < messages.length; i++) {
        await user.clear(input);
        await user.type(input, messages[i]);
        await user.click(sendButton);
        
        // Small delay to simulate rapid but not instantaneous sending
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // All messages should be displayed
      await waitFor(() => {
        messages.forEach(message => {
          expect(screen.getByText(message)).toBeInTheDocument();
        });
      });

      // Should have made 3 API calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('optimizes context updates to prevent excessive re-renders', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      const dashboardContextService = require('../../../services/DashboardContextService').dashboardContextService;
      const contextUpdateCallback = dashboardContextService.subscribe.mock.calls[0][0];

      // Simulate rapid context updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          contextUpdateCallback({
            currentTime: `2:${30 + i} PM`,
            apps: {
              apps: new Map([['notes', { count: 5 + i }]]),
              activeApps: ['notes'],
              lastUpdated: Date.now() + i,
            },
          });
        });
      }

      // Should still be responsive
      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message after rapid updates');
      
      expect(input).toHaveValue('Test message after rapid updates');

      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should process normally
      await waitFor(() => {
        expect(screen.getByText('Test message after rapid updates')).toBeInTheDocument();
      });
    });

    it('manages memory efficiently with long conversations', async () => {
      const user = userEvent.setup();
      
      // Start with existing conversation history
      // Large message history for performance testing

      renderChatFlow();

      // Should render without performance issues
      await waitFor(() => {
        expect(screen.getByText('Message 99 content')).toBeInTheDocument();
      });

      // Add another message
      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'New message in long conversation');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('New message in long conversation')).toBeInTheDocument();
      });

      // Should still be responsive
      expect(input).toHaveValue('');
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper keyboard navigation through chat interface', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      // Should be able to focus on input with Tab
      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText(/ask me anything/i));

      // Should be able to reach send button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /send/i }));

      // Should be able to reach other controls
      await user.tab();
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });

    it('provides screen reader appropriate content', async () => {
      renderChatFlow();

      // Chat input should have proper labels
      const input = screen.getByPlaceholderText(/ask me anything/i);
      expect(input).toHaveAttribute('aria-label', expect.stringContaining('message'));

      // Send button should be labeled
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();

      // Messages should have proper structure
      // (This would need actual messages to test properly)
    });

    it('handles focus management during conversations', async () => {
      const user = userEvent.setup();
      renderChatFlow();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      
      // Focus should be on input initially
      input.focus();
      expect(document.activeElement).toBe(input);

      // Send a message
      await user.type(input, 'Test focus management');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Verify message appears
      await waitFor(() => {
        expect(screen.getByText('Test focus management')).toBeInTheDocument();
      });

      // Focus should return to input after sending
      expect(document.activeElement).toBe(input);
    });
  });
});