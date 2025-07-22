import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock all dependencies before importing the component
jest.mock('../lib/requestDeduplication', () => ({
  dedupeFetch: jest.fn(),
}));

jest.mock('../hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({ containerRef: { current: null } }),
}));

jest.mock('../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({ containerRef: { current: null } }),
}));

jest.mock('../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, isTouchDevice: false }),
  useViewport: () => ({ isKeyboardOpen: false }),
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../contexts/LocationContext', () => ({
  useLocation: jest.fn(),
}));

jest.mock('../contexts/WeatherContext', () => ({
  useWeather: jest.fn(),
}));

// Import after mocks
import { VirgilChatbot } from './VirgilChatbot';
import { dedupeFetch } from '../lib/requestDeduplication';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';

// Test data
const mockUser = {
  id: 'test-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  user_metadata: { name: 'Test User' },
} as any;


describe('VirgilChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM methods
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: jest.fn(),
      writable: true,
    });
    
    // Default mock implementations
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      error: null,
    });
    
    (useLocation as jest.Mock).mockReturnValue({
      coordinates: null,
      address: null,
      ipLocation: null,
      loading: false,
      error: null,
      permissionStatus: 'unknown',
      hasLocation: false,
      hasGPSLocation: false,
    });
    
    (useWeather as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      lastFetch: null,
      unit: 'fahrenheit',
    });
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    Storage.prototype.clear = jest.fn();
    
    // Mock dedupeFetch default response
    (dedupeFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: { content: 'Hello! I am Virgil, your helpful assistant.' },
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Chatbot Bubble', () => {
    it('renders closed chatbot bubble by default', () => {
      render(<VirgilChatbot />);
      
      const bubble = screen.getByRole('button', { name: /open chat with virgil/i });
      expect(bubble).toBeInTheDocument();
      expect(bubble).toHaveAttribute('aria-expanded', 'false');
      expect(bubble).toHaveClass('virgil-chatbot-bubble');
    });

    it('opens chatbot when bubble is clicked', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      const bubble = screen.getByRole('button', { name: /open chat with virgil/i });
      await user.click(bubble);
      
      const dialog = screen.getByRole('dialog', { name: /virgil ai assistant/i });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Chatbot Dialog', () => {
    it('renders chatbot dialog with correct structure', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      // Check header elements
      expect(screen.getByText('Virgil')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close chat/i })).toBeInTheDocument();
      
      // Check messages area
      const messagesArea = screen.getByRole('log', { name: /chat messages/i });
      expect(messagesArea).toBeInTheDocument();
      expect(messagesArea).toHaveAttribute('aria-live', 'polite');
      
      // Check input area
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Type your message...');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('displays welcome message for authenticated user', async () => {
      const user = userEvent.setup();
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        session: null,
        loading: false,
        error: null,
      });
      
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByText(/good afternoon, test user/i)).toBeInTheDocument();
    });

    it('displays welcome message for unauthenticated user', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByText(/good afternoon, there/i)).toBeInTheDocument();
    });

    it('closes chatbot when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      const closeButton = screen.getByRole('button', { name: /close chat/i });
      await user.click(closeButton);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('sends message when form is submitted', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Hello Virgil');
      
      const form = input.closest('form')!;
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByText('Hello Virgil')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('Hello! I am Virgil, your helpful assistant.')).toBeInTheDocument();
      });
    });

    it('sends message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Hello Virgil{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Hello Virgil')).toBeInTheDocument();
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, '   ');
      await user.click(sendButton);
      
      expect(dedupeFetch).not.toHaveBeenCalled();
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('shows typing indicator while waiting for response', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response to ensure typing indicator is visible
      (dedupeFetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: { content: 'Hello! I am Virgil, your helpful assistant.' },
          }),
        }), 100)),
      );
      
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Test message{Enter}');
      
      // Wait for the typing indicator to appear
      await waitFor(() => {
        expect(screen.getByText('💭 Thinking...')).toBeInTheDocument();
      });
      
      // Then wait for it to disappear when response arrives
      await waitFor(() => {
        expect(screen.queryByText('💭 Thinking...')).not.toBeInTheDocument();
      }, { timeout: 300 });
    });
  });

  describe('Quick Actions', () => {
    it('displays quick actions when no messages', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByText('Quick help:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tell me about virgil/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /how do i use this app/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search for latest news/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /what can you do/i })).toBeInTheDocument();
    });

    it('sends message when quick action is clicked', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const quickAction = screen.getByRole('button', { name: /tell me about virgil/i });
      await user.click(quickAction);
      
      await waitFor(() => {
        expect(screen.getByText('Tell me about Virgil')).toBeInTheDocument();
      });
    });

    it('hides quick actions after sending first message', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const quickAction = screen.getByRole('button', { name: /tell me about virgil/i });
      await user.click(quickAction);
      
      await waitFor(() => {
        expect(screen.queryByText('Quick help:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Model Selection', () => {
    it('displays current model in dropdown button', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByText('GPT-4o Mini')).toBeInTheDocument();
    });

    it('opens model dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const modelButton = screen.getByText('GPT-4o Mini').closest('button')!;
      await user.click(modelButton);
      
      // Check that dropdown is visible
      const dropdown = document.querySelector('.model-dropdown');
      expect(dropdown).toBeInTheDocument();
      
      // Check for specific options within the dropdown
      const modelOptions = screen.getAllByRole('option');
      expect(modelOptions).toHaveLength(3);
      
      // Check that all models are shown
      expect(screen.getByRole('option', { name: /GPT-4o Mini.*Fast and efficient/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /GPT-4o.*Most capable model/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /GPT-4 Turbo.*Balanced performance/i })).toBeInTheDocument();
    });

    it('changes model when option is selected', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const modelButton = screen.getByText('GPT-4o Mini').closest('button')!;
      await user.click(modelButton);
      
      // Click the specific GPT-4o option (not the mini version)
      const gpt4Options = screen.getAllByText('GPT-4o');
      const gpt4OptionInDropdown = gpt4Options.find(option => 
        option.closest('.model-option') !== null,
      )!;
      await user.click(gpt4OptionInDropdown);
      
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('virgil-selected-model', 'gpt-4o');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const user = userEvent.setup();
      (dedupeFetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Test message{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/having trouble connecting/i)).toBeInTheDocument();
    });

    it('handles non-ok responses gracefully', async () => {
      const user = userEvent.setup();
      (dedupeFetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });
      
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Test message{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      const user = userEvent.setup();
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Virgil AI Assistant');
      expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Chat messages');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Type your message to Virgil');
    });

    it('announces message status changes', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed response to ensure typing indicator is visible
      (dedupeFetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            message: { content: 'Response message' },
          }),
        }), 100)),
      );
      
      render(<VirgilChatbot />);
      
      await user.click(screen.getByRole('button', { name: /open chat/i }));
      
      const input = screen.getByRole('textbox', { name: /Type your message to Virgil/i });
      await user.type(input, 'Test message{Enter}');
      
      // Wait for typing status to appear
      const typingStatus = await screen.findByRole('status');
      expect(typingStatus).toHaveAttribute('aria-label', 'Virgil is typing');
      
      // Wait for response to complete
      await waitFor(() => {
        expect(screen.getByText('Response message')).toBeInTheDocument();
      });
    });
  });

});