/**
 * MemoryService Test Suite
 * 
 * Tests the local memory persistence service that manages
 * chat conversations and marked memories using IndexedDB.
 */

import { MemoryService } from '../MemoryService';
import { toastService } from '../ToastService';
import { dashboardContextService } from '../DashboardContextService';
import { logger } from '../../lib/logger';
import type { ChatMessage } from '../../types/chat.types';
import type { StoredConversation, MarkedMemory } from '../MemoryService';

// Mock dependencies
jest.mock('../ToastService', () => ({
  toastService: {
    memoryError: jest.fn(),
    memorySuccess: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../DashboardContextService', () => ({
  dashboardContextService: {
    getTimestamp: jest.fn(() => Date.now()),
    getContext: jest.fn(() => ({
      currentTime: '12:00 PM',
      currentDate: 'January 15, 2025',
      timeOfDay: 'afternoon',
    })),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => Date.now()),
    getCurrentTime: jest.fn(() => '12:00 PM'),
    getCurrentDate: jest.fn(() => 'January 15, 2025'),
    getCurrentDateTime: jest.fn(() => 'January 15, 2025 at 12:00 PM'),
    getLocalDate: jest.fn(() => new Date()),
    formatDateToLocal: jest.fn((date: Date) => date.toLocaleDateString()),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'Wednesday'),
    getMonth: jest.fn(() => 'January'),
    getYear: jest.fn(() => 2025),
    toISOString: jest.fn(() => '2025-01-15T12:00:00.000Z'),
    getTimeAgo: jest.fn((date: Date) => '5 minutes ago'),
  },
}));

// Mock IndexedDB
class MockIDBRequest {
  result: any;
  error: any;
  onsuccess: any;
  onerror: any;
  
  constructor(result?: any, error?: any) {
    this.result = result;
    this.error = error;
  }
}

class MockIDBTransaction {
  objectStore(name: string) {
    return new MockIDBObjectStore(name);
  }
}

class MockIDBObjectStore {
  private data: Map<string, any> = new Map();
  private name: string;
  
  constructor(name: string) {
    this.name = name;
    // Get or create data store
    const globalStore = (global as any).__mockDBStores || {};
    if (!globalStore[name]) {
      globalStore[name] = new Map();
    }
    (global as any).__mockDBStores = globalStore;
    this.data = globalStore[name];
  }
  
  clear() {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  get(key: string) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = this.data.get(key);
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  put(value: any) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(value.id, value);
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  add(value: any) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(value.id, value);
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  delete(key: string) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  getAll() {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.result = Array.from(this.data.values());
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  openCursor(range?: any, direction?: string) {
    const request = new MockIDBRequest();
    setTimeout(() => {
      const values = Array.from(this.data.values());
      // Sort by timestamp if direction is 'prev'
      if (direction === 'prev' && values.length > 0 && values[0].timestamp) {
        values.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      let index = 0;
      const cursor = values.length > 0 ? {
        value: values[index],
        continue: () => {
          index++;
          if (index < values.length) {
            cursor.value = values[index];
            request.result = cursor;
            if (request.onsuccess) request.onsuccess();
          } else {
            request.result = null;
            if (request.onsuccess) request.onsuccess();
          }
        },
      } : null;
      
      request.result = cursor;
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  }
  
  index(indexName: string) {
    return this; // Simplified - just return self for index operations
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    contains: (name: string) => ['conversations', 'memories'].includes(name),
  };
  
  transaction(storeNames: string[], mode: string) {
    return new MockIDBTransaction();
  }
  
  createObjectStore(name: string, options: any) {
    return {
      createIndex: jest.fn(),
    };
  }
}

const mockIndexedDB = {
  open: jest.fn((name: string, version?: number) => {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      // Simulate upgrade if needed
      if (request.onupgradeneeded) {
        const event = {
          target: { result: new MockIDBDatabase() },
        };
        request.onupgradeneeded(event as any);
      }
      
      request.result = new MockIDBDatabase();
      if (request.onsuccess) request.onsuccess();
    }, 0);
    
    return request;
  }),
};

// @ts-ignore
global.indexedDB = mockIndexedDB;

describe('MemoryService', () => {
  let memoryService: MemoryService;
  const mockToastService = toastService as jest.Mocked<typeof toastService>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;

  // Sample data
  const sampleMessage: ChatMessage = {
    role: 'user',
    content: 'Hello, Virgil!',
    timestamp: Date.now(),
  };

  const sampleAssistantMessage: ChatMessage = {
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    timestamp: Date.now() + 1000,
  };

  const sampleMemory: Omit<MarkedMemory, 'id'> = {
    content: 'Important: Remember to feed the cat',
    context: 'User mentioned a daily routine',
    timestamp: Date.now(),
    tag: 'routine',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear mock data stores
    (global as any).__mockDBStores = {};
    mockDashboardContextService.getTimestamp.mockReturnValue(Date.now());
    
    memoryService = new MemoryService();
    await memoryService.init();
  });

  describe('Initialization', () => {
    it('initializes database successfully', async () => {
      const newService = new MemoryService();
      await expect(newService.init()).resolves.not.toThrow();
    });

    it('creates required object stores on upgrade', async () => {
      const newService = new MemoryService();
      await newService.init();
      
      // Verify the mock was called
      expect(mockIndexedDB.open).toHaveBeenCalledWith('VirgilMemory', 1);
    });

    it('handles initialization errors', async () => {
      const originalOpen = mockIndexedDB.open;
      mockIndexedDB.open = jest.fn(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.error = new Error('Failed to open DB');
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });
      
      const newService = new MemoryService();
      await expect(newService.init()).rejects.toThrow();
      expect(mockToastService.memoryError).toHaveBeenCalledWith('init', expect.any(Error));
      
      // Restore
      mockIndexedDB.open = originalOpen;
    });
  });

  describe('Continuous Conversation', () => {
    it('returns null when no conversation exists', async () => {
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation).toBeNull();
    });

    it('saves and retrieves continuous conversation', async () => {
      await memoryService.saveConversation([sampleMessage]);
      
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation).toBeDefined();
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0]).toEqual(sampleMessage);
      expect(conversation?.id).toBe('continuous-main');
    });

    it('updates conversation metadata correctly', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.saveConversation([sampleAssistantMessage]);
      
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messageCount).toBe(2);
      expect(conversation?.firstMessage).toBe('Hello, Virgil!');
      expect(conversation?.lastMessage).toBe('Hello! How can I help you today?');
    });

    it('maintains message order', async () => {
      const messages = [
        { ...sampleMessage, content: 'First', timestamp: 1000 },
        { ...sampleMessage, content: 'Second', timestamp: 2000 },
        { ...sampleMessage, content: 'Third', timestamp: 3000 },
      ];

      for (const msg of messages) {
        await memoryService.saveConversation([msg]);
      }

      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messages.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    it('handles database errors gracefully', async () => {
      // Simulate DB not initialized
      (memoryService as any).db = null;
      
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation).toBeNull();
    });
  });

  describe('Recent Messages', () => {
    it('returns empty array when no messages exist', async () => {
      const messages = await memoryService.getRecentMessages();
      expect(messages).toEqual([]);
    });

    it('returns recent messages from continuous conversation', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.saveConversation([sampleAssistantMessage]);
      
      const messages = await memoryService.getRecentMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(sampleMessage);
      expect(messages[1]).toEqual(sampleAssistantMessage);
    });

    it('limits to requested number of messages', async () => {
      // Add more than default limit
      for (let i = 0; i < 60; i++) {
        await memoryService.saveConversation([{
          ...sampleMessage,
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        }]);
      }

      const messages = await memoryService.getRecentMessages(50);
      expect(messages).toHaveLength(50);
      expect(messages[0].content).toBe('Message 10'); // Should get last 50
      expect(messages[49].content).toBe('Message 59');
    });

    it('uses cache for performance', async () => {
      await memoryService.saveConversation([sampleMessage]);
      
      // First call loads from DB
      const messages1 = await memoryService.getRecentMessages();
      expect(messages1).toHaveLength(1);
      
      // Clear mocks to verify cache is used
      jest.clearAllMocks();
      
      // Second call should use cache
      const messages2 = await memoryService.getRecentMessages();
      expect(messages2).toHaveLength(1);
      expect(messages2).toEqual(messages1);
    });
  });

  describe('Memory Context', () => {
    it('builds context for prompt from recent messages', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.saveConversation([sampleAssistantMessage]);
      
      const context = await memoryService.getContextForPrompt();
      expect(context).toContain('Recent Conversation Context');
      expect(context).toContain('User: Hello, Virgil!');
      expect(context).toContain('Virgil: Hello! How can I help you today?');
    });

    it('returns empty context when no messages', async () => {
      const context = await memoryService.getContextForPrompt();
      expect(context).toBe('');
    });

    it('includes marked memories in context', async () => {
      await memoryService.markAsImportant(
        'msg-123',
        sampleMemory.content,
        sampleMemory.context,
        sampleMemory.tag,
      );
      
      const context = await memoryService.getContextForPrompt();
      expect(context).toContain('Important Information to Remember');
      expect(context).toContain('Remember to feed the cat');
    });

    it('limits context size', async () => {
      // Add many messages
      for (let i = 0; i < 100; i++) {
        await memoryService.saveConversation([{
          ...sampleMessage,
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        }]);
      }
      
      const context = await memoryService.getContextForPrompt();
      expect(context.length).toBeLessThan(8000); // Should be limited
    });
  });

  describe('Marked Memories', () => {
    it('marks memory successfully', async () => {
      await memoryService.markAsImportant(
        'msg-123',
        sampleMemory.content,
        sampleMemory.context,
        sampleMemory.tag,
      );
      
      expect(mockToastService.memorySuccess).toHaveBeenCalledWith('mark');
    });

    it('retrieves all marked memories', async () => {
      await memoryService.markAsImportant('1', sampleMemory.content, sampleMemory.context, sampleMemory.tag);
      await memoryService.markAsImportant('2', 'Another memory', 'Another context');
      
      const memories = await memoryService.getMarkedMemories();
      expect(memories).toHaveLength(2);
      expect(memories[0].content).toBe('Important: Remember to feed the cat');
      expect(memories[1].content).toBe('Another memory');
    });

    it('forgets specific memory', async () => {
      await memoryService.markAsImportant('1', sampleMemory.content, sampleMemory.context);
      const memories = await memoryService.getMarkedMemories();
      expect(memories).toHaveLength(1);
      
      await memoryService.forgetMemory(memories[0].id);
      
      const remainingMemories = await memoryService.getMarkedMemories();
      expect(remainingMemories).toHaveLength(0);
    });

    it('handles memory marking errors', async () => {
      // Mock transaction to throw
      const db = (memoryService as any).db;
      if (db) {
        db.transaction = jest.fn(() => {
          throw new Error('Transaction failed');
        });
      }
      
      await expect(memoryService.markAsImportant('1', 'content', 'context')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockToastService.memoryError).toHaveBeenCalledWith('mark', expect.any(Error));
    });
  });

  describe('Conversation Operations', () => {
    it('gets last conversation', async () => {
      await memoryService.saveConversation([sampleMessage, sampleAssistantMessage]);
      
      const lastConv = await memoryService.getLastConversation();
      expect(lastConv).toBeDefined();
      expect(lastConv?.messages).toHaveLength(2);
      expect(lastConv?.id).toBe('continuous-main');
    });

    it('gets recent conversations', async () => {
      await memoryService.saveConversation([sampleMessage]);
      
      const conversations = await memoryService.getRecentConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('continuous-main');
    });

    it('searches conversations by query', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.saveConversation([{
        ...sampleMessage,
        content: 'Tell me about cats',
      }]);
      
      const results = await memoryService.searchConversations('cats');
      expect(results).toHaveLength(1);
      expect(results[0].messages.some(m => m.content.includes('cats'))).toBe(true);
    });

    it('returns empty array for empty search', async () => {
      const results = await memoryService.searchConversations('');
      expect(results).toEqual([]);
    });
  });

  describe('Data Management', () => {
    it('exports all data', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.markAsImportant('1', 'Memory content', 'Context');
      
      const exported = await memoryService.exportAllData();
      expect(exported.conversations).toHaveLength(1);
      expect(exported.memories).toHaveLength(1);
    });

    it('clears all data', async () => {
      await memoryService.saveConversation([sampleMessage]);
      await memoryService.markAsImportant('1', 'Memory content', 'Context');
      
      await memoryService.clearAllData();
      
      const conversation = await memoryService.getContinuousConversation();
      const memories = await memoryService.getMarkedMemories();
      
      expect(conversation).toBeNull();
      expect(memories).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('handles transaction errors gracefully', async () => {
      // Mock transaction to throw
      const db = (memoryService as any).db;
      if (db) {
        db.transaction = jest.fn(() => {
          throw new Error('Transaction failed');
        });
      }
      
      const result = await memoryService.getContinuousConversation();
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockToastService.memoryError).toHaveBeenCalled();
    });

    it('handles null database gracefully', async () => {
      (memoryService as any).db = null;
      
      // All methods should handle null DB
      expect(await memoryService.getContinuousConversation()).toBeNull();
      expect(await memoryService.getRecentMessages()).toEqual([]);
      expect(await memoryService.getContextForPrompt()).toBe('');
      expect(await memoryService.getMarkedMemories()).toEqual([]);
      
      // These should complete without error but not store anything
      await memoryService.saveConversation([sampleMessage]); // Returns early without error
      await memoryService.markAsImportant('1', 'content', 'context'); // Returns early without error
    });
  });

  describe('Performance Optimization', () => {
    it('batches message additions efficiently', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        ...sampleMessage,
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      }));

      // Save all at once
      await memoryService.saveConversation(messages);

      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messages).toHaveLength(10);
      expect(conversation?.messageCount).toBe(10);
    });

    it('maintains cache consistency', async () => {
      // Add initial message
      await memoryService.saveConversation([sampleMessage]);
      
      // Load into cache
      await memoryService.getRecentMessages();
      
      // Add another message
      await memoryService.saveConversation([sampleAssistantMessage]);
      
      // Cache should be updated
      const messages = await memoryService.getRecentMessages();
      expect(messages).toHaveLength(2);
    });

    it('handles large conversations efficiently', async () => {
      // Add many messages
      const largeMessageSet = Array.from({ length: 100 }, (_, i) => ({
        ...sampleMessage,
        content: `Message ${i}`,
        timestamp: Date.now() + i,
      }));
      
      await memoryService.saveConversation(largeMessageSet);

      // Should still perform well
      const start = Date.now();
      const messages = await memoryService.getRecentMessages(50);
      const duration = Date.now() - start;
      
      expect(messages).toHaveLength(50);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});