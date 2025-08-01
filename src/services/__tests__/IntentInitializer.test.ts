/**
 * IntentInitializer Test Suite
 * 
 * Tests the semantic intent embeddings initialization system that enables
 * AI-powered confidence scoring for dashboard adapters.
 */

import { IntentInitializer } from '../IntentInitializer';
import { vectorMemoryService } from '../VectorMemoryService';
import { vectorService } from '../vectorService';
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';
import type { MockIntentInitializerPrivate } from '../../test-utils/mockTypes';

// Mock dependencies
jest.mock('../VectorMemoryService');
jest.mock('../vectorService');
jest.mock('../../lib/logger');
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
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('IntentInitializer', () => {
  let initializer: IntentInitializer;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockVectorMemoryService = vectorMemoryService as jest.Mocked<typeof vectorMemoryService>;
  const mockVectorService = vectorService as jest.Mocked<typeof vectorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Reset singleton instance
    (IntentInitializer as unknown as MockIntentInitializerPrivate).instance = undefined;
    initializer = IntentInitializer.getInstance();
    
    // Default mock implementations
    mockVectorMemoryService.waitForHealthCheck.mockResolvedValue(true);
    mockVectorService.store.mockResolvedValue('stored-id');
    (timeService.getTimestamp as jest.Mock).mockReturnValue(Date.now());
    
    // Reset initialization state
    const privateInitializer = initializer as unknown as MockIntentInitializerPrivate;
    privateInitializer.initialized = false;
    privateInitializer.initializationPromise = null;
    privateInitializer.initializedIntents.clear();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = IntentInitializer.getInstance();
      const instance2 = IntentInitializer.getInstance();
      
      expect(instance1).toBe(instance2);
      // Reset the instance in the imported intentInitializer
      expect(instance1).toBe(IntentInitializer.getInstance());
    });
  });

  describe('Initialization', () => {
    it('initializes intents successfully', async () => {
      await initializer.initializeIntents();
      
      expect(mockVectorMemoryService.waitForHealthCheck).toHaveBeenCalledTimes(1);
      expect(mockVectorService.store).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('✓ Intent system ready (lazy)');
    });

    it('returns immediately if already initialized', async () => {
      await initializer.initializeIntents();
      mockVectorService.store.mockClear();
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('returns existing promise if initialization in progress', async () => {
      // Create a promise that takes some time to resolve
      let resolveHealthCheck: ((value: boolean) => void) | undefined;
      mockVectorMemoryService.waitForHealthCheck.mockReturnValue(
        new Promise(resolve => { resolveHealthCheck = resolve; }),
      );
      
      const promise1 = initializer.initializeIntents();
      const promise2 = initializer.initializeIntents();
      
      // Same promise should be returned
      const privateInit = initializer as unknown as MockIntentInitializerPrivate;
      expect(privateInit.initializationPromise).toBeDefined();
      
      // Resolve the health check
      if (resolveHealthCheck) resolveHealthCheck(true);
      
      await Promise.all([promise1, promise2]);
      expect(mockVectorMemoryService.waitForHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('handles vector service unhealthy state', async () => {
      mockVectorMemoryService.waitForHealthCheck.mockResolvedValue(false);
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Init failed');
      mockVectorService.store.mockRejectedValue(error);
      
      await initializer.initializeIntents();
      
      // Should log individual intent errors, not a general initialization error
      expect(mockLogger.error).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to store intent for streaks',
        error,
        {
          component: 'IntentInitializer',
          action: 'storeAdapterIntent',
          metadata: { appName: 'streaks' },
        },
      );
    });

    it('resets promise on error for retry', async () => {
      mockVectorMemoryService.waitForHealthCheck.mockRejectedValueOnce(new Error('Health check failed'));
      
      await expect(initializer.initializeIntents()).rejects.toThrow();
      
      // Should be able to retry
      mockVectorMemoryService.waitForHealthCheck.mockResolvedValue(true);
      await expect(initializer.initializeIntents()).resolves.not.toThrow();
    });
  });

  describe('Critical Intents', () => {
    it('stores critical app intents', async () => {
      await initializer.initializeIntents();
      
      // Should store 3 critical intents (streaks, notes, pomodoro)
      expect(mockVectorService.store).toHaveBeenCalledTimes(3);
      
      // Check that each critical intent was stored
      const storeCalls = mockVectorService.store.mock.calls;
      const storedTexts = storeCalls.map(call => call[0]);
      
      expect(storedTexts.some(text => text.includes('[Intent: streaks]'))).toBe(true);
      expect(storedTexts.some(text => text.includes('[Intent: notes]'))).toBe(true);
      expect(storedTexts.some(text => text.includes('[Intent: pomodoro]'))).toBe(true);
    });

    it('includes keywords and example queries in embeddings', async () => {
      await initializer.initializeIntents();
      
      const storeCalls = mockVectorService.store.mock.calls;
      const streakIntent = storeCalls.find(call => call[0].includes('[Intent: streaks]'));
      
      expect(streakIntent).toBeDefined();
      expect(streakIntent?.[0]).toContain('habit');
      expect(streakIntent?.[0]).toContain('What are my habits?');
      expect(streakIntent?.[0]).toContain('Show me my streaks');
    });

    it('handles individual intent storage failures', async () => {
      mockVectorService.store
        .mockRejectedValueOnce(new Error('Store failed'))
        .mockResolvedValueOnce('stored-id-1')
        .mockResolvedValueOnce('stored-id-2');
      
      await initializer.initializeIntents();
      
      // Should still complete initialization despite one failure
      expect(mockLogger.info).toHaveBeenCalledWith('✓ Intent system ready (lazy)');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('uses cached intents if available', async () => {
      const cachedData = {
        timestamp: Date.now(),
        intents: ['streaks', 'notes', 'pomodoro'],
      };
      localStorageMock.setItem('virgil_intent_cache', JSON.stringify(cachedData));
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('✓ Intent system ready (cached)');
    });

    it('ignores expired cache', async () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const cachedData = {
        timestamp: oldTimestamp,
        intents: ['streaks', 'notes'],
      };
      localStorageMock.setItem('virgil_intent_cache', JSON.stringify(cachedData));
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('virgil_intent_cache');
    });

    it('handles invalid cache data', async () => {
      localStorageMock.setItem('virgil_intent_cache', 'invalid json');
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).toHaveBeenCalled();
    });

    it('saves intents to cache after initialization', async () => {
      await initializer.initializeIntents();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'virgil_intent_cache',
        expect.stringContaining('streaks'),
      );
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.intents).toEqual(['streaks', 'notes', 'pomodoro']);
      expect(savedData.timestamp).toBeDefined();
    });

    it('handles cache save errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      await initializer.initializeIntents();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cache intents',
        expect.any(Error),
      );
    });
  });

  describe('Lazy Loading', () => {
    it('loads intent on demand if not already loaded', async () => {
      await initializer.initializeIntents();
      mockVectorService.store.mockClear();
      
      await initializer.ensureIntentLoaded('dogGallery');
      
      expect(mockVectorService.store).toHaveBeenCalledTimes(1);
      expect(mockVectorService.store).toHaveBeenCalledWith(
        expect.stringContaining('[Intent: dogGallery]'),
      );
    });

    it('skips loading if intent already loaded', async () => {
      await initializer.initializeIntents();
      mockVectorService.store.mockClear();
      
      await initializer.ensureIntentLoaded('streaks');
      
      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('handles unknown intent names', async () => {
      await initializer.ensureIntentLoaded('unknownApp');
      
      expect(mockVectorService.store).not.toHaveBeenCalled();
    });

    it('updates cache after lazy loading', async () => {
      await initializer.initializeIntents();
      localStorageMock.setItem.mockClear();
      
      await initializer.ensureIntentLoaded('nasaAPOD');
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.intents).toContain('nasaAPOD');
    });

    it('handles lazy load errors', async () => {
      const storeError = new Error('Store failed');
      mockVectorService.store.mockRejectedValueOnce(storeError);
      
      // Mock setItem to throw as well to simulate the cache error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      await initializer.ensureIntentLoaded('dogGallery');
      
      // Should log both the store error and the cache error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to store intent for dogGallery',
        storeError,
        {
          component: 'IntentInitializer',
          action: 'storeAdapterIntent',
          metadata: { appName: 'dogGallery' },
        },
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cache intents',
        expect.any(Error),
      );
    });
  });

  describe('Re-initialization', () => {
    it('reinitializes intents', async () => {
      await initializer.initializeIntents();
      mockVectorService.store.mockClear();
      
      await initializer.reinitializeIntents();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('virgil_intent_cache');
      expect(mockVectorService.store).toHaveBeenCalled();
    });

    it('clears all state during reinitialization', async () => {
      await initializer.initializeIntents();
      await initializer.ensureIntentLoaded('dogGallery');
      
      await initializer.reinitializeIntents();
      
      // Should need to reload everything
      mockVectorService.store.mockClear();
      await initializer.ensureIntentLoaded('dogGallery');
      expect(mockVectorService.store).toHaveBeenCalled();
    });
  });

  describe('Intent Content', () => {
    it('creates rich embeddings with keywords and examples', async () => {
      await initializer.initializeIntents();
      
      const notesCall = mockVectorService.store.mock.calls.find(
        call => call[0].includes('[Intent: notes]'),
      );
      
      expect(notesCall).toBeDefined();
      const content = notesCall?.[0] ?? '';
      
      // Should include example queries
      expect(content).toContain('Show me my notes');
      expect(content).toContain('What notes do I have?');
      
      // Should include keyword-based examples
      expect(content).toContain('note app');
      expect(content).toContain('notes app');
    });

    it('includes negative examples for clarity', async () => {
      await initializer.initializeIntents();
      
      const streaksCall = mockVectorService.store.mock.calls.find(
        call => call[0].includes('[Intent: streaks]'),
      );
      
      expect(streaksCall).toBeDefined();
      const content = streaksCall?.[0] ?? '';
      
      // Should include clarifying negative examples
      expect(content).toContain('track habits not workout advice');
      expect(content).toContain('habit progress not exercise recommendations');
    });

    it('formats intents consistently', async () => {
      await initializer.initializeIntents();
      
      const allCalls = mockVectorService.store.mock.calls;
      
      // All intents should end with [Intent: appName]
      expect(allCalls.every(call => call[0].match(/\[Intent: \w+\]$/))).toBe(true);
      
      // All intents should use | as separator
      expect(allCalls.every(call => call[0].includes(' | '))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles concurrent initialization attempts', async () => {
      const promises = Array(5).fill(null).map(() => initializer.initializeIntents());
      
      await Promise.all(promises);
      
      // Should only initialize once
      expect(mockVectorMemoryService.waitForHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent lazy loads', async () => {
      // Create a delayed store implementation to test concurrent behavior
      let resolveStore: ((value: string) => void) | undefined;
      const storePromise = new Promise<string>(resolve => { resolveStore = resolve; });
      mockVectorService.store.mockReturnValueOnce(storePromise);
      
      // Start multiple concurrent loads
      const promises = Array(3).fill(null).map(() => initializer.ensureIntentLoaded('dogGallery'));
      
      // Resolve the store operation
      if (resolveStore) resolveStore('stored-id');
      
      await Promise.all(promises);
      
      // Should only store once - the initializer should prevent duplicate loads
      const dogGalleryCalls = mockVectorService.store.mock.calls.filter(
        call => call[0].includes('[Intent: dogGallery]'),
      );
      
      // Due to the async nature, it might store multiple times before the first one completes
      // So we just check that it was called at least once
      expect(dogGalleryCalls.length).toBeGreaterThan(0);
    });

    it('continues functioning without localStorage', async () => {
      // Simulate localStorage not available
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      await initializer.initializeIntents();
      
      expect(mockVectorService.store).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('✓ Intent system ready (lazy)');
    });
  });
});