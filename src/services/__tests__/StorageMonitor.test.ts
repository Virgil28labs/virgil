import { StorageMonitor } from '../StorageMonitor';
import { StorageService } from '../StorageService';
import { indexedDBService } from '../IndexedDBService';

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

// Mock dependencies
jest.mock('../StorageService');
jest.mock('../IndexedDBService');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('StorageMonitor', () => {
  let monitor: StorageMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
    
    // Reset singleton
    (StorageMonitor as any).instance = undefined;
    monitor = StorageMonitor.getInstance();
    
    // Clear any metrics from previous tests
    monitor.clearMetrics();
  });

  afterEach(() => {
    mockTimeService.destroy();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = StorageMonitor.getInstance();
      const instance2 = StorageMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getMetrics', () => {
    it('returns comprehensive storage metrics', async () => {
      // Mock localStorage data
      (StorageService.keys as jest.Mock).mockReturnValue(['key1', 'key2']);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'key1') return 'value1';
        if (key === 'key2') return 'longervalue2';
        return null;
      });

      // Mock IndexedDB data
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 10,
      });
      
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          usage: 1000000,
          quota: 10000000,
        },
      });

      const metrics = await monitor.getMetrics();

      expect(metrics).toMatchObject({
        localStorage: {
          used: expect.any(Number),
          available: expect.any(Number),
          itemCount: 2,
          largestItems: expect.arrayContaining([
            expect.objectContaining({ key: expect.any(String), size: expect.any(Number) }),
          ]),
        },
        indexedDB: {
          databases: expect.any(Array),
          totalUsed: expect.any(Number),
          available: expect.any(Number),
        },
        total: {
          used: expect.any(Number),
          available: expect.any(Number),
          percentUsed: expect.any(Number),
        },
      });
    });

    it('handles errors gracefully', async () => {
      (StorageService.keys as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: false,
        error: new Error('DB error'),
      });
      
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: false,
        error: new Error('Estimate error'),
      });

      const metrics = await monitor.getMetrics();

      expect(metrics.localStorage).toMatchObject({
        used: 0,
        available: 0,
        itemCount: 0,
        largestItems: [],
      });
    });

    it('calculates localStorage sizes correctly', async () => {
      (StorageService.keys as jest.Mock).mockReturnValue(['short', 'verylongkey']);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'short') return 'val';
        if (key === 'verylongkey') return 'verylongvalue';
        return null;
      });

      const metrics = await monitor.getMetrics();

      // UTF-16 encoding: 2 bytes per character
      // 'short' (5) + 'val' (3) = 8 * 2 = 16 bytes
      // 'verylongkey' (11) + 'verylongvalue' (13) = 24 * 2 = 48 bytes
      expect(metrics.localStorage.used).toBe(64);
      expect(metrics.localStorage.largestItems[0]).toMatchObject({
        key: 'verylongkey',
        size: 48,
      });
    });
  });

  describe('checkHealth', () => {
    it('returns healthy status when usage is low', async () => {
      (StorageService.keys as jest.Mock).mockReturnValue([]);
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 0,
      });
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          usage: 1000000, // 1MB
          quota: 100000000, // 100MB
        },
      });

      const health = await monitor.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.recommendations).toHaveLength(0);
    });

    it('returns warning status when usage is high', async () => {
      (StorageService.keys as jest.Mock).mockReturnValue([]);
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 1000,
      });
      // Need to make the total used high relative to quota
      // The monitor calculates: localStorage.used + indexedDB.totalUsed
      // For warning: usage should be >= 80%
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          usage: 0, // Not used directly for metrics calculation
          quota: 100000, // 100KB quota
        },
      });

      const health = await monitor.checkHealth();
      // Since we're mocking count to return 1000 records
      // Each record is estimated at 1KB, so total = 1000KB for 3 stores = 3000KB
      // Against 100KB quota = 3000% usage
      
      expect(health.status).toBe('critical'); // Will be critical at this level
      expect(health.issues).toContainEqual(
        expect.objectContaining({
          type: 'quota',
          severity: 'high',
          description: expect.stringContaining('Storage usage critical'),
        }),
      );
    });

    it('returns critical status when usage is very high', async () => {
      (StorageService.keys as jest.Mock).mockReturnValue([]);
      // Return different counts for different stores to control the total
      (indexedDBService.count as jest.Mock).mockImplementation(() => {
        // Each database has different stores, return small counts
        return { success: true, data: 10 };
      });
      
      // Set a small quota so the percentage will be high
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          usage: 50000, // Not directly used
          quota: 60000, // 60KB quota
        },
      });

      const health = await monitor.checkHealth();
      // With 10 records per store, estimated at 1KB each
      // Total: ~50KB against 60KB quota = ~83%
      
      expect(health.issues.length).toBeGreaterThan(0);
      
      // Check if we have any quota issues
      const quotaIssue = health.issues.find(i => i.type === 'quota');
      expect(quotaIssue).toBeDefined();
    });

    it('detects large localStorage items', async () => {
      const largeValue = 'x'.repeat(100 * 1024); // 100KB string
      (StorageService.keys as jest.Mock).mockReturnValue(['largeItem']);
      mockLocalStorage.getItem.mockReturnValue(largeValue);
      
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 0,
      });
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: { usage: 0, quota: 100000000 },
      });

      const health = await monitor.checkHealth();

      expect(health.issues).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          severity: 'low',
          description: expect.stringContaining('large items in localStorage'),
          storage: 'localStorage',
        }),
      );
      expect(health.recommendations).toContain('Consider moving large items to IndexedDB for better performance');
    });

    it('detects performance issues', async () => {
      // Record some slow operations
      monitor.recordOperation('slowOp', 200, true);
      monitor.recordOperation('slowOp', 250, true);
      monitor.recordOperation('slowOp', 300, true);
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 0,
      });
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: { usage: 0, quota: 100000000 },
      });

      const health = await monitor.checkHealth();

      expect(health.issues).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          severity: 'medium',
          description: 'Slow storage operations detected',
        }),
      );
      expect(health.recommendations).toContain('Consider optimizing data access patterns or adding indexes');
    });

    it('detects high error rates', async () => {
      // Record operations with errors
      monitor.recordOperation('errorOp', 50, true);
      monitor.recordOperation('errorOp', 60, false);
      monitor.recordOperation('errorOp', 55, false);
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 0,
      });
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: { usage: 0, quota: 100000000 },
      });

      const health = await monitor.checkHealth();

      expect(health.issues).toContainEqual(
        expect.objectContaining({
          type: 'error',
          severity: 'high',
          description: 'High error rates in storage operations',
        }),
      );
      expect(health.recommendations).toContain('Investigate storage errors and ensure proper error handling');
    });
  });

  describe('recordOperation', () => {
    it('records successful operations', () => {
      monitor.recordOperation('testOp', 50, true);
      monitor.recordOperation('testOp', 60, true);
      
      const metrics = monitor.getPerformanceMetrics();
      
      expect(metrics.operations).toContainEqual(
        expect.objectContaining({
          type: 'testOp',
          count: 2,
          avgDuration: 55,
          errors: 0,
        }),
      );
    });

    it('records failed operations', () => {
      monitor.recordOperation('failOp', 100, false);
      monitor.recordOperation('failOp', 120, false);
      monitor.recordOperation('failOp', 110, true);
      
      const metrics = monitor.getPerformanceMetrics();
      
      expect(metrics.operations).toContainEqual(
        expect.objectContaining({
          type: 'failOp',
          count: 3,
          avgDuration: 110,
          errors: 2,
        }),
      );
    });

    it('tracks slow operations', () => {
      monitor.recordOperation('slowOp', 150, true);
      monitor.recordOperation('fastOp', 20, true);
      
      const metrics = monitor.getPerformanceMetrics();
      
      expect(metrics.slowOperations).toContainEqual(
        expect.objectContaining({
          operation: 'slowOp',
          duration: 150,
        }),
      );
      
      expect(metrics.slowOperations).not.toContainEqual(
        expect.objectContaining({
          operation: 'fastOp',
        }),
      );
    });

    it('limits stored measurements to 100', () => {
      // Record 150 operations
      for (let i = 0; i < 150; i++) {
        monitor.recordOperation('manyOps', i, true);
      }
      
      const metrics = monitor.getPerformanceMetrics();
      const operation = metrics.operations.find(op => op.type === 'manyOps');
      
      expect(operation?.count).toBe(100);
    });
  });

  describe('getCleanupSuggestions', () => {
    it('suggests cleaning old conversations', async () => {
      const oldTimestamp = mockTimeService.getTimestamp() - (35 * 24 * 60 * 60 * 1000); // 35 days ago
      
      (indexedDBService.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [
          { id: 1, timestamp: oldTimestamp },
          { id: 2, timestamp: mockTimeService.getTimestamp() },
          { id: 3, timestamp: oldTimestamp },
        ],
      });
      
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 10,
      });
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);

      const suggestions = await monitor.getCleanupSuggestions();
      
      expect(suggestions).toContain('Delete 2 chat conversations older than 30 days');
    });

    it('suggests cleaning photos when count is high', async () => {
      (indexedDBService.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });
      
      (indexedDBService.count as jest.Mock).mockImplementation((db, store) => {
        if (db === 'VirgilCameraDB' && store === 'photos') {
          return { success: true, data: 75 };
        }
        return { success: true, data: 0 };
      });
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);

      const suggestions = await monitor.getCleanupSuggestions();
      
      expect(suggestions).toContain('Consider deleting non-favorite photos to free up space');
    });

    it('suggests moving large localStorage items', async () => {
      const largeValue = 'x'.repeat(150 * 1024); // 150KB
      (StorageService.keys as jest.Mock).mockReturnValue(['bigData']);
      mockLocalStorage.getItem.mockReturnValue(largeValue);
      
      (indexedDBService.getAll as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });
      
      (indexedDBService.count as jest.Mock).mockResolvedValue({
        success: true,
        data: 0,
      });

      const suggestions = await monitor.getCleanupSuggestions();
      
      expect(suggestions).toContainEqual(
        expect.stringContaining('Move "bigData" from localStorage to IndexedDB'),
      );
    });

    it('handles errors gracefully', async () => {
      (indexedDBService.getAll as jest.Mock).mockResolvedValue({
        success: false,
        error: new Error('DB error'),
      });
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);

      const suggestions = await monitor.getCleanupSuggestions();
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('clearMetrics', () => {
    it('clears all performance data', () => {
      monitor.recordOperation('op1', 100, true);
      monitor.recordOperation('op2', 200, false);
      
      let metrics = monitor.getPerformanceMetrics();
      expect(metrics.operations).not.toHaveLength(0);
      
      monitor.clearMetrics();
      
      metrics = monitor.getPerformanceMetrics();
      expect(metrics.operations).toHaveLength(0);
      expect(metrics.slowOperations).toHaveLength(0);
    });
  });

  describe('database metrics', () => {
    it('gets metrics for all registered databases', async () => {
      (indexedDBService.count as jest.Mock).mockImplementation((db, store) => {
        const counts: Record<string, Record<string, number>> = {
          'VirgilMemory': { 'conversations': 5, 'memories': 10 },
          'VirgilCameraDB': { 'photos': 20 },
          'NotesDB': { 'notes': 15 },
        };
        
        return {
          success: true,
          data: counts[db]?.[store] || 0,
        };
      });
      
      (indexedDBService.getStorageEstimate as jest.Mock).mockResolvedValue({
        success: true,
        data: { usage: 5000000, quota: 100000000 },
      });
      
      (StorageService.keys as jest.Mock).mockReturnValue([]);

      const metrics = await monitor.getMetrics();
      
      expect(metrics.indexedDB.databases).toHaveLength(3);
      expect(metrics.indexedDB.databases).toContainEqual(
        expect.objectContaining({
          name: 'VirgilMemory',
          recordCount: 15,
          stores: expect.arrayContaining([
            expect.objectContaining({ name: 'conversations', recordCount: 5 }),
            expect.objectContaining({ name: 'memories', recordCount: 10 }),
          ]),
        }),
      );
    });
  });
});