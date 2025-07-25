import { MemoryService, type MarkedMemory } from '../MemoryService';
import { toastService } from '../ToastService';
import type { ChatMessage } from '../../types/chat.types';

// Mock dependencies
jest.mock('../ToastService', () => ({
  toastService: {
    memoryError: jest.fn(),
    memorySuccess: jest.fn(),
  },
}));

jest.mock('../DashboardContextService', () => {
  const actualMock = jest.requireActual('../__mocks__/TimeService');
  const mockTimeInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    dashboardContextService: {
      getTimestamp: jest.fn(() => mockTimeInstance.getTimestamp()),
    },
  };
});

// Mock the logger to prevent timeService usage during tests
jest.mock('../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock TimeService with the actual mock implementation
jest.mock('../TimeService', () => {
  const actualMock = jest.requireActual('../__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../TimeService';
const mockTimeService = timeService as any;

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  openCursor: jest.fn(),
  count: jest.fn(),
  index: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null,
};

const mockDB = {
  transaction: jest.fn(() => mockTransaction),
  createObjectStore: jest.fn(() => ({
    createIndex: jest.fn(),
  })),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn(() => false),
  },
};

const mockRequest: any = {
  result: mockDB,
  error: null as Error | null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

// Replace global indexedDB
(global as any).indexedDB = mockIndexedDB;

describe('MemoryService', () => {
  let memoryService: MemoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
    
    // Set up indexedDB before creating service
    (global as any).indexedDB = mockIndexedDB;
    
    // Setup default mock behavior
    mockIndexedDB.open.mockReturnValue(mockRequest);
    mockObjectStore.add.mockReturnValue({ onsuccess: null, onerror: null });
    mockObjectStore.put.mockReturnValue({ onsuccess: null, onerror: null });
    mockObjectStore.get.mockReturnValue({ result: null, onsuccess: null, onerror: null });
    mockObjectStore.delete.mockReturnValue({ onsuccess: null, onerror: null });
    mockObjectStore.clear.mockReturnValue({ onsuccess: null, onerror: null });
    mockObjectStore.count.mockReturnValue({ result: 0, onsuccess: null, onerror: null });
    mockObjectStore.openCursor.mockReturnValue({ onsuccess: null, onerror: null });
    
    // Create service after all mocks are set up
    memoryService = new MemoryService();
  });
  
  afterEach(() => {
    mockTimeService.destroy();
    jest.useRealTimers();
  });

  describe('init', () => {
    it('successfully initializes the database', async () => {
      const initPromise = memoryService.init();
      
      // Simulate successful DB open
      mockRequest.onsuccess?.();
      
      await expect(initPromise).resolves.toBeUndefined();
      expect(mockIndexedDB.open).toHaveBeenCalledWith('VirgilMemory', 1);
    });

    it('handles database initialization errors', async () => {
      const error = new Error('DB init failed');
      mockRequest.error = error;
      
      const initPromise = memoryService.init();
      
      // Simulate error
      mockRequest.onerror?.();
      
      await expect(initPromise).rejects.toEqual(error);
      expect(toastService.memoryError).toHaveBeenCalledWith('init', error);
    });

    it('creates object stores on upgrade', async () => {
      const initPromise = memoryService.init();
      
      // Simulate upgrade needed
      mockRequest.onupgradeneeded?.({ target: { result: mockDB } } as any);
      mockRequest.onsuccess?.();
      
      await initPromise;
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('conversations', { keyPath: 'id' });
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('memories', { keyPath: 'id' });
    });
  });

  describe('saveConversation', () => {
    const mockMessages: ChatMessage[] = [
      { id: 'msg-1', role: 'user', content: 'Hello', timestamp: mockTimeService.getTimestamp().toString() },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: mockTimeService.getTimestamp().toString() },
    ];

    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('saves messages to continuous conversation', async () => {
      // Mock get request for existing conversation
      const getRequest = { result: null, onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      // Mock put request
      const putRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(putRequest);
      
      const savePromise = memoryService.saveConversation(mockMessages);
      
      // Simulate get success (no existing conversation)
      getRequest.onsuccess?.();
      
      // Wait for microtask
      await Promise.resolve();
      
      // Simulate put success
      putRequest.onsuccess?.();
      
      await expect(savePromise).resolves.toBeUndefined();
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'continuous-main',
          messages: mockMessages,
          firstMessage: 'Hello',
          lastMessage: 'Hi there!',
          messageCount: 2,
        }),
      );
    });

    it('appends to existing conversation', async () => {
      const existingMessages = [
        { id: 'old-1', role: 'user' as const, content: 'Previous message', timestamp: (mockTimeService.getTimestamp() - 10000).toString() },
      ];
      
      const getRequest = {
        result: {
          id: 'continuous-main',
          messages: existingMessages,
          firstMessage: 'Previous message',
          lastMessage: 'Previous message',
          messageCount: 1,
          timestamp: mockTimeService.getTimestamp() - 10000,
        },
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const putRequest = { onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(putRequest);
      
      const savePromise = memoryService.saveConversation(mockMessages);
      
      getRequest.onsuccess?.();
      await Promise.resolve();
      putRequest.onsuccess?.();
      
      await expect(savePromise).resolves.toBeUndefined();
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [...existingMessages, ...mockMessages],
          messageCount: 3,
          lastMessage: 'Hi there!',
        }),
      );
    });

    it('handles save errors gracefully', async () => {
      const getRequest = { result: null, onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const error = new Error('Save failed');
      const putRequest = { error, onsuccess: null, onerror: null };
      mockObjectStore.put.mockReturnValue(putRequest);
      
      const savePromise = memoryService.saveConversation(mockMessages);
      
      getRequest.onsuccess?.();
      await Promise.resolve();
      putRequest.onerror?.();
      
      await expect(savePromise).rejects.toEqual(error);
      expect(toastService.memoryError).toHaveBeenCalledWith('saveConversation', error);
    });
  });

  describe('getRecentMessages', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('returns cached messages when available', async () => {
      // Set cache
      (memoryService as any).recentMessagesCache = [
        { id: 'cached-1', role: 'user', content: 'Cached message', timestamp: mockTimeService.getTimestamp() },
      ];
      
      const messages = await memoryService.getRecentMessages(10);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Cached message');
      expect(mockObjectStore.get).not.toHaveBeenCalled();
    });

    it('fetches messages from database when cache is empty', async () => {
      const storedMessages = [
        { id: 'msg-1', role: 'user', content: 'Message 1', timestamp: mockTimeService.getTimestamp() - 2000 },
        { id: 'msg-2', role: 'assistant', content: 'Message 2', timestamp: mockTimeService.getTimestamp() - 1000 },
        { id: 'msg-3', role: 'user', content: 'Message 3', timestamp: mockTimeService.getTimestamp() },
      ];
      
      const getRequest = {
        result: {
          id: 'continuous-main',
          messages: storedMessages,
        },
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const messagesPromise = memoryService.getRecentMessages(2);
      
      getRequest.onsuccess?.();
      
      const messages = await messagesPromise;
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 2');
      expect(messages[1].content).toBe('Message 3');
    });

    it('returns empty array when no conversation exists', async () => {
      const getRequest = { result: null, onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const messagesPromise = memoryService.getRecentMessages(10);
      
      getRequest.onsuccess?.();
      
      const messages = await messagesPromise;
      
      expect(messages).toEqual([]);
    });
  });

  describe('markAsImportant', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('saves important memory successfully', async () => {
      const addRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(addRequest);
      
      const markPromise = memoryService.markAsImportant(
        'msg-123',
        'Important information',
        'User asked about weather',
      );
      
      addRequest.onsuccess?.();
      
      await expect(markPromise).resolves.toBeUndefined();
      
      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^mem-\d+-[a-z0-9]+$/),
          content: 'Important information',
          context: 'User asked about weather',
          timestamp: expect.any(Number),
        }),
      );
      
      expect(toastService.memorySuccess).toHaveBeenCalledWith('Memory saved');
    });

    it('handles duplicate memory errors', async () => {
      const error = new Error('Key already exists');
      const addRequest = { error, onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(addRequest);
      
      const markPromise = memoryService.markAsImportant('msg-123', 'Content', 'Context');
      
      addRequest.onerror?.();
      
      await expect(markPromise).rejects.toEqual(error);
      expect(toastService.memoryError).toHaveBeenCalledWith('markAsImportant', error);
    });
  });

  describe('getMarkedMemories', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('returns cached memories when available', async () => {
      const cachedMemories: MarkedMemory[] = [
        {
          id: 'mem-1',
          content: 'Cached memory',
          context: 'Test context',
          timestamp: mockTimeService.getTimestamp(),
        },
      ];
      (memoryService as any).memoriesCache = cachedMemories;
      
      const memories = await memoryService.getMarkedMemories();
      
      expect(memories).toEqual(cachedMemories);
      expect(mockObjectStore.openCursor).not.toHaveBeenCalled();
    });

    it('fetches memories from database and sorts by timestamp', async () => {
      (memoryService as any).memoriesCache = null;
      
      const cursorRequest = { onsuccess: null, onerror: null };
      mockObjectStore.openCursor.mockReturnValue(cursorRequest);
      
      const memoriesPromise = memoryService.getMarkedMemories();
      
      // Simulate cursor iterations
      const memories = [
        { id: 'mem-1', content: 'Memory 1', context: 'Context 1', timestamp: mockTimeService.getTimestamp() - 2000 },
        { id: 'mem-2', content: 'Memory 2', context: 'Context 2', timestamp: mockTimeService.getTimestamp() },
        { id: 'mem-3', content: 'Memory 3', context: 'Context 3', timestamp: mockTimeService.getTimestamp() - 1000 },
      ];
      
      let cursorIndex = 0;
      const mockCursor = {
        value: memories[cursorIndex],
        continue: jest.fn(() => {
          cursorIndex++;
          if (cursorIndex < memories.length) {
            mockCursor.value = memories[cursorIndex];
            cursorRequest.onsuccess?.({ target: { result: mockCursor } } as any);
          } else {
            cursorRequest.onsuccess?.({ target: { result: null } } as any);
          }
        }),
      };
      
      cursorRequest.onsuccess?.({ target: { result: mockCursor } } as any);
      
      const result = await memoriesPromise;
      
      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Memory 2'); // Most recent
      expect(result[1].content).toBe('Memory 3');
      expect(result[2].content).toBe('Memory 1'); // Oldest
    });
  });

  describe('getContextForPrompt', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('returns cached context when fresh', async () => {
      const cachedContext = 'Cached context information';
      (memoryService as any).contextCache = cachedContext;
      (memoryService as any).contextCacheTimestamp = mockTimeService.getTimestamp() - 10000; // 10 seconds ago
      
      const context = await memoryService.getContextForPrompt();
      
      expect(context).toBe(cachedContext);
      expect(mockObjectStore.openCursor).not.toHaveBeenCalled();
    });

    it('generates new context when cache is stale', async () => {
      (memoryService as any).contextCacheTimestamp = mockTimeService.getTimestamp() - 60000; // 1 minute ago
      
      const memories: MarkedMemory[] = [
        {
          id: 'mem-1',
          content: 'Important fact 1',
          context: 'Context 1',
          timestamp: mockTimeService.getTimestamp() - 2000,
          tag: 'weather',
        },
        {
          id: 'mem-2',
          content: 'Important fact 2',
          context: 'Context 2',
          timestamp: mockTimeService.getTimestamp(),
        },
      ];
      
      jest.spyOn(memoryService, 'getMarkedMemories').mockResolvedValue(memories);
      
      const context = await memoryService.getContextForPrompt();
      
      expect(context).toContain('Important fact 2');
      expect(context).toContain('Important fact 1');
      expect(context).toContain('[weather]');
    });

    it('returns empty string when no memories exist', async () => {
      (memoryService as any).contextCacheTimestamp = 0;
      jest.spyOn(memoryService, 'getMarkedMemories').mockResolvedValue([]);
      
      const context = await memoryService.getContextForPrompt();
      
      expect(context).toBe('');
    });
  });

  describe('getRecentConversations', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('returns empty array for now (not implemented)', async () => {
      const conversations = await memoryService.getRecentConversations(5);
      
      expect(conversations).toEqual([]);
    });
  });

  describe('getLastConversation', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('returns cached conversation metadata', async () => {
      const cachedMeta = {
        id: 'continuous-main',
        firstMessage: 'First',
        lastMessage: 'Last',
        timestamp: mockTimeService.getTimestamp(),
        messageCount: 10,
      };
      (memoryService as any).conversationMetaCache = cachedMeta;
      
      const conversation = await memoryService.getLastConversation();
      
      expect(conversation).toEqual(cachedMeta);
      expect(mockObjectStore.get).not.toHaveBeenCalled();
    });

    it('fetches conversation metadata from database', async () => {
      (memoryService as any).conversationMetaCache = null;
      
      const storedConversation = {
        id: 'continuous-main',
        messages: [
          { id: '1', role: 'user', content: 'Message 1' },
          { id: '2', role: 'assistant', content: 'Message 2' },
        ],
        firstMessage: 'Message 1',
        lastMessage: 'Message 2',
        timestamp: mockTimeService.getTimestamp(),
        messageCount: 2,
      };
      
      const getRequest = { result: storedConversation, onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const conversationPromise = memoryService.getLastConversation();
      
      getRequest.onsuccess?.();
      
      const conversation = await conversationPromise;
      
      expect(conversation).toEqual({
        id: storedConversation.id,
        firstMessage: storedConversation.firstMessage,
        lastMessage: storedConversation.lastMessage,
        timestamp: storedConversation.timestamp,
        messageCount: storedConversation.messageCount,
      });
    });

    it('returns null when no conversation exists', async () => {
      (memoryService as any).conversationMetaCache = null;
      
      const getRequest = { result: null, onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(getRequest);
      
      const conversationPromise = memoryService.getLastConversation();
      
      getRequest.onsuccess?.();
      
      const conversation = await conversationPromise;
      
      expect(conversation).toBeNull();
    });
  });

  describe('clearAllData', () => {
    beforeEach(async () => {
      const initPromise = memoryService.init();
      mockRequest.onsuccess?.();
      await initPromise;
    });

    it('clears all object stores and caches', async () => {
      const clearRequests = [
        { onsuccess: null, onerror: null },
        { onsuccess: null, onerror: null },
      ];
      let clearIndex = 0;
      mockObjectStore.clear.mockImplementation(() => clearRequests[clearIndex++]);
      
      const clearPromise = memoryService.clearAllData();
      
      // Simulate both clear operations succeeding
      clearRequests[0].onsuccess?.();
      clearRequests[1].onsuccess?.();
      
      await clearPromise;
      
      expect(mockObjectStore.clear).toHaveBeenCalledTimes(2);
      expect((memoryService as any).recentMessagesCache).toEqual([]);
      expect((memoryService as any).memoriesCache).toBeNull();
      expect((memoryService as any).conversationMetaCache).toBeNull();
      expect((memoryService as any).contextCache).toBe('');
    });

    it('handles clear errors', async () => {
      const error = new Error('Clear failed');
      const clearRequest = { error, onsuccess: null, onerror: null };
      mockObjectStore.clear.mockReturnValue(clearRequest);
      
      const clearPromise = memoryService.clearAllData();
      
      clearRequest.onerror?.();
      
      await expect(clearPromise).rejects.toEqual(error);
      expect(toastService.memoryError).toHaveBeenCalledWith('clearAllData', error);
    });
  });
});