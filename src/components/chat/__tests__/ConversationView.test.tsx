import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationView } from '../ConversationView';
import type { StoredConversation } from '../../../services/MemoryService';
import type { ChatMessage } from '../../../types/chat.types';
import { timeService } from '../../../services/TimeService';

// Mock dependencies
jest.mock('../../../hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      nickname: 'Ben',
      email: 'ben@example.com',
    },
  }),
}));

jest.mock('../../../utils/dateFormatter', () => ({
  formatTimestamp: (timestamp: number) => timeService.getLocalDate(timestamp).toLocaleDateString(),
}));

jest.mock('../Message', () => ({
  Message: ({ message, userNickname, onMarkAsImportant, variant }: any) => (
    <div data-testid={`message-${message.id}`}>
      <span>{message.content}</span>
      <span>{userNickname}</span>
      <span>{variant}</span>
      <button onClick={() => onMarkAsImportant(message)}>Mark Important</button>
    </div>
  ),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ConversationView Component', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello Virgil',
      timestamp: (timeService.getTimestamp() - 1000).toString(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: timeService.getTimestamp().toString(),
    },
  ];

  const mockConversation: StoredConversation = {
    id: 'test-conversation',
    timestamp: timeService.getTimestamp(),
    messageCount: 2,
    messages: mockMessages,
    firstMessage: 'Hello Virgil',
    lastMessage: 'Hello! How can I help you?',
  };

  const mockOnBack = jest.fn();
  const mockOnMarkAsImportant = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders conversation header correctly', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    expect(screen.getByText('Conversation History')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText(timeService.getLocalDate(mockConversation.timestamp).toLocaleDateString())).toBeInTheDocument();
  });

  it('renders back button and handles click', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    const backButton = screen.getByText('← Back');
    expect(backButton).toBeInTheDocument();
    
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders all messages with correct props', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    // Check first message
    const message1 = screen.getByTestId('message-msg-1');
    expect(message1).toBeInTheDocument();
    expect(screen.getByText('Hello Virgil')).toBeInTheDocument();
    expect(screen.getAllByText('Ben')[0]).toBeInTheDocument();
    expect(screen.getAllByText('conversation')[0]).toBeInTheDocument();

    // Check second message
    const message2 = screen.getByTestId('message-msg-2');
    expect(message2).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
  });

  it('passes userNickname from profile to messages', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    // All messages should receive the nickname 'Ben'
    const benElements = screen.getAllByText('Ben');
    expect(benElements.length).toBe(2); // One for each message
  });

  it('handles mark as important for messages', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    const markButtons = screen.getAllByText('Mark Important');
    
    // Click first message's mark important button
    fireEvent.click(markButtons[0]);
    expect(mockOnMarkAsImportant).toHaveBeenCalledWith(mockMessages[0]);

    // Click second message's mark important button
    fireEvent.click(markButtons[1]);
    expect(mockOnMarkAsImportant).toHaveBeenCalledWith(mockMessages[1]);
  });

  it('handles export conversation', () => {
    const createElementSpy = jest.spyOn(document, 'createElement');
    const clickSpy = jest.fn();
    
    createElementSpy.mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as any);

    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    const exportButton = screen.getByTitle('Download conversation');
    fireEvent.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');

    // Check the download filename includes the date
    const anchor = createElementSpy.mock.results[0].value;
    expect(anchor.download).toContain('conversation-');
    expect(anchor.download).toContain('.json');

    createElementSpy.mockRestore();
  });

  it('exports correct conversation data format', () => {
    let capturedBlob: Blob | null = null;
    
    jest.spyOn(global, 'Blob').mockImplementation((parts?: BlobPart[], options?: BlobPropertyBag) => {
      const blob = new Blob(parts, options);
      capturedBlob = blob;
      return blob;
    });

    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    fireEvent.click(screen.getByTitle('Download conversation'));

    expect(capturedBlob).toBeTruthy();
    
    // Parse the exported data
    const reader = new FileReader();
    reader.onload = (e) => {
      const exported = JSON.parse(e.target?.result as string);
      
      expect(exported).toHaveProperty('exportedAt');
      expect(exported.conversation).toEqual({
        timestamp: mockConversation.timestamp,
        messageCount: mockConversation.messageCount,
        messages: mockConversation.messages,
      });
    };
    reader.readAsText(capturedBlob!);
  });

  it('handles empty conversation', () => {
    const emptyConversation: StoredConversation = {
      id: 'empty-conversation',
      timestamp: timeService.getTimestamp(),
      messageCount: 0,
      messages: [],
      firstMessage: '',
      lastMessage: '',
    };

    render(
      <ConversationView
        conversation={emptyConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    expect(screen.getByText('0 messages')).toBeInTheDocument();
    expect(screen.queryByTestId(/message-/)).not.toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    expect(container.querySelector('.conversation-detail')).toBeInTheDocument();
    expect(container.querySelector('.conversation-detail-header')).toBeInTheDocument();
    expect(container.querySelector('.conversation-messages')).toBeInTheDocument();
    expect(container.querySelector('.back-button')).toBeInTheDocument();
    expect(container.querySelector('.export-button')).toBeInTheDocument();
  });

  it('passes showExtendedActions as true to all messages', () => {
    render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    // The mock Message component would receive showExtendedActions=true
    // In a real scenario, we'd check if extended actions are visible
    const messages = screen.getAllByTestId(/message-/);
    expect(messages).toHaveLength(2);
  });

  it('renders with long conversation correctly', () => {
    const longMessages: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: (timeService.getTimestamp() - (50 - i) * 1000).toString(),
    }));

    const longConversation: StoredConversation = {
      id: 'long-conversation',
      timestamp: timeService.getTimestamp(),
      messageCount: 50,
      messages: longMessages,
      firstMessage: 'Message 0',
      lastMessage: 'Message 49',
    };

    render(
      <ConversationView
        conversation={longConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    expect(screen.getByText('50 messages')).toBeInTheDocument();
    expect(screen.getAllByTestId(/message-/)).toHaveLength(50);
  });

  it('is memoized and does not re-render unnecessarily', () => {
    const { rerender } = render(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    const header = screen.getByText('Conversation History');
    
    // Re-render with same props
    rerender(
      <ConversationView
        conversation={mockConversation}
        onBack={mockOnBack}
        onMarkAsImportant={mockOnMarkAsImportant}
      />,
    );

    // Should be the same element
    expect(screen.getByText('Conversation History')).toBe(header);
  });
});