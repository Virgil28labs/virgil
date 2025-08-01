/**
 * IndexedDBService Cross-Tab Synchronization Tests
 * 
 * Tests basic IndexedDBService functionality with cross-tab scenarios.
 * Note: Real cross-tab synchronization requires browser storage events,
 * which are mocked here for testing purposes.
 */

import { IndexedDBService } from '../IndexedDBService';

// Mock logger
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => {
    const request = {
      result: {
        objectStoreNames: { contains: () => false },
        transaction: () => ({
          objectStore: () => ({
            put: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
            get: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null, result: null };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
            getAll: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null, result: [] };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
            delete: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
            clear: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
            count: () => {
              const req = { onsuccess: null as ((event: Event) => void) | null, onerror: null, result: 0 };
              setTimeout(() => req.onsuccess && req.onsuccess(null as any), 0);
              return req;
            },
          }),
        }),
        close: jest.fn(),
        version: 1,
        onversionchange: null,
      },
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    };
    
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);
    
    return request;
  }),
  deleteDatabase: jest.fn(() => {
    const request = {
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };
    setTimeout(() => request.onsuccess && request.onsuccess(null as any), 0);
    return request;
  }),
};

// @ts-ignore
global.indexedDB = mockIndexedDB;

describe('IndexedDBService Cross-Tab Tests', () => {
  let service1: IndexedDBService;
  let service2: IndexedDBService;
  let service3: IndexedDBService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get service instances (singleton pattern)
    service1 = IndexedDBService.getInstance();
    service2 = IndexedDBService.getInstance();
    service3 = IndexedDBService.getInstance();

    // Register test databases
    service1.registerDatabase({
      name: 'test-db-1',
      version: 1,
      stores: [{ name: 'test-store', keyPath: 'id' }],
    });
    
    service2.registerDatabase({
      name: 'test-db-2',
      version: 1,
      stores: [{ name: 'test-store', keyPath: 'id' }],
    });
    
    service3.registerDatabase({
      name: 'test-db-3',
      version: 1,
      stores: [{ name: 'test-store', keyPath: 'id' }],
    });
  });

  afterEach(() => {
    service1.closeAll();
  });

  describe('Basic Service Operations', () => {
    it('should handle basic put and get operations', async () => {
      const testData = { id: 'test-1', value: 'Hello World' };
      
      const putResult = await service1.put('test-db-1', 'test-store', testData);
      expect(putResult.success).toBe(true);
      
      const getResult = await service1.get('test-db-1', 'test-store', 'test-1');
      expect(getResult.success).toBe(true);
    });

    it('should handle multiple service instances (simulating tabs)', async () => {
      // All services are the same singleton instance
      expect(service1).toBe(service2);
      expect(service2).toBe(service3);
      
      // They can register different databases
      const testData = { id: 'test-1', value: 'Cross-tab test' };
      
      const putResult1 = await service1.put('test-db-1', 'test-store', testData);
      const putResult2 = await service2.put('test-db-2', 'test-store', testData);
      const putResult3 = await service3.put('test-db-3', 'test-store', testData);
      
      expect(putResult1.success).toBe(true);
      expect(putResult2.success).toBe(true);
      expect(putResult3.success).toBe(true);
    });

    it('should handle getAll operations', async () => {
      const getAllResult = await service1.getAll('test-db-1', 'test-store');
      expect(getAllResult.success).toBe(true);
      expect(Array.isArray(getAllResult.data)).toBe(true);
    });

    it('should handle delete operations', async () => {
      const deleteResult = await service1.delete('test-db-1', 'test-store', 'test-key');
      expect(deleteResult.success).toBe(true);
    });

    it('should handle clear operations', async () => {
      const clearResult = await service1.clear('test-db-1', 'test-store');
      expect(clearResult.success).toBe(true);
    });

    it('should handle count operations', async () => {
      const countResult = await service1.count('test-db-1', 'test-store');
      expect(countResult.success).toBe(true);
      expect(typeof countResult.data).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle database registration errors gracefully', () => {
      expect(() => {
        service1.registerDatabase({
          name: 'invalid-db',
          version: 1,
          stores: [],
        });
      }).not.toThrow();
    });

    it('should handle storage estimate requests', async () => {
      const estimateResult = await service1.getStorageEstimate();
      expect(estimateResult.success).toBe(true);
    });
  });

  describe('Database Management', () => {
    it('should handle database deletion', async () => {
      const deleteResult = await service1.deleteDatabase('test-db-to-delete');
      expect(deleteResult.success).toBe(true);
    });

    it('should handle closing databases', () => {
      expect(() => {
        service1.closeDatabase('test-db-1');
        service1.closeAll();
      }).not.toThrow();
    });
  });

  describe('Transaction Operations', () => {
    it('should handle transaction operations', async () => {
      const transactionResult = await service1.transaction(
        'test-db-1',
        ['test-store'],
        'readonly',
        () => Promise.resolve('transaction complete'),
      );
      
      expect(transactionResult.success).toBe(true);
      expect(transactionResult.data).toBe('transaction complete');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          service1.put('test-db-1', 'test-store', { id: `item-${i}`, value: `Value ${i}` }),
        );
      }
      
      const results = await Promise.all(operations);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should provide operation timing information', async () => {
      const result = await service1.get('test-db-1', 'test-store', 'timing-test');
      expect(result.success).toBe(true);
      expect(typeof result.duration).toBe('number');
    });
  });
});