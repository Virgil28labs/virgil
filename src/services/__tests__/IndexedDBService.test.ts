import { IndexedDBService } from '../IndexedDBService';

// Mock IndexedDB
const mockDatabase = {
  version: 1,
  objectStoreNames: {
    contains: jest.fn(),
  },
  transaction: jest.fn(),
  close: jest.fn(),
  onversionchange: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  count: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null,
  error: null,
};

const mockIndex = {
  getAll: jest.fn(),
};

const mockRequest: any = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

const mockOpenDBRequest: any = {
  ...mockRequest,
  result: mockDatabase,
};

const mockIndexedDB = {
  open: jest.fn(() => mockOpenDBRequest),
  deleteDatabase: jest.fn(() => mockRequest),
};

// Mock navigator.storage
const mockStorage = {
  estimate: jest.fn(),
};

// Replace globals
(global as any).indexedDB = mockIndexedDB;
(global as any).navigator = {
  storage: mockStorage,
};
(global as any).performance = {
  now: jest.fn(() => Date.now()),
};

describe('IndexedDBService', () => {
  let service: IndexedDBService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get a fresh instance by clearing the singleton
    (IndexedDBService as any).instance = undefined;
    service = IndexedDBService.getInstance();
    
    // Reset mock behavior
    mockDatabase.objectStoreNames.contains.mockReturnValue(false);
    mockDatabase.transaction.mockReturnValue(mockTransaction);
    mockObjectStore.index.mockReturnValue(mockIndex);
  });

  describe('getInstance', () => {
    it('returns the same instance (singleton)', () => {
      const instance1 = IndexedDBService.getInstance();
      const instance2 = IndexedDBService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerDatabase', () => {
    it('registers a database configuration', () => {
      const config = {
        name: 'TestDB',
        version: 1,
        stores: [
          {
            name: 'testStore',
            keyPath: 'id',
            indexes: [
              { name: 'timestamp', keyPath: 'timestamp' },
            ],
          },
        ],
      };

      service.registerDatabase(config);
      
      // Verify by attempting to connect (will use the registered config)
      (service as any).getDatabase('TestDB');
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('TestDB', 1);
    });
  });

  describe('database operations', () => {
    beforeEach(() => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [
          {
            name: 'testStore',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
              { name: 'timestamp', keyPath: 'timestamp' },
            ],
          },
        ],
      });
    });

    describe('getAll', () => {
      it('retrieves all records successfully', async () => {
        const mockData = [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ];
        
        mockObjectStore.getAll.mockImplementation(() => {
          const req = { ...mockRequest, result: mockData };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.getAll('TestDB', 'testStore');
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        expect(mockDatabase.transaction).toHaveBeenCalledWith(['testStore'], 'readonly');
      });

      it('handles errors gracefully', async () => {
        mockObjectStore.getAll.mockImplementation(() => {
          const req = { ...mockRequest, error: new Error('Failed') };
          setTimeout(() => req.onerror?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.getAll('TestDB', 'testStore');
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('get', () => {
      it('retrieves a single record by key', async () => {
        const mockData = { id: 1, name: 'Item 1' };
        
        mockObjectStore.get.mockImplementation(() => {
          const req = { ...mockRequest, result: mockData };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.get('TestDB', 'testStore', 1);
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        expect(mockObjectStore.get).toHaveBeenCalledWith(1);
      });

      it('returns undefined for non-existent key', async () => {
        mockObjectStore.get.mockImplementation(() => {
          const req = { ...mockRequest, result: undefined };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.get('TestDB', 'testStore', 999);
        
        expect(result.success).toBe(true);
        expect(result.data).toBeUndefined();
      });
    });

    describe('add', () => {
      it('adds a new record successfully', async () => {
        const newData = { name: 'New Item' };
        const generatedKey = 1;
        
        mockObjectStore.add.mockImplementation(() => {
          const req = { ...mockRequest, result: generatedKey };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.add('TestDB', 'testStore', newData);
        
        expect(result.success).toBe(true);
        expect(result.data).toBe(generatedKey);
        expect(mockObjectStore.add).toHaveBeenCalledWith(newData);
      });

      it('handles duplicate key errors', async () => {
        mockObjectStore.add.mockImplementation(() => {
          const req = { ...mockRequest, error: new Error('Key already exists') };
          setTimeout(() => req.onerror?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.add('TestDB', 'testStore', { id: 1 });
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to add');
      });
    });

    describe('put', () => {
      it('updates an existing record', async () => {
        const updatedData = { id: 1, name: 'Updated Item' };
        
        mockObjectStore.put.mockImplementation(() => {
          const req = { ...mockRequest, result: 1 };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.put('TestDB', 'testStore', updatedData);
        
        expect(result.success).toBe(true);
        expect(result.data).toBe(1);
        expect(mockObjectStore.put).toHaveBeenCalledWith(updatedData);
      });
    });

    describe('delete', () => {
      it('deletes a record by key', async () => {
        mockObjectStore.delete.mockImplementation(() => {
          const req = { ...mockRequest };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.delete('TestDB', 'testStore', 1);
        
        expect(result.success).toBe(true);
        expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
      });
    });

    describe('clear', () => {
      it('clears all records from a store', async () => {
        mockObjectStore.clear.mockImplementation(() => {
          const req = { ...mockRequest };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.clear('TestDB', 'testStore');
        
        expect(result.success).toBe(true);
        expect(mockObjectStore.clear).toHaveBeenCalled();
      });
    });

    describe('count', () => {
      it('counts records in a store', async () => {
        const recordCount = 42;
        
        mockObjectStore.count.mockImplementation(() => {
          const req = { ...mockRequest, result: recordCount };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.count('TestDB', 'testStore');
        
        expect(result.success).toBe(true);
        expect(result.data).toBe(recordCount);
      });
    });

    describe('query', () => {
      it('queries records using an index', async () => {
        const mockData = [
          { id: 1, timestamp: 1000 },
          { id: 2, timestamp: 2000 },
        ];
        
        mockIndex.getAll.mockImplementation(() => {
          const req = { ...mockRequest, result: mockData };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.query('TestDB', 'testStore', 'timestamp');
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        expect(mockObjectStore.index).toHaveBeenCalledWith('timestamp');
      });

      it('queries with a key range', async () => {
        const keyRange = IDBKeyRange.bound(1000, 2000);
        const mockData = [{ id: 1, timestamp: 1500 }];
        
        mockIndex.getAll.mockImplementation(() => {
          const req = { ...mockRequest, result: mockData };
          setTimeout(() => req.onsuccess?.());
          return req;
        });

        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.query('TestDB', 'testStore', 'timestamp', keyRange);
        
        expect(result.success).toBe(true);
        expect(mockIndex.getAll).toHaveBeenCalledWith(keyRange);
      });
    });

    describe('transaction', () => {
      it('executes a custom transaction', async () => {
        const customResult = { success: true };
        
        mockOpenDBRequest.onsuccess?.();
        
        const result = await service.transaction(
          'TestDB',
          ['testStore'],
          'readwrite',
          async (transaction) => {
            expect(transaction).toBe(mockTransaction);
            return customResult;
          },
        );
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(customResult);
        expect(mockDatabase.transaction).toHaveBeenCalledWith(['testStore'], 'readwrite');
      });
    });
  });

  describe('connection management', () => {
    it('reuses existing database connections', async () => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [],
      });

      mockOpenDBRequest.onsuccess?.();
      
      // First call
      await service.get('TestDB', 'store', 1);
      
      // Second call should reuse connection
      await service.get('TestDB', 'store', 2);
      
      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1);
    });

    it('handles version changes', async () => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [],
      });

      mockOpenDBRequest.onsuccess?.();
      
      // Simulate version change
      mockDatabase.onversionchange?.();
      
      expect(mockDatabase.close).toHaveBeenCalled();
    });

    it('handles upgrade needed event', async () => {
      const storeConfig = {
        name: 'newStore',
        keyPath: 'id',
        indexes: [
          { 
            name: 'testIndex', 
            keyPath: 'testField',
            options: { unique: true },
          },
        ],
      };

      service.registerDatabase({
        name: 'TestDB',
        version: 2,
        stores: [storeConfig],
      });

      const mockStore = {
        createIndex: jest.fn(),
      };
      
      const mockUpgradeDB = {
        objectStoreNames: { contains: jest.fn(() => false) },
        createObjectStore: jest.fn(() => mockStore),
      };

      // Trigger upgrade
      mockOpenDBRequest.onupgradeneeded?.({
        target: { result: mockUpgradeDB },
      } as any);

      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('newStore', {
        keyPath: 'id',
        autoIncrement: undefined,
      });
      
      expect(mockStore.createIndex).toHaveBeenCalledWith(
        'testIndex',
        'testField',
        { unique: true },
      );
    });
  });

  describe('error handling and retry', () => {
    it('retries failed operations', async () => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [{ name: 'testStore' }],
      });

      let attempts = 0;
      mockObjectStore.get.mockImplementation(() => {
        attempts++;
        const req = { ...mockRequest };
        
        if (attempts < 3) {
          req.error = new Error('Temporary failure');
          setTimeout(() => req.onerror?.());
        } else {
          req.result = { id: 1, name: 'Success after retry' };
          setTimeout(() => req.onsuccess?.());
        }
        
        return req;
      });

      // Speed up test by reducing retry delay
      (service as any).retryDelay = 10;
      
      mockOpenDBRequest.onsuccess?.();
      
      const result = await service.get('TestDB', 'testStore', 1);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Success after retry' });
      expect(attempts).toBe(3);
    });

    it('fails after max retries', async () => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [{ name: 'testStore' }],
      });

      mockObjectStore.get.mockImplementation(() => {
        const req = { ...mockRequest, error: new Error('Permanent failure') };
        setTimeout(() => req.onerror?.());
        return req;
      });

      // Speed up test
      (service as any).retryDelay = 10;
      (service as any).retryAttempts = 2;
      
      mockOpenDBRequest.onsuccess?.();
      
      const result = await service.get('TestDB', 'testStore', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles database not registered error', async () => {
      await expect(service.get('UnregisteredDB', 'store', 1)).rejects.toThrow(
        'Database UnregisteredDB not registered',
      );
    });
  });

  describe('utility methods', () => {
    describe('getStorageEstimate', () => {
      it('returns storage estimate when available', async () => {
        const mockEstimate = {
          usage: 1000000,
          quota: 10000000,
        };
        
        mockStorage.estimate.mockResolvedValue(mockEstimate);
        
        const result = await service.getStorageEstimate();
        
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockEstimate);
      });

      it('returns null when storage API not available', async () => {
        (global as any).navigator = {};
        
        const result = await service.getStorageEstimate();
        
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
        
        // Restore
        (global as any).navigator = { storage: mockStorage };
      });

      it('handles storage estimate errors', async () => {
        mockStorage.estimate.mockRejectedValue(new Error('Storage error'));
        
        const result = await service.getStorageEstimate();
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Storage error');
      });
    });

    describe('closeDatabase', () => {
      it('closes a specific database connection', async () => {
        service.registerDatabase({
          name: 'TestDB',
          version: 1,
          stores: [],
        });

        mockOpenDBRequest.onsuccess?.();
        
        // Establish connection
        await service.get('TestDB', 'store', 1);
        
        service.closeDatabase('TestDB');
        
        expect(mockDatabase.close).toHaveBeenCalled();
      });

      it('handles closing non-existent database gracefully', () => {
        expect(() => service.closeDatabase('NonExistent')).not.toThrow();
      });
    });

    describe('closeAll', () => {
      it('closes all database connections', async () => {
        service.registerDatabase({
          name: 'DB1',
          version: 1,
          stores: [],
        });
        
        service.registerDatabase({
          name: 'DB2',
          version: 1,
          stores: [],
        });

        const mockDB1 = { ...mockDatabase, close: jest.fn() };
        const mockDB2 = { ...mockDatabase, close: jest.fn() };
        
        // Simulate different databases
        let callCount = 0;
        mockIndexedDB.open.mockImplementation(() => {
          callCount++;
          return {
            ...mockOpenDBRequest,
            result: callCount === 1 ? mockDB1 : mockDB2,
          };
        });

        // Establish connections
        mockOpenDBRequest.onsuccess?.();
        await service.get('DB1', 'store', 1);
        
        mockOpenDBRequest.onsuccess?.();
        await service.get('DB2', 'store', 1);
        
        service.closeAll();
        
        expect(mockDB1.close).toHaveBeenCalled();
        expect(mockDB2.close).toHaveBeenCalled();
      });
    });

    describe('deleteDatabase', () => {
      it('deletes a database successfully', async () => {
        const deleteRequest = { ...mockRequest };
        mockIndexedDB.deleteDatabase.mockReturnValue(deleteRequest);
        
        setTimeout(() => deleteRequest.onsuccess?.(), 0);
        
        const result = await service.deleteDatabase('TestDB');
        
        expect(result.success).toBe(true);
        expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('TestDB');
      });

      it('handles delete errors', async () => {
        const deleteRequest = { ...mockRequest, error: new Error('Delete failed') };
        mockIndexedDB.deleteDatabase.mockReturnValue(deleteRequest);
        
        setTimeout(() => deleteRequest.onerror?.(), 0);
        
        const result = await service.deleteDatabase('TestDB');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to delete database');
      });

      it('closes connection before deleting', async () => {
        service.registerDatabase({
          name: 'TestDB',
          version: 1,
          stores: [],
        });

        mockOpenDBRequest.onsuccess?.();
        await service.get('TestDB', 'store', 1);
        
        const deleteRequest = { ...mockRequest };
        mockIndexedDB.deleteDatabase.mockReturnValue(deleteRequest);
        setTimeout(() => deleteRequest.onsuccess?.(), 0);
        
        await service.deleteDatabase('TestDB');
        
        expect(mockDatabase.close).toHaveBeenCalled();
      });
    });
  });

  describe('performance tracking', () => {
    it('includes duration in operation results', async () => {
      service.registerDatabase({
        name: 'TestDB',
        version: 1,
        stores: [{ name: 'testStore' }],
      });

      let timeCounter = 0;
      (global.performance.now as jest.Mock).mockImplementation(() => {
        return timeCounter += 100;
      });

      mockObjectStore.get.mockImplementation(() => {
        const req = { ...mockRequest, result: { id: 1 } };
        setTimeout(() => req.onsuccess?.());
        return req;
      });

      mockOpenDBRequest.onsuccess?.();
      
      const result = await service.get('TestDB', 'testStore', 1);
      
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});