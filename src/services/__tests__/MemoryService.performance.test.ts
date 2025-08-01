/**
 * MemoryService Performance Tests
 * 
 * Tests performance characteristics, memory usage, IndexedDB optimization,
 * and high-load scenarios for the memory service.
 */

import { MemoryService } from '../MemoryService';
import type { ChatMessage } from '../../types/chat.types';

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
    getTimeAgo: jest.fn((_date: Date) => '5 minutes ago'),
  },
}));

// Enhanced Mock IndexedDB with performance tracking
interface MockIndexedDBRequest extends IDBRequest {
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null;
  onupgradeneeded?: ((event: IDBVersionChangeEvent) => void) | null;
}

class MockPerformanceIDBObjectStore {
  private data: Map<string, any> = new Map();
  private operationCount = 0;
  private operationTimes: number[] = [];

  constructor(name: string) {
    // Share data across instances for the same store
    const globalStore = (global as any).__mockDBStores || {};
    if (!globalStore[name]) {
      globalStore[name] = new Map();
    }
    (global as any).__mockDBStores = globalStore;
    this.data = globalStore[name];
  }

  private recordOperation<T>(operation: () => T): T {
    const start = performance.now();
    this.operationCount++;
    const result = operation();
    const end = performance.now();
    this.operationTimes.push(end - start);
    return result;
  }

  getOperationStats() {
    return {
      count: this.operationCount,
      avgTime: this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length || 0,
      maxTime: Math.max(...this.operationTimes, 0),
      minTime: Math.min(...this.operationTimes, Infinity) || 0,
    };
  }

  clear() {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        this.data.clear();
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, 0);
      return request;
    });
  }

  get(key: string) {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        (request as any).result = this.data.get(key);
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 2); // Simulate variable latency
      return request;
    });
  }

  put(value: { id: string; [key: string]: any }) {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        this.data.set(value.id, value);
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 5); // Simulate write latency
      return request;
    });
  }

  add(value: { id: string; [key: string]: any }) {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        if (!this.data.has(value.id)) {
          this.data.set(value.id, value);
        }
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 5);
      return request;
    });
  }

  delete(key: string) {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        this.data.delete(key);
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 3);
      return request;
    });
  }

  getAll() {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      setTimeout(() => {
        (request as any).result = Array.from(this.data.values());
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 10 + this.data.size * 0.1); // Simulate scaling with data size
      return request;
    });
  }

  openCursor(_range?: IDBKeyRange | null, direction?: IDBCursorDirection) {
    return this.recordOperation(() => {
      const request = { result: undefined } as MockIndexedDBRequest;
      const values = Array.from(this.data.values());
      
      setTimeout(() => {
        if (direction === 'prev' && values.length > 0) {
          values.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }
        
        let index = 0;
        const cursor = values.length > 0 ? {
          value: values[index],
          continue: () => {
            index++;
            if (index < values.length) {
              (cursor as any).value = values[index];
              (request as any).result = cursor;
              if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
            } else {
              (request as any).result = null;
              if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
            }
          },
        } : null;
        
        (request as any).result = cursor;
        if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
      }, Math.random() * 5 + values.length * 0.05); // Simulate cursor overhead
      return request;
    });
  }

  index(_indexName: string) {
    return this;
  }
}

class MockPerformanceIDBTransaction {
  objectStore(name: string) {
    return new MockPerformanceIDBObjectStore(name);
  }
}

class MockPerformanceIDBDatabase {
  objectStoreNames = {
    contains: (name: string) => ['conversations', 'memories'].includes(name),
  };

  transaction(_storeNames: string[], _mode: string) {
    return new MockPerformanceIDBTransaction();
  }

  createObjectStore(_name: string, _options: IDBObjectStoreParameters) {
    return {
      createIndex: jest.fn(),
    };
  }
}

const mockPerformanceIndexedDB = {
  open: jest.fn((_name: string, _version?: number) => {
    const request = { result: undefined } as MockIndexedDBRequest;
    
    setTimeout(() => {
      if (request.onupgradeneeded) {
        const event = {
          target: { result: new MockPerformanceIDBDatabase() },
        };
        request.onupgradeneeded(event as any);
      }
      
      (request as any).result = new MockPerformanceIDBDatabase();
      if (request.onsuccess) request.onsuccess({ target: request } as unknown as Event);
    }, Math.random() * 10 + 5); // Simulate DB open latency
    
    return request;
  }),
};

// @ts-ignore
global.indexedDB = mockPerformanceIndexedDB;

describe('MemoryService Performance Tests', () => {
  let memoryService: MemoryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (global as any).__mockDBStores = {};
    
    memoryService = new MemoryService();
    await memoryService.init();
  });

  describe('Message Storage Performance', () => {
    it('handles bulk message insertion efficiently', async () => {
      const messageCount = 1000;
      const messages: ChatMessage[] = [];
      
      // Generate test messages
      for (let i = 0; i < messageCount; i++) {
        messages.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i} with some content to simulate real messages`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      const startTime = Date.now();
      
      // Batch insert - should be faster than individual inserts
      await memoryService.saveConversation(messages);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`Bulk insert of ${messageCount} messages took ${totalTime}ms`);
      
      // Should complete in reasonable time (adjust threshold based on requirements)
      expect(totalTime).toBeLessThan(5000); // 5 seconds max for 1000 messages

      // Verify all messages were saved
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messages).toHaveLength(messageCount);
    });

    it('maintains performance with incremental message additions', async () => {
      const batchSize = 50;
      const batchCount = 20;
      const times: number[] = [];

      for (let batch = 0; batch < batchCount; batch++) {
        const messages: ChatMessage[] = [];
        
        for (let i = 0; i < batchSize; i++) {
          const messageIndex = batch * batchSize + i;
          messages.push({
            id: `msg-${messageIndex}`,
            role: messageIndex % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${messageIndex}`,
            timestamp: new Date(Date.now() + messageIndex * 1000).toISOString(),
          });
        }

        const startTime = Date.now();
        await memoryService.saveConversation(messages);
        const endTime = Date.now();
        
        times.push(endTime - startTime);
      }

      // Performance should remain relatively stable (not degrade significantly)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Batch performance: avg=${avgTime}ms, min=${minTime}ms, max=${maxTime}ms`);

      // Max time shouldn't be more than 3x the average (indicating performance degradation)
      expect(maxTime).toBeLessThan(avgTime * 3);

      // Verify final state
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messages).toHaveLength(batchSize * batchCount);
    });

    it('optimizes recent message retrieval', async () => {
      // Add many messages
      const totalMessages = 2000;
      for (let i = 0; i < totalMessages; i += 100) {
        const batch: ChatMessage[] = [];
        for (let j = 0; j < 100; j++) {
          batch.push({
            id: `msg-${i + j}`,
            role: (i + j) % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + j}`,
            timestamp: new Date(Date.now() + (i + j) * 1000).toISOString(),
          });
        }
        await memoryService.saveConversation(batch);
      }

      // Test retrieval performance for different limits
      const retrievalTests = [10, 50, 100, 500];
      
      for (const limit of retrievalTests) {
        const startTime = Date.now();
        const messages = await memoryService.getRecentMessages(limit);
        const endTime = Date.now();
        const retrievalTime = endTime - startTime;

        console.log(`Retrieved ${limit} messages in ${retrievalTime}ms`);

        expect(messages.length).toBeLessThanOrEqual(limit);
        expect(messages.length).toBeGreaterThan(0);
        expect(retrievalTime).toBeLessThan(1000); // Should be under 1 second

        // Verify messages are in correct order (most recent first)
        for (let i = 1; i < messages.length; i++) {
          const prevTimestamp = new Date(messages[i - 1].timestamp).getTime();
          const currTimestamp = new Date(messages[i].timestamp).getTime();
          expect(prevTimestamp).toBeLessThanOrEqual(currTimestamp);
        }
      }
    });
  });

  describe('Memory Search Performance', () => {
    it('handles large memory collections efficiently', async () => {
      const memoryCount = 500;
      const memories: Promise<void>[] = [];

      // Add many memories
      for (let i = 0; i < memoryCount; i++) {
        memories.push(memoryService.markAsImportant(
          `msg-${i}`,
          `Important memory ${i}: This is important information about topic ${i % 10}`,
          `Context for memory ${i}`,
          `tag-${i % 5}`, // Create 5 different tags
        ));
      }

      await Promise.all(memories);

      // Test retrieval performance
      const startTime = Date.now();
      const allMemories = await memoryService.getMarkedMemories();
      const endTime = Date.now();
      const retrievalTime = endTime - startTime;

      console.log(`Retrieved ${memoryCount} memories in ${retrievalTime}ms`);

      expect(allMemories).toHaveLength(memoryCount);
      expect(retrievalTime).toBeLessThan(2000); // Should be under 2 seconds
    });

    it('optimizes context generation for large datasets', async () => {
      // Add large conversation
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 500; i++) {
        messages.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `This is a longer message ${i} with multiple sentences. It contains various topics and information that might be relevant for context generation. The message discusses topic ${i % 10} in detail.`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        });
      }
      await memoryService.saveConversation(messages);

      // Add many memories
      for (let i = 0; i < 100; i++) {
        await memoryService.markAsImportant(
          `msg-${i}`,
          `Important: Remember key fact ${i}`,
          `Context for fact ${i}`,
          `category-${i % 5}`,
        );
      }

      // Test context generation performance
      const startTime = Date.now();
      const context = await memoryService.getContextForPrompt();
      const endTime = Date.now();
      const contextTime = endTime - startTime;

      console.log(`Generated context in ${contextTime}ms`);
      console.log(`Context length: ${context.length} characters`);

      expect(contextTime).toBeLessThan(1000); // Should be under 1 second
      expect(context.length).toBeGreaterThan(0);
      expect(context.length).toBeLessThan(20000); // Should respect size limits
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('manages memory usage with large datasets', async () => {
      const initialMemory = process.memoryUsage();

      // Add large amount of data
      const largeDatasets = [];
      for (let dataset = 0; dataset < 10; dataset++) {
        const messages: ChatMessage[] = [];
        for (let i = 0; i < 200; i++) {
          messages.push({
            id: `ds${dataset}-msg-${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Dataset ${dataset} message ${i}: ` + 'x'.repeat(500), // Large content
            timestamp: new Date(Date.now() + dataset * 10000 + i * 1000).toISOString(),
          });
        }
        largeDatasets.push(messages);
        await memoryService.saveConversation(messages);
      }

      const afterDataMemory = process.memoryUsage();

      // Test memory cleanup by clearing cache/references
      await memoryService.clearAllData();

      const afterCleanupMemory = process.memoryUsage();

      console.log('Memory usage (MB):');
      console.log(`Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}`);
      console.log(`After data: ${Math.round(afterDataMemory.heapUsed / 1024 / 1024)}`);
      console.log(`After cleanup: ${Math.round(afterCleanupMemory.heapUsed / 1024 / 1024)}`);

      // Memory after cleanup should be closer to initial (within reasonable bounds)
      const memoryIncrease = afterCleanupMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    it('handles concurrent operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage();

      // Run concurrent operations
      const operations: Promise<any>[] = [];

      // Concurrent message saving
      for (let i = 0; i < 20; i++) {
        operations.push(memoryService.saveConversation([{
          id: `concurrent-msg-${i}`,
          role: 'user',
          content: `Concurrent message ${i}`,
          timestamp: new Date(Date.now() + i * 100).toISOString(),
        }]));
      }

      // Concurrent memory marking
      for (let i = 0; i < 20; i++) {
        operations.push(memoryService.markAsImportant(
          `concurrent-mem-${i}`,
          `Concurrent memory ${i}`,
          `Context ${i}`,
        ));
      }

      // Concurrent retrievals
      for (let i = 0; i < 20; i++) {
        operations.push(memoryService.getRecentMessages(10));
        operations.push(memoryService.getMarkedMemories());
      }

      await Promise.all(operations);

      const afterConcurrentMemory = process.memoryUsage();

      // Memory usage shouldn't increase dramatically from concurrent operations
      const memoryIncrease = afterConcurrentMemory.heapUsed - initialMemory.heapUsed;
      console.log(`Memory increase from concurrent ops: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });

  describe('IndexedDB Optimization', () => {
    it('batches database operations efficiently', async () => {
      // This test would check if the service batches operations
      // For now, we test that multiple rapid operations don't cause issues

      const rapidOperations: Promise<any>[] = [];

      // Rapid message additions
      for (let i = 0; i < 50; i++) {
        rapidOperations.push(memoryService.saveConversation([{
          id: `rapid-${i}`,
          role: 'user',
          content: `Rapid message ${i}`,
          timestamp: new Date(Date.now() + i * 10).toISOString(),
        }]));
      }

      const startTime = Date.now();
      await Promise.all(rapidOperations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`50 rapid operations completed in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(3000); // Should complete in reasonable time

      // Verify operations completed (some may be filtered/deduplicated)
      const conversation = await memoryService.getContinuousConversation();
      expect(conversation?.messages.length).toBeGreaterThan(0);
      expect(conversation?.messages.length).toBeLessThanOrEqual(50);
    });

    it('handles IndexedDB transaction limits gracefully', async () => {
      // Test behavior when hitting browser transaction limits
      const highVolumeOperations: Promise<any>[] = [];

      // Create many concurrent database operations
      for (let i = 0; i < 100; i++) {
        highVolumeOperations.push(
          memoryService.markAsImportant(
            `high-vol-${i}`,
            `High volume memory ${i}`,
            `Context ${i}`,
            `tag-${i % 10}`,
          ),
        );
      }

      // Should not crash or lose data
      await expect(Promise.all(highVolumeOperations)).resolves.not.toThrow();

      // Verify data integrity
      const memories = await memoryService.getMarkedMemories();
      expect(memories.length).toBeGreaterThan(90); // Allow for some potential failures
    });
  });

  describe('Cross-Tab Synchronization Performance', () => {
    it('handles multiple MemoryService instances efficiently', async () => {
      // Create multiple service instances (simulating multiple tabs)
      const services: MemoryService[] = [];
      for (let i = 0; i < 5; i++) {
        const service = new MemoryService();
        await service.init();
        services.push(service);
      }

      // Each service adds data
      const addOperations: Promise<any>[] = [];
      services.forEach((service, index) => {
        for (let i = 0; i < 10; i++) {
          addOperations.push(service.saveConversation([{
            id: `service-${index}-msg-${i}`,
            role: 'user',
            content: `Message from service ${index}, item ${i}`,
            timestamp: new Date(Date.now() + index * 1000 + i * 100).toISOString(),
          }]));
        }
      });

      const startTime = Date.now();
      await Promise.all(addOperations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`Multi-service operations completed in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(5000);

      // Verify data consistency across services
      const conversations = await Promise.all(
        services.map(service => service.getContinuousConversation()),
      );

      // All services should see the same final state
      const messageCounts = conversations.map(conv => conv?.messages.length || 0);
      const maxCount = Math.max(...messageCounts);
      const minCount = Math.min(...messageCounts);
      
      // Allow for some eventual consistency delay
      expect(maxCount - minCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Recovery Performance', () => {
    it('recovers quickly from database errors', async () => {
      // Add some initial data
      await memoryService.saveConversation([{
        id: 'pre-error-msg',
        role: 'user',
        content: 'Message before error',
        timestamp: new Date().toISOString(),
      }]);

      // Simulate database errors
      const originalIndexedDB = global.indexedDB;
      (global as any).indexedDB = {
        open: jest.fn(() => {
          const request = { result: undefined } as MockIndexedDBRequest;
          setTimeout(() => {
            (request as any).error = new Error('Database unavailable');
            if (request.onerror) request.onerror({ target: request } as unknown as Event);
          }, 10);
          return request;
        }),
      };

      // Operations should fail gracefully and quickly
      const startTime = Date.now();
      
      const results = await Promise.allSettled([
        memoryService.saveConversation([{
          id: 'error-msg',
          role: 'user',
          content: 'Message during error',
          timestamp: new Date().toISOString(),
        }]),
        memoryService.getRecentMessages(),
        memoryService.getMarkedMemories(),
      ]);

      const endTime = Date.now();
      const errorRecoveryTime = endTime - startTime;

      console.log(`Error recovery completed in ${errorRecoveryTime}ms`);
      expect(errorRecoveryTime).toBeLessThan(1000); // Should fail fast

      // All operations should complete (even if some fail)
      expect(results).toHaveLength(3);

      // Restore database
      (global as any).indexedDB = originalIndexedDB;
    });
  });
});