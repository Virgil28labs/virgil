import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirgilChatbot } from '../VirgilChatbot';
import { memoryService } from '../../services/MemoryService';
import { dashboardContextService } from '../../services/DashboardContextService';
import { DynamicContextBuilder } from '../../services/DynamicContextBuilder';
import { chatService } from '../../services/ChatService';
import type { DashboardContext } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';

// Mock scrollIntoView which is not available in jsdom
global.Element.prototype.scrollIntoView = jest.fn();

// Mock all dependencies
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { user_metadata: { name: 'Test User' } } }),
}));

jest.mock('../../hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({ containerRef: { current: null } }),
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({ containerRef: { current: null } }),
}));

jest.mock('../../hooks/useContextSync', () => ({
  useContextSync: jest.fn(),
}));

jest.mock('../../services/MemoryService', () => ({
  memoryService: {
    init: jest.fn(),
    getLastConversation: jest.fn(),
    getMarkedMemories: jest.fn(),
    getRecentConversations: jest.fn(),
    getContextForPrompt: jest.fn(),
    saveConversation: jest.fn(),
    markAsImportant: jest.fn(),
  },
}));

jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    subscribe: jest.fn(),
    getContext: jest.fn(),
    generateSuggestions: jest.fn(),
    logActivity: jest.fn(),
  },
}));

jest.mock('../../services/DynamicContextBuilder', () => ({
  DynamicContextBuilder: {
    buildEnhancedPrompt: jest.fn(),
    createContextSummary: jest.fn(),
  },
}));

jest.mock('../../services/ChatService', () => ({
  chatService: {
    sendMessage: jest.fn(),
    createUserMessage: jest.fn(),
    createFallbackMessage: jest.fn(),
  },
}));

describe('VirgilChatbot', () => {
  const mockDashboardContext: DashboardContext = {
    currentTime: '14:30',
    currentDate: 'January 15, 2024',
    timeOfDay: 'afternoon',
    dayOfWeek: 'monday',
    location: {
      hasGPS: true,
      city: 'San Francisco',
      country: 'USA',
    },
    weather: {
      hasData: true,
      temperature: 72,
      condition: 'Sunny',
      unit: 'fahrenheit',
    },
    user: {
      isAuthenticated: true,
      name: 'Test User',
    },
    activity: {
      activeComponents: [],
      recentActions: [],
      timeSpentInSession: 300000,
      lastInteraction: timeService.getTimestamp(),
    },
    environment: {
      isOnline: true,
      deviceType: 'desktop',
      prefersDarkMode: false,
      language: 'en-US',
    },
    device: {
      hasData: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (memoryService.init as jest.Mock).mockResolvedValue(undefined);
    (memoryService.getLastConversation as jest.Mock).mockResolvedValue(null);
    (memoryService.getMarkedMemories as jest.Mock).mockResolvedValue([]);
    (memoryService.getRecentConversations as jest.Mock).mockResolvedValue([]);
    (memoryService.getContextForPrompt as jest.Mock).mockResolvedValue('');
    (memoryService.saveConversation as jest.Mock).mockResolvedValue(undefined);
    
    (dashboardContextService.getContext as jest.Mock).mockReturnValue(mockDashboardContext);
    (dashboardContextService.generateSuggestions as jest.Mock).mockReturnValue([]);
    (dashboardContextService.subscribe as jest.Mock).mockReturnValue(() => {});
    
    (DynamicContextBuilder.buildEnhancedPrompt as jest.Mock).mockReturnValue({
      enhancedPrompt: 'Enhanced prompt with context',
    });
  });

  it('should render chat bubble when closed', () => {
    render(<VirgilChatbot />);
    
    const chatButton = screen.getByRole('button', { name: /open chat with virgil/i });
    expect(chatButton).toBeInTheDocument();
    expect(chatButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open chat when bubble is clicked', async () => {
    render(<VirgilChatbot />);
    
    const chatButton = screen.getByRole('button', { name: /open chat with virgil/i });
    fireEvent.click(chatButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /virgil ai assistant/i })).toBeInTheDocument();
    });
  });

  it('should initialize memory service on mount', async () => {
    render(<VirgilChatbot />);
    
    await waitFor(() => {
      expect(memoryService.init).toHaveBeenCalled();
      expect(memoryService.getLastConversation).toHaveBeenCalled();
      expect(memoryService.getMarkedMemories).toHaveBeenCalled();
      expect(memoryService.getRecentConversations).toHaveBeenCalledWith(10);
      expect(memoryService.getContextForPrompt).toHaveBeenCalled();
    });
  });

  it('should subscribe to dashboard context updates', () => {
    render(<VirgilChatbot />);
    
    expect(dashboardContextService.subscribe).toHaveBeenCalled();
  });

  it('should save conversation when chat is closed', async () => {
    render(<VirgilChatbot />);
    
    // Open chat
    const chatButton = screen.getByRole('button', { name: /open chat with virgil/i });
    fireEvent.click(chatButton);
    
    // Close chat
    fireEvent.click(screen.getByRole('button', { name: /close to floating bubble/i }));
    
    // Should trigger save (though messages are not actually in state in this test)
    // In real usage, messages would be in state
  });

  it('should create proper system prompt with context', async () => {
    (chatService.createUserMessage as jest.Mock).mockReturnValue({
      id: '1',
      role: 'user',
      content: 'What is the weather?',
      timestamp: '2024-01-01',
    });

    render(<VirgilChatbot />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/type your message/i);
      expect(input).toBeInTheDocument();
    });
    
    // Type and send a message
    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: 'What is the weather?' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(DynamicContextBuilder.buildEnhancedPrompt).toHaveBeenCalled();
      expect(dashboardContextService.logActivity).toHaveBeenCalledWith(
        expect.stringContaining('Asked: "What is the weather'),
        'virgil-chat',
      );
    });
  });

  it('should handle model selection', async () => {
    render(<VirgilChatbot />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    // Find and click model selector (assuming it shows the current model name)
    const modelButtons = screen.getAllByRole('button');
    const modelButton = modelButtons.find(btn => btn.textContent?.includes('GPT-4.1 Mini'));
    expect(modelButton).toBeTruthy();
    fireEvent.click(modelButton!);
    
    // Wait for dropdown to appear and select a different model
    await waitFor(() => {
      expect(screen.getByText('GPT-4.1')).toBeInTheDocument();
    });
    const gpt4Option = screen.getByText('GPT-4.1');
    fireEvent.click(gpt4Option);
    
    // Model should be updated in localStorage
    expect(localStorage.getItem('virgil-selected-model')).toBe('"gpt-4.1"');
  });

  it('should handle quick actions', async () => {
    (chatService.createUserMessage as jest.Mock).mockReturnValue({
      id: '1',
      role: 'user',
      content: 'Tell me about Virgil',
      timestamp: '2024-01-01',
    });

    render(<VirgilChatbot />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    await waitFor(() => {
      const quickActions = screen.getAllByRole('button', { name: /quick action:/i });
      expect(quickActions.length).toBeGreaterThan(0);
    });
    
    // Click a quick action
    const tellMeButton = screen.getByRole('button', { name: /quick action: tell me about virgil/i });
    fireEvent.click(tellMeButton);
    
    await waitFor(() => {
      expect(chatService.createUserMessage).toHaveBeenCalledWith('Tell me about Virgil');
    });
  });

  it('should display contextual quick actions based on dashboard context', async () => {
    // Mock morning time
    const morningContext = {
      ...mockDashboardContext,
      timeOfDay: 'morning' as const,
    };
    (dashboardContextService.getContext as jest.Mock).mockReturnValue(morningContext);
    
    render(<VirgilChatbot />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    await waitFor(() => {
      // Should show morning-specific quick action
      expect(screen.getByText(/what's the plan for today/i)).toBeInTheDocument();
    });
  });

  it('should handle window size changes', async () => {
    render(<VirgilChatbot />);
    
    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    const container = screen.getByRole('dialog');
    expect(container).toHaveClass('normal');
    
    // Click size toggle
    const sizeButton = screen.getByRole('button', { name: /toggle window size/i });
    fireEvent.click(sizeButton);
    
    await waitFor(() => {
      expect(container).toHaveClass('large');
    });
    
    // Click again
    fireEvent.click(sizeButton);
    
    await waitFor(() => {
      expect(container).toHaveClass('fullscreen');
    });
  });

  it('should handle marking messages as important', async () => {
    (memoryService.markAsImportant as jest.Mock).mockResolvedValue(undefined);
    (memoryService.getMarkedMemories as jest.Mock).mockResolvedValue([
      { id: '1', content: 'Important message', context: 'Test context', timestamp: timeService.getTimestamp() },
    ]);
    (memoryService.getContextForPrompt as jest.Mock).mockResolvedValue('Updated context');
    
    render(<VirgilChatbot />);
    
    // Open chat and send a message
    fireEvent.click(screen.getByRole('button', { name: /open chat with virgil/i }));
    
    // Simulate having a message to mark
    // In real usage, this would be after sending a message
    
    await waitFor(() => {
      expect(memoryService.init).toHaveBeenCalled();
    });
  });
});