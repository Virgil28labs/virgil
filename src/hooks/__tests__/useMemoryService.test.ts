import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemoryService } from '../useMemoryService';
import { memoryService } from '../../services/MemoryService';
import { DynamicContextBuilder } from '../../services/DynamicContextBuilder';
import type { ChatMessage } from '../../types/chat.types';
import type { DashboardContext } from '../../services/DashboardContextService';

// Mock dependencies
jest.mock('../../services/MemoryService', () => ({
  memoryService: {
    init: jest.fn(),
    getLastConversation: jest.fn(),
    getMarkedMemories: jest.fn(),
    getRecentConversations: jest.fn(),
    getContextForPrompt: jest.fn(),
    getRecentMessages: jest.fn(),
    markAsImportant: jest.fn(),
  },
}));

jest.mock('../../services/DynamicContextBuilder', () => ({
  DynamicContextBuilder: {
    createContextSummary: jest.fn(),
  },
}));

describe('useMemoryService Hook', () => {
  const mockDispatch = jest.fn();
  const mockSetError = jest.fn();
  
  const mockDashboardContext: DashboardContext = {
    location: { city: 'Santa Monica', country: 'USA' },
    weather: null,
    user: null,
    activities: [],
    appStates: {},
    lastUpdated: Date.now(),
  };

  const mockMessage: ChatMessage = {
    id: 'msg-123',
    role: 'user',
    content: 'Important information',
    timestamp: Date.now(),
  };

  const mockMemoryData = {
    lastConversation: { messageCount: 5, timestamp: Date.now() },
    markedMemories: [
      { id: 'mem-1', content: 'Memory 1', timestamp: Date.now() },
    ],
    recentConversations: [
      { timestamp: Date.now(), messageCount: 3, messages: [] },
    ],
    memoryContext: 'Context for prompt',
  };

  const defaultProps = {
    dispatch: mockDispatch,
    setError: mockSetError,
    dashboardContext: mockDashboardContext,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    (memoryService.init as jest.Mock).mockResolvedValue(undefined);
    (memoryService.getLastConversation as jest.Mock).mockResolvedValue(mockMemoryData.lastConversation);
    (memoryService.getMarkedMemories as jest.Mock).mockResolvedValue(mockMemoryData.markedMemories);
    (memoryService.getRecentConversations as jest.Mock).mockResolvedValue(mockMemoryData.recentConversations);
    (memoryService.getContextForPrompt as jest.Mock).mockResolvedValue(mockMemoryData.memoryContext);
    (memoryService.getRecentMessages as jest.Mock).mockResolvedValue([]);
    (memoryService.markAsImportant as jest.Mock).mockResolvedValue(undefined);
    (DynamicContextBuilder.createContextSummary as jest.Mock).mockReturnValue('Context summary');
  });

  describe('initializeMemory', () => {
    it('initializes memory service and loads all data on mount', async () => {
      renderHook(() => useMemoryService(defaultProps));

      await waitFor(() => {
        expect(memoryService.init).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(memoryService.getLastConversation).toHaveBeenCalled();
        expect(memoryService.getMarkedMemories).toHaveBeenCalled();
        expect(memoryService.getRecentConversations).toHaveBeenCalledWith(10);
        expect(memoryService.getContextForPrompt).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_MEMORY_DATA',
          payload: {
            lastConversation: mockMemoryData.lastConversation,
            markedMemories: mockMemoryData.markedMemories,
            recentConversations: mockMemoryData.recentConversations,
            memoryContext: mockMemoryData.memoryContext,
            showMemoryIndicator: true,
          },
        });
      });
    });

    it('handles initialization errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (memoryService.init as jest.Mock).mockRejectedValue(new Error('Init failed'));

      renderHook(() => useMemoryService(defaultProps));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to initialize memory service:',
          expect.any(Error)
        );
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('loads data in parallel for performance', async () => {
      let resolveInit: () => void;
      const initPromise = new Promise<void>((resolve) => {
        resolveInit = resolve;
      });
      
      (memoryService.init as jest.Mock).mockReturnValue(initPromise);

      renderHook(() => useMemoryService(defaultProps));

      // Should not load data until init completes
      expect(memoryService.getLastConversation).not.toHaveBeenCalled();

      // Complete init
      await act(async () => {
        resolveInit!();
        await initPromise;
      });

      // All data loading should happen in parallel
      await waitFor(() => {
        expect(memoryService.getLastConversation).toHaveBeenCalled();
        expect(memoryService.getMarkedMemories).toHaveBeenCalled();
        expect(memoryService.getRecentConversations).toHaveBeenCalled();
        expect(memoryService.getContextForPrompt).toHaveBeenCalled();
      });
    });
  });

  describe('loadRecentMessages', () => {
    it('loads recent messages successfully', async () => {
      const recentMessages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ];
      
      (memoryService.getRecentMessages as jest.Mock).mockResolvedValue(recentMessages);

      const { result } = renderHook(() => useMemoryService(defaultProps));

      await act(async () => {
        await result.current.loadRecentMessages();
      });

      expect(memoryService.getRecentMessages).toHaveBeenCalledWith(20);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_MESSAGES',
        payload: recentMessages,
      });
    });

    it('does not dispatch when no recent messages', async () => {
      (memoryService.getRecentMessages as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useMemoryService(defaultProps));

      // Clear dispatch calls from initialization
      mockDispatch.mockClear();

      await act(async () => {
        await result.current.loadRecentMessages();
      });

      expect(memoryService.getRecentMessages).toHaveBeenCalledWith(20);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('handles errors when loading recent messages', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (memoryService.getRecentMessages as jest.Mock).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useMemoryService(defaultProps));

      await act(async () => {
        await result.current.loadRecentMessages();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load recent messages:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('markAsImportant', () => {
    it('marks message as important with dashboard context', async () => {
      const { result } = renderHook(() => useMemoryService(defaultProps));

      await act(async () => {
        await result.current.markAsImportant(mockMessage);
      });

      expect(DynamicContextBuilder.createContextSummary).toHaveBeenCalledWith(mockDashboardContext);
      expect(memoryService.markAsImportant).toHaveBeenCalledWith(
        'msg-123',
        'Important information',
        'Context summary'
      );

      await waitFor(() => {
        expect(memoryService.getMarkedMemories).toHaveBeenCalled();
        expect(memoryService.getContextForPrompt).toHaveBeenCalled();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_MEMORY_DATA',
        payload: {
          markedMemories: mockMemoryData.markedMemories,
          memoryContext: mockMemoryData.memoryContext,
          showMemoryIndicator: true,
        },
      });
    });

    it('marks message as important without dashboard context', async () => {
      const propsWithoutContext = { ...defaultProps, dashboardContext: null };
      const { result } = renderHook(() => useMemoryService(propsWithoutContext));

      await act(async () => {
        await result.current.markAsImportant(mockMessage);
      });

      expect(DynamicContextBuilder.createContextSummary).not.toHaveBeenCalled();
      expect(memoryService.markAsImportant).toHaveBeenCalledWith(
        'msg-123',
        'Important information',
        expect.stringContaining('From conversation on')
      );
    });

    it('handles errors when marking as important', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (memoryService.markAsImportant as jest.Mock).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useMemoryService(defaultProps));

      await act(async () => {
        await result.current.markAsImportant(mockMessage);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to mark message as important:',
        expect.any(Error)
      );
      expect(mockSetError).toHaveBeenCalledWith('Unable to save memory. Please try again.');
      
      consoleErrorSpy.mockRestore();
    });

    it('updates memory data after marking as important', async () => {
      const updatedMemories = [
        ...mockMemoryData.markedMemories,
        { id: 'mem-2', content: 'New memory', timestamp: Date.now() },
      ];
      const updatedContext = 'Updated context';

      (memoryService.getMarkedMemories as jest.Mock).mockResolvedValue(updatedMemories);
      (memoryService.getContextForPrompt as jest.Mock).mockResolvedValue(updatedContext);

      const { result } = renderHook(() => useMemoryService(defaultProps));

      // Clear initial dispatch calls
      mockDispatch.mockClear();

      await act(async () => {
        await result.current.markAsImportant(mockMessage);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'SET_MEMORY_DATA',
          payload: {
            markedMemories: updatedMemories,
            memoryContext: updatedContext,
            showMemoryIndicator: true,
          },
        });
      });
    });
  });

  describe('memoization', () => {
    it('memoizes initializeMemory function', () => {
      const { result, rerender } = renderHook(() => useMemoryService(defaultProps));
      
      const init1 = result.current.initializeMemory;
      
      rerender();
      
      const init2 = result.current.initializeMemory;
      
      expect(init1).toBe(init2);
    });

    it('memoizes loadRecentMessages function', () => {
      const { result, rerender } = renderHook(() => useMemoryService(defaultProps));
      
      const load1 = result.current.loadRecentMessages;
      
      rerender();
      
      const load2 = result.current.loadRecentMessages;
      
      expect(load1).toBe(load2);
    });

    it('updates markAsImportant when dashboardContext changes', () => {
      const { result, rerender } = renderHook(
        (props) => useMemoryService(props),
        { initialProps: defaultProps }
      );
      
      const mark1 = result.current.markAsImportant;
      
      const newContext: DashboardContext = {
        ...mockDashboardContext,
        location: { city: 'New York', country: 'USA' },
      };
      
      rerender({ ...defaultProps, dashboardContext: newContext });
      
      const mark2 = result.current.markAsImportant;
      
      expect(mark1).not.toBe(mark2);
    });
  });

  describe('initialization effect', () => {
    it('calls initializeMemory on mount', async () => {
      const initializeSpy = jest.fn();
      (memoryService.init as jest.Mock).mockImplementation(initializeSpy);

      renderHook(() => useMemoryService(defaultProps));

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('does not re-initialize on re-render', async () => {
      const initializeSpy = jest.fn();
      (memoryService.init as jest.Mock).mockImplementation(initializeSpy);

      const { rerender } = renderHook(() => useMemoryService(defaultProps));

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalledTimes(1);
      });

      rerender();

      // Should still be called only once
      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });
});