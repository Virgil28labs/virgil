import { renderHook } from '@testing-library/react';
import { useDataExport } from '../useDataExport';
import type { ChatMessage } from '../../types/chat.types';
import type { User } from '../../types/auth.types';

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('useDataExport Hook', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'ben@example.com',
    user_metadata: {
      name: 'Ben',
    },
  } as User;

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello Virgil',
      timestamp: Date.now() - 2000,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: Date.now() - 1000,
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'What is the weather?',
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handleExportMessages', () => {
    it('exports messages with user metadata', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      const clickSpy = jest.fn();
      
      createElementSpy.mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
      } as any);

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: mockMessages })
      );

      result.current.handleExportMessages();

      // Check blob creation
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      
      // Check anchor element creation
      expect(createElementSpy).toHaveBeenCalledWith('a');
      
      // Check download attributes
      const anchor = createElementSpy.mock.results[0].value;
      expect(anchor.href).toBe('mock-blob-url');
      expect(anchor.download).toBe('virgil-chat-2024-01-15.json');
      
      // Check click was triggered
      expect(clickSpy).toHaveBeenCalled();
      
      // Check cleanup
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
      
      createElementSpy.mockRestore();
    });

    it('exports correct data structure', () => {
      let capturedBlob: Blob | null = null;
      
      jest.spyOn(global, 'Blob').mockImplementation((parts: any[]) => {
        const blob = new Blob(parts);
        capturedBlob = blob;
        return blob;
      });

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: mockMessages })
      );

      result.current.handleExportMessages();

      expect(capturedBlob).toBeTruthy();
      
      // Parse the exported data
      const reader = new FileReader();
      reader.onload = (e) => {
        const exported = JSON.parse(e.target?.result as string);
        
        expect(exported).toEqual({
          exportedAt: '2024-01-15T10:30:00.000Z',
          user: 'Ben',
          messages: mockMessages,
          totalMessages: 3,
        });
      };
      reader.readAsText(capturedBlob!);
    });

    it('handles missing user gracefully', () => {
      let capturedBlob: Blob | null = null;
      
      jest.spyOn(global, 'Blob').mockImplementation((parts: any[]) => {
        const blob = new Blob(parts);
        capturedBlob = blob;
        return blob;
      });

      const { result } = renderHook(() => 
        useDataExport({ user: null, messages: mockMessages })
      );

      result.current.handleExportMessages();

      const reader = new FileReader();
      reader.onload = (e) => {
        const exported = JSON.parse(e.target?.result as string);
        expect(exported.user).toBe('Unknown');
      };
      reader.readAsText(capturedBlob!);
    });

    it('handles user without metadata', () => {
      let capturedBlob: Blob | null = null;
      
      jest.spyOn(global, 'Blob').mockImplementation((parts: any[]) => {
        const blob = new Blob(parts);
        capturedBlob = blob;
        return blob;
      });

      const userWithoutMetadata = {
        ...mockUser,
        user_metadata: undefined,
      } as User;

      const { result } = renderHook(() => 
        useDataExport({ user: userWithoutMetadata, messages: mockMessages })
      );

      result.current.handleExportMessages();

      const reader = new FileReader();
      reader.onload = (e) => {
        const exported = JSON.parse(e.target?.result as string);
        expect(exported.user).toBe('Unknown');
      };
      reader.readAsText(capturedBlob!);
    });

    it('exports empty messages array', () => {
      let capturedBlob: Blob | null = null;
      
      jest.spyOn(global, 'Blob').mockImplementation((parts: any[]) => {
        const blob = new Blob(parts);
        capturedBlob = blob;
        return blob;
      });

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: [] })
      );

      result.current.handleExportMessages();

      const reader = new FileReader();
      reader.onload = (e) => {
        const exported = JSON.parse(e.target?.result as string);
        expect(exported.messages).toEqual([]);
        expect(exported.totalMessages).toBe(0);
      };
      reader.readAsText(capturedBlob!);
    });

    it('creates blob with correct MIME type', () => {
      const blobSpy = jest.spyOn(global, 'Blob');

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: mockMessages })
      );

      result.current.handleExportMessages();

      expect(blobSpy).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: 'application/json' }
      );
    });

    it('formats JSON with proper indentation', () => {
      const blobSpy = jest.spyOn(global, 'Blob');

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: mockMessages })
      );

      result.current.handleExportMessages();

      const jsonString = blobSpy.mock.calls[0][0][0];
      
      // Check if JSON is properly formatted (has indentation)
      expect(jsonString).toContain('\n');
      expect(jsonString).toContain('  '); // 2-space indentation
    });

    it('memoizes handleExportMessages based on dependencies', () => {
      const { result, rerender } = renderHook(
        (props) => useDataExport(props),
        { initialProps: { user: mockUser, messages: mockMessages } }
      );

      const handler1 = result.current.handleExportMessages;

      // Re-render with same props
      rerender({ user: mockUser, messages: mockMessages });
      const handler2 = result.current.handleExportMessages;

      expect(handler1).toBe(handler2);

      // Re-render with different messages
      const newMessages = [...mockMessages, {
        id: 'msg-4',
        role: 'assistant',
        content: 'The weather is sunny!',
        timestamp: Date.now(),
      }];
      
      rerender({ user: mockUser, messages: newMessages });
      const handler3 = result.current.handleExportMessages;

      expect(handler1).not.toBe(handler3);
    });

    it('uses ISO date format for filename', () => {
      const createElementSpy = jest.spyOn(document, 'createElement');
      
      createElementSpy.mockReturnValue({
        href: '',
        download: '',
        click: jest.fn(),
      } as any);

      const { result } = renderHook(() => 
        useDataExport({ user: mockUser, messages: mockMessages })
      );

      result.current.handleExportMessages();

      const anchor = createElementSpy.mock.results[0].value;
      // Should use YYYY-MM-DD format
      expect(anchor.download).toMatch(/virgil-chat-\d{4}-\d{2}-\d{2}\.json/);
      expect(anchor.download).toBe('virgil-chat-2024-01-15.json');
      
      createElementSpy.mockRestore();
    });
  });
});