/**
 * useDataExport Hook Tests
 * 
 * Tests the data export hook including:
 * - Chat message export functionality
 * - JSON blob creation and download
 * - User data handling and metadata
 * - Date/time formatting and localization
 * - File naming and URL management
 * - Memory cleanup and URL revocation
 */

import { renderHook, act } from '@testing-library/react';
import { useDataExport } from '../useDataExport';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import type { ChatMessage } from '../../types/chat.types';
import type { User } from '../../types/auth.types';

// Mock dependencies
jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    getCurrentDateTime: jest.fn(),
    getLocalDate: jest.fn(),
  },
}));
jest.mock('../../services/TimeService', () => ({
  timeService: {
    toISOString: jest.fn(),
  },
}));

const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock DOM APIs
const mockCreateElement = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

// Setup DOM mocks
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

// Mock Blob constructor
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  type: options?.type || 'text/plain',
})) as any;

describe('useDataExport', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    role: 'authenticated',
  };

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      content: 'Hello, how are you?',
      role: 'user',
      timestamp: '2024-01-01T10:00:00Z',
    },
    {
      id: 'msg-2',
      content: 'I am doing well, thank you!',
      role: 'assistant',
      timestamp: '2024-01-01T10:01:00Z',
    },
    {
      id: 'msg-3',
      content: 'What can you help me with today?',
      role: 'user',
      timestamp: '2024-01-01T10:02:00Z',
    },
  ];

  const mockCurrentDateTime = new Date('2024-01-15T14:30:00Z');
  const mockLocalDate = '2024-01-15';
  const mockISOString = '2024-01-15T14:30:00.000Z';
  const mockBlobURL = 'blob:http://localhost:3000/mock-blob-url';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup service mocks
    mockDashboardContextService.getCurrentDateTime.mockReturnValue(mockCurrentDateTime);
    mockDashboardContextService.getLocalDate.mockReturnValue(mockLocalDate);
    mockTimeService.toISOString.mockReturnValue(mockISOString);

    // Setup DOM mocks
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };
    mockCreateElement.mockReturnValue(mockAnchor);
    mockCreateObjectURL.mockReturnValue(mockBlobURL);
  });

  describe('Initialization', () => {
    it('should return handleExportMessages function', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      expect(result.current.handleExportMessages).toBeInstanceOf(Function);
    });

    it('should memoize the export function', () => {
      const { result, rerender } = renderHook(
        ({ user, messages }) => useDataExport({ user, messages }),
        {
          initialProps: { user: mockUser, messages: mockMessages },
        },
      );

      const firstFunction = result.current.handleExportMessages;

      // Re-render with same props
      rerender({ user: mockUser, messages: mockMessages });

      const secondFunction = result.current.handleExportMessages;

      expect(firstFunction).toBe(secondFunction);
    });

    it('should update memoized function when dependencies change', () => {
      const { result, rerender } = renderHook(
        ({ user, messages }) => useDataExport({ user, messages }),
        {
          initialProps: { user: mockUser, messages: mockMessages },
        },
      );

      const firstFunction = result.current.handleExportMessages;

      // Re-render with different messages
      const newMessages = [...mockMessages, {
        id: 'msg-4',
        content: 'New message',
        role: 'user' as const,
        timestamp: '2024-01-01T10:03:00Z',
      }];

      rerender({ user: mockUser, messages: newMessages });

      const secondFunction = result.current.handleExportMessages;

      expect(firstFunction).not.toBe(secondFunction);
    });
  });

  describe('Export functionality', () => {
    it('should export messages with user data', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Verify services were called
      expect(mockDashboardContextService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockTimeService.toISOString).toHaveBeenCalledWith(mockCurrentDateTime);
      expect(mockDashboardContextService.getLocalDate).toHaveBeenCalled();

      // Verify blob creation
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'John Doe',
          messages: mockMessages,
          totalMessages: 3,
        }, null, 2)],
        { type: 'application/json' },
      );

      // Verify URL creation and download
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockBlobURL);
    });

    it('should handle user without name metadata', () => {
      const userWithoutName: User = {
        ...mockUser,
        user_metadata: {},
      };

      const { result } = renderHook(() =>
        useDataExport({
          user: userWithoutName,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Verify blob creation with 'Unknown' user
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'Unknown',
          messages: mockMessages,
          totalMessages: 3,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should handle null user', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: null,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Verify blob creation with 'Unknown' user
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'Unknown',
          messages: mockMessages,
          totalMessages: 3,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should handle empty messages array', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: [],
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Verify blob creation with empty messages
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'John Doe',
          messages: [],
          totalMessages: 0,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should create download with correct filename', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      mockCreateElement.mockReturnValue(mockAnchor);

      act(() => {
        result.current.handleExportMessages();
      });

      expect(mockAnchor.href).toBe(mockBlobURL);
      expect(mockAnchor.download).toBe(`virgil-chat-${mockLocalDate}.json`);
    });

    it('should handle complex message data structures', () => {
      const complexMessages: ChatMessage[] = [
        {
          id: 'msg-complex',
          content: 'Message with special characters: "quotes", \'apostrophes\', & symbols',
          role: 'user',
          timestamp: '2024-01-01T10:00:00Z',
        },
      ];

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: complexMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Verify complex data is properly serialized
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'John Doe',
          messages: complexMessages,
          totalMessages: 1,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should handle user with null metadata', () => {
      const userWithNullMetadata: User = {
        ...mockUser,
        user_metadata: null as any,
      };

      const { result } = renderHook(() =>
        useDataExport({
          user: userWithNullMetadata,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      // Should handle null metadata gracefully
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'Unknown',
          messages: mockMessages,
          totalMessages: 3,
        }, null, 2)],
        { type: 'application/json' },
      );
    });
  });

  describe('Memory management', () => {
    it('should clean up blob URL after download', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockBlobURL);
    });

    it('should handle URL creation failure gracefully', () => {
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('URL creation failed');
      });

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      expect(() => {
        act(() => {
          result.current.handleExportMessages();
        });
      }).toThrow('URL creation failed');

      // Should not attempt to revoke URL if creation failed
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
    });

    it('should handle blob creation with different content types', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      expect(global.Blob).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'application/json' },
      );
    });
  });

  describe('Date and time handling', () => {
    it('should use correct date/time services for export metadata', () => {
      const customDateTime = new Date('2024-12-25T23:59:59Z');
      const customLocalDate = '2024-12-25';
      const customISOString = '2024-12-25T23:59:59.999Z';

      mockDashboardContextService.getCurrentDateTime.mockReturnValue(customDateTime);
      mockDashboardContextService.getLocalDate.mockReturnValue(customLocalDate);
      mockTimeService.toISOString.mockReturnValue(customISOString);

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      expect(mockDashboardContextService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockTimeService.toISOString).toHaveBeenCalledWith(customDateTime);
      expect(mockDashboardContextService.getLocalDate).toHaveBeenCalled();

      // Verify correct data in blob
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: customISOString,
          user: 'John Doe',
          messages: mockMessages,
          totalMessages: 3,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should use current date/time for each export', () => {
      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      // First export
      act(() => {
        result.current.handleExportMessages();
      });

      expect(mockDashboardContextService.getCurrentDateTime).toHaveBeenCalledTimes(1);
      expect(mockTimeService.toISOString).toHaveBeenCalledTimes(1);

      // Second export
      act(() => {
        result.current.handleExportMessages();
      });

      expect(mockDashboardContextService.getCurrentDateTime).toHaveBeenCalledTimes(2);
      expect(mockTimeService.toISOString).toHaveBeenCalledTimes(2);
    });
  });

  describe('Browser compatibility', () => {
    it('should handle browser without URL.createObjectURL', () => {
      const originalCreateObjectURL = URL.createObjectURL;
      delete (URL as any).createObjectURL;

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      expect(() => {
        act(() => {
          result.current.handleExportMessages();
        });
      }).toThrow();

      // Restore
      URL.createObjectURL = originalCreateObjectURL;
    });

    it('should handle browser without Blob constructor', () => {
      const originalBlob = global.Blob;
      delete (global as any).Blob;

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      expect(() => {
        act(() => {
          result.current.handleExportMessages();
        });
      }).toThrow();

      // Restore
      global.Blob = originalBlob;
    });

    it('should handle anchor element creation failure', () => {
      mockCreateElement.mockReturnValue(null);

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: mockMessages,
        }),
      );

      expect(() => {
        act(() => {
          result.current.handleExportMessages();
        });
      }).toThrow();
    });
  });

  describe('Large data handling', () => {
    it('should handle large message arrays', () => {
      const largeMessages = Array.from({ length: 1000 }, (_, index) => ({
        id: `msg-${index}`,
        content: `This is message number ${index} with some content to make it realistic`,
        role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        timestamp: new Date(Date.now() + index * 1000).toISOString(),
      }));

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: largeMessages,
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify({
          exportedAt: mockISOString,
          user: 'John Doe',
          messages: largeMessages,
          totalMessages: 1000,
        }, null, 2)],
        { type: 'application/json' },
      );
    });

    it('should handle messages with very long content', () => {
      const longContentMessage: ChatMessage = {
        id: 'msg-long',
        content: 'A'.repeat(50000), // 50KB of content
        role: 'user',
        timestamp: '2024-01-01T10:00:00Z',
      };

      const { result } = renderHook(() =>
        useDataExport({
          user: mockUser,
          messages: [longContentMessage],
        }),
      );

      act(() => {
        result.current.handleExportMessages();
      });

      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining('A'.repeat(1000))], // At least some of the long content
        { type: 'application/json' },
      );
    });
  });
});