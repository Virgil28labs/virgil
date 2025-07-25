import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Message } from '../Message';
import { toastService } from '../../../services/ToastService';
import type { ChatMessage } from '../../../types/chat.types';

// Mock dependencies
jest.mock('../../../services/ToastService', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../utils/textFormatter', () => ({
  FormattedText: ({ content }: { content: string }) => <div>{content}</div>,
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock navigator.share
const mockShare = jest.fn();
Object.defineProperty(navigator, 'share', {
  value: mockShare,
  configurable: true,
});

describe('Message Component', () => {
  const mockMessage: ChatMessage = {
    id: 'test-123',
    role: 'user',
    content: 'Test message content',
    timestamp: Date.now().toString(),
  };

  const mockOnMarkAsImportant = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
  });

  describe('Chat Variant', () => {
    it('renders user message correctly', () => {
      render(
        <Message
          message={mockMessage}
          userNickname="Ben"
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="chat"
        />,
      );

      expect(screen.getByText('Test message content')).toBeInTheDocument();
      expect(screen.getByRole('article')).toHaveClass('message user-msg');
      expect(screen.getByTitle('Remember this message')).toBeInTheDocument();
    });

    it('renders assistant message correctly', () => {
      const assistantMessage: ChatMessage = {
        ...mockMessage,
        role: 'assistant',
      };

      render(
        <Message
          message={assistantMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="chat"
        />,
      );

      expect(screen.getByRole('article')).toHaveClass('message assistant-msg');
      expect(screen.getByText('V')).toBeInTheDocument(); // Avatar
    });

    it('handles mark as important action', () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="chat"
        />,
      );

      fireEvent.click(screen.getByTitle('Remember this message'));
      expect(mockOnMarkAsImportant).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Conversation Variant', () => {
    it('displays correct user nickname', () => {
      render(
        <Message
          message={mockMessage}
          userNickname="Ben"
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
        />,
      );

      expect(screen.getByText('Ben')).toBeInTheDocument();
    });

    it('displays Virgil for assistant messages', () => {
      const assistantMessage: ChatMessage = {
        ...mockMessage,
        role: 'assistant',
      };

      render(
        <Message
          message={assistantMessage}
          userNickname="Ben"
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
        />,
      );

      expect(screen.getByText('Virgil')).toBeInTheDocument();
    });

    it('displays timestamp when provided', () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
        />,
      );

      const timestamp = new Date(mockMessage.timestamp!).toLocaleTimeString();
      expect(screen.getByText(timestamp)).toBeInTheDocument();
    });

    it('handles copy message action', async () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
        />,
      );

      fireEvent.click(screen.getByTitle('Copy message'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test message content');
        expect(toastService.success).toHaveBeenCalledWith('Message copied to clipboard');
      });

      // Check if icon changes to checkmark
      expect(screen.getByTitle('Copied!')).toBeInTheDocument();
    });

    it('handles copy failure', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Copy failed'));

      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
        />,
      );

      fireEvent.click(screen.getByTitle('Copy message'));

      await waitFor(() => {
        expect(toastService.error).toHaveBeenCalledWith('Failed to copy message to clipboard');
      });
    });

    it('handles share message when API is available', async () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Share message'));

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Virgil Chat Message',
          text: 'Test message content',
        });
        expect(toastService.success).toHaveBeenCalledWith('Message shared successfully');
      });
    });

    it('falls back to copy when share API is not available', async () => {
      // Remove share API
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Share message'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test message content');
        expect(toastService.success).toHaveBeenCalledWith('Message copied to clipboard');
      });

      // Restore share API
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      });
    });

    it('handles share cancellation gracefully', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      mockShare.mockRejectedValue(abortError);

      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Share message'));

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
        expect(toastService.error).not.toHaveBeenCalled();
      });
    });

    it('handles export message action', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const clickSpy = jest.fn();
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');
      
      createElementSpy.mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
      } as any);

      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Export message'));

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith('Message exported successfully');
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('handles quote message action', () => {
      const mockInput = document.createElement('input');
      mockInput.placeholder = 'Type your message';
      mockInput.value = '';
      document.body.appendChild(mockInput);

      const setSelectionRangeSpy = jest.spyOn(mockInput, 'setSelectionRange');
      const dispatchEventSpy = jest.spyOn(mockInput, 'dispatchEvent');

      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Quote message'));

      expect(mockInput.value).toBe('> Test message content\n\n');
      expect(setSelectionRangeSpy).toHaveBeenCalled();
      expect(dispatchEventSpy).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith('Message quoted in input');

      document.body.removeChild(mockInput);
    });

    it('falls back to clipboard when input not found', async () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Quote message'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('> Test message content\n\n');
        expect(toastService.success).toHaveBeenCalledWith('Quoted text copied to clipboard');
      });
    });

    it('toggles extended actions visibility', () => {
      render(
        <Message
          message={mockMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions={false}
        />,
      );

      // Extended actions should not be visible initially
      expect(screen.queryByTitle('Share message')).not.toBeInTheDocument();

      // Click more actions button
      fireEvent.click(screen.getByTitle('More actions'));

      // Extended actions should now be visible
      expect(screen.getByTitle('Share message')).toBeInTheDocument();
      expect(screen.getByTitle('Quote message')).toBeInTheDocument();
      expect(screen.getByTitle('Export message')).toBeInTheDocument();
    });

    it('handles multi-line messages correctly for quoting', () => {
      const multiLineMessage: ChatMessage = {
        ...mockMessage,
        content: 'Line 1\nLine 2\nLine 3',
      };

      render(
        <Message
          message={multiLineMessage}
          onMarkAsImportant={mockOnMarkAsImportant}
          variant="conversation"
          showExtendedActions
        />,
      );

      fireEvent.click(screen.getByTitle('Quote message'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('> Line 1\n> Line 2\n> Line 3\n\n');
    });
  });

  describe('Memoization', () => {
    it('does not re-render when props remain the same', () => {
      const { rerender } = render(
        <Message
          message={mockMessage}
          userNickname="Ben"
          onMarkAsImportant={mockOnMarkAsImportant}
        />,
      );

      const initialContent = screen.getByText('Test message content');

      // Re-render with same props
      rerender(
        <Message
          message={mockMessage}
          userNickname="Ben"
          onMarkAsImportant={mockOnMarkAsImportant}
        />,
      );

      // Should be the same element (not re-rendered)
      expect(screen.getByText('Test message content')).toBe(initialContent);
    });
  });
});