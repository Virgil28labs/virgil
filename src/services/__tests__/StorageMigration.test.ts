/**
 * StorageMigration Test Suite
 * 
 * Tests the storage migration service that handles migration of localStorage
 * values from plain strings to JSON format with integrity validation.
 */

import { StorageMigration } from '../StorageMigration';
import { StorageService } from '../StorageService';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../StorageService', () => ({
  StorageService: {
    get: jest.fn(),
    set: jest.fn(),
  },
  STORAGE_KEYS: {
    SELECTED_MODEL: 'virgil-selected-model',
    CUSTOM_SYSTEM_PROMPT: 'virgil-custom-system-prompt',
    WINDOW_SIZE: 'virgil-window-size',
    ELEVATION_UNIT: 'elevationUnit',
    WEATHER_UNIT: 'weatherUnit',
    LAST_DESTINATION: 'virgil_last_destination',
    USER_EMAIL: 'virgil_email',
    PERFECT_CIRCLE_BEST: 'perfectCircleBestScore',
    PERFECT_CIRCLE_ATTEMPTS: 'perfectCircleAttempts',
    RHYTHM_VOLUME: 'rhythmVolume',
    WEATHER_LAST_UPDATED: 'weatherLastUpdated',
    NOTES_AI_ENABLED: 'notesAiEnabled',
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock localStorage with proper store management
let mockStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: jest.fn((key: string) => mockStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: jest.fn(() => {
    mockStore = {};
  }),
  key: jest.fn((index: number) => {
    const keys = Object.keys(mockStore);
    return keys[index] || null;
  }),
  get length() {
    return Object.keys(mockStore).length;
  },
  _getStore: () => mockStore,
  _setStore: (newStore: Record<string, string>) => {
    mockStore = { ...newStore };
  },
};

// @ts-ignore
global.localStorage = mockLocalStorage;

describe('StorageMigration', () => {
  const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  
  // Override the global localStorage mock with our functional version
  beforeAll(() => {
    // @ts-ignore - Override the global mock from jest.setup.ts
    global.localStorage = mockLocalStorage;
    // Also assign to window.localStorage if it exists
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.localStorage = mockLocalStorage;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = {};
    
    // Restore mock implementations that were cleared by jest.clearAllMocks()
    mockLocalStorage.getItem.mockImplementation((key: string) => mockStore[key] || null);
    mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
      mockStore[key] = value;
    });
    mockLocalStorage.removeItem.mockImplementation((key: string) => {
      delete mockStore[key];
    });
    mockLocalStorage.clear.mockImplementation(() => {
      mockStore = {};
    });
    mockLocalStorage.key.mockImplementation((index: number) => {
      const keys = Object.keys(mockStore);
      return keys[index] || null;
    });
    
    // Ensure global.localStorage delegates to our mock
    // @ts-ignore
    global.localStorage.getItem = mockLocalStorage.getItem;
    // @ts-ignore
    global.localStorage.setItem = mockLocalStorage.setItem;
    // @ts-ignore
    global.localStorage.removeItem = mockLocalStorage.removeItem;
    // @ts-ignore
    global.localStorage.clear = mockLocalStorage.clear;
    // @ts-ignore
    global.localStorage.key = mockLocalStorage.key;
  });

  describe('runMigrations', () => {
    it('skips migration if already up to date', async () => {
      mockStorageService.get.mockReturnValue('1.0.0');

      const results = await StorageMigration.runMigrations();

      expect(results).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('Storage migrations already up to date');
      expect(mockStorageService.get).toHaveBeenCalledWith('virgil_storage_migration_version', '0.0.0');
    });

    it('runs migrations when version is outdated', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      // Set up some test data
      mockLocalStorage._setStore({
        selectedModel: 'gpt-3.5-turbo',
        perfectCircleBest: '42',
        notesAiEnabled: 'true',
      });

      const results = await StorageMigration.runMigrations();

      expect(results.length).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Running storage migrations...');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Storage migrations completed',
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'runMigrations',
        }),
      );
      expect(mockStorageService.set).toHaveBeenCalledWith('virgil_storage_migration_version', '1.0.0');
    });

    it('processes all defined key categories', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');

      const results = await StorageMigration.runMigrations();

      // Should have results for all string, number, and boolean keys
      const stringKeyCount = 7; // From STORAGE_KEYS string keys
      const numberKeyCount = 4; // From STORAGE_KEYS number keys
      const booleanKeyCount = 1; // From STORAGE_KEYS boolean keys
      
      expect(results).toHaveLength(stringKeyCount + numberKeyCount + booleanKeyCount);
    });
  });

  describe('String Value Migration', () => {
    it('migrates plain string to JSON format', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        'virgil-selected-model': 'gpt-4',
      });
      
      // Force override the global localStorage right before calling the migration
      const originalLocalStorage = global.localStorage;
      // @ts-ignore
      global.localStorage = mockLocalStorage;

      const results = await StorageMigration.runMigrations();
      
      // Restore original localStorage
      // @ts-ignore
      global.localStorage = originalLocalStorage;

      // Find the specific result for selectedModel
      const selectedModelResult = results.find(r => r.key === 'virgil-selected-model');
      expect(selectedModelResult).toEqual({
        key: 'virgil-selected-model',
        success: true,
        oldValue: 'gpt-4',
        newValue: '"gpt-4"',
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('virgil-selected-model', '"gpt-4"');
    });

    it('leaves already JSON values unchanged', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        'virgil-selected-model': '"gpt-4"',
      });

      await StorageMigration.runMigrations();

      // Should not call setItem for already JSON values
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('virgil-selected-model', expect.any(String));
    });

    it('handles null values gracefully', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      // selectedModel not in store (null)

      const results = await StorageMigration.runMigrations();

      const selectedModelResult = results.find(r => r.key === 'virgil-selected-model');
      expect(selectedModelResult).toEqual({
        key: 'virgil-selected-model',
        success: true,
        oldValue: null,
        newValue: null,
      });
    });

    it('handles localStorage errors for strings', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      // Mock localStorage.getItem to throw
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'virgil-selected-model') {
          throw new Error('localStorage error');
        }
        return originalGetItem(key);
      });

      const results = await StorageMigration.runMigrations();

      const selectedModelResult = results.find(r => r.key === 'virgil-selected-model');
      expect(selectedModelResult).toEqual({
        key: 'virgil-selected-model',
        success: false,
        oldValue: null,
        newValue: null,
        error: 'localStorage error',
      });

      // Restore
      mockLocalStorage.getItem.mockImplementation(originalGetItem);
    });
  });

  describe('Number Value Migration', () => {
    it('migrates plain number string to JSON format', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        perfectCircleBestScore: '42.5',
      });

      const results = await StorageMigration.runMigrations();

      const numberResult = results.find(r => r.key === 'perfectCircleBestScore');
      expect(numberResult).toEqual({
        key: 'perfectCircleBestScore',
        success: true,
        oldValue: '42.5',
        newValue: '42.5',
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('perfectCircleBestScore', '42.5');
    });

    it('migrates integer string to JSON format', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        perfectCircleAttempts: '123',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('perfectCircleAttempts', '123');
    });

    it('removes invalid number values', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        rhythmVolume: 'not-a-number',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('rhythmVolume');
    });

    it('leaves already JSON number values unchanged', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        perfectCircleBest: '42.5',
      });

      await StorageMigration.runMigrations();

      // Should migrate since it's a valid number string
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('perfectCircleBest', '42.5');
    });

    it('handles null number values gracefully', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');

      const results = await StorageMigration.runMigrations();

      const numberResult = results.find(r => r.key === 'perfectCircleBest');
      expect(numberResult).toEqual({
        key: 'perfectCircleBest',
        success: true,
        oldValue: null,
        newValue: null,
      });
    });

    it('handles localStorage errors for numbers', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'perfectCircleBest') {
          throw new Error('Storage access error');
        }
        return originalGetItem(key);
      });

      const results = await StorageMigration.runMigrations();

      const numberResult = results.find(r => r.key === 'perfectCircleBest');
      expect(numberResult).toEqual({
        key: 'perfectCircleBest',
        success: false,
        oldValue: null,
        newValue: null,
        error: 'Storage access error',
      });

      mockLocalStorage.getItem.mockImplementation(originalGetItem);
    });
  });

  describe('Boolean Value Migration', () => {
    it('migrates "true" string to JSON boolean', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: 'true',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'true');
    });

    it('migrates "True" string to JSON boolean', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: 'True',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'true');
    });

    it('migrates "1" string to JSON boolean', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: '1',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'true');
    });

    it('migrates "false" string to JSON boolean', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: 'false',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'false');
    });

    it('migrates any other string to false', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: 'random-string',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'false');
    });

    it('leaves already JSON boolean values unchanged', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      mockLocalStorage._setStore({
        notesAiEnabled: 'true',
      });

      await StorageMigration.runMigrations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('notesAiEnabled', 'true');
    });

    it('handles null boolean values gracefully', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');

      const results = await StorageMigration.runMigrations();

      const booleanResult = results.find(r => r.key === 'notesAiEnabled');
      expect(booleanResult).toEqual({
        key: 'notesAiEnabled',
        success: true,
        oldValue: null,
        newValue: null,
      });
    });

    it('handles localStorage errors for booleans', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'notesAiEnabled') {
          throw new Error('Boolean storage error');
        }
        return originalGetItem(key);
      });

      const results = await StorageMigration.runMigrations();

      const booleanResult = results.find(r => r.key === 'notesAiEnabled');
      expect(booleanResult).toEqual({
        key: 'notesAiEnabled',
        success: false,
        oldValue: null,
        newValue: null,
        error: 'Boolean storage error',
      });

      mockLocalStorage.getItem.mockImplementation(originalGetItem);
    });
  });

  describe('cleanupDeprecatedKeys', () => {
    it('removes deprecated keys successfully', () => {
      mockLocalStorage._setStore({
        'deprecated-key-1': 'value1',
        'deprecated-key-2': 'value2',
        'keep-this-key': 'keep-value',
      });

      StorageMigration.cleanupDeprecatedKeys(['deprecated-key-1', 'deprecated-key-2']);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('deprecated-key-1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('deprecated-key-2');
      expect(mockLogger.info).toHaveBeenCalledWith('Removed deprecated key: deprecated-key-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Removed deprecated key: deprecated-key-2');
    });

    it('handles errors when removing deprecated keys', () => {
      const originalRemoveItem = mockLocalStorage.removeItem;
      mockLocalStorage.removeItem.mockImplementation((key) => {
        if (key === 'error-key') {
          throw new Error('Remove failed');
        }
        originalRemoveItem(key);
      });

      StorageMigration.cleanupDeprecatedKeys(['error-key', 'good-key']);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to remove deprecated key error-key',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'cleanupDeprecatedKeys',
          metadata: { key: 'error-key' },
        }),
      );

      mockLocalStorage.removeItem.mockImplementation(originalRemoveItem);
    });

    it('handles non-Error exceptions', () => {
      const originalRemoveItem = mockLocalStorage.removeItem;
      mockLocalStorage.removeItem.mockImplementation((key) => {
        if (key === 'string-error-key') {
          throw 'String error';
        }
        originalRemoveItem(key);
      });

      StorageMigration.cleanupDeprecatedKeys(['string-error-key']);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to remove deprecated key string-error-key',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'cleanupDeprecatedKeys',
        }),
      );

      mockLocalStorage.removeItem.mockImplementation(originalRemoveItem);
    });
  });

  describe('validateStorage', () => {
    it('returns valid for properly formatted JSON values', () => {
      mockLocalStorage._setStore({
        selectedModel: '"gpt-4"',
        perfectCircleBest: '42.5',
        notesAiEnabled: 'true',
      });

      const result = StorageMigration.validateStorage();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('identifies invalid JSON values', () => {
      mockLocalStorage._setStore({
        selectedModel: '"gpt-4"', // Valid JSON
        perfectCircleBest: '42.5', // Valid JSON (number)
        badKey: 'invalid{json', // Invalid JSON
        anotherBadKey: 'unclosed"string', // Invalid JSON
      });

      const result = StorageMigration.validateStorage();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Key "badKey" contains invalid JSON: invalid{json');
      expect(result.errors).toContain('Key "anotherBadKey" contains invalid JSON: unclosed"string');
    });

    it('handles empty localStorage gracefully', () => {
      mockLocalStorage._setStore({});

      const result = StorageMigration.validateStorage();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('only validates defined STORAGE_KEYS', () => {
      mockLocalStorage._setStore({
        selectedModel: '"valid"',
        randomKey: 'invalid{json', // This should be ignored
      });

      const result = StorageMigration.validateStorage();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('createBackup', () => {
    it('creates a complete backup of localStorage', () => {
      mockLocalStorage._setStore({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      const backup = StorageMigration.createBackup();

      expect(backup).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('handles empty localStorage', () => {
      mockLocalStorage._setStore({});

      const backup = StorageMigration.createBackup();

      expect(backup).toEqual({});
    });

    it('handles localStorage errors during backup', () => {
      const originalKey = mockLocalStorage.key;
      mockLocalStorage.key.mockImplementation(() => {
        throw new Error('Backup error');
      });

      const backup = StorageMigration.createBackup();

      expect(backup).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create backup',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'createBackup',
        }),
      );

      mockLocalStorage.key.mockImplementation(originalKey);
    });

    it('handles null keys gracefully', () => {
      mockLocalStorage._setStore({
        key1: 'value1',
      });

      // Mock length and key to simulate localStorage behavior
      Object.defineProperty(mockLocalStorage, 'length', {
        get: () => 2,
        configurable: true,
      });
      
      const originalKey = mockLocalStorage.key;
      mockLocalStorage.key.mockImplementation((index) => {
        if (index === 0) return 'key1';
        if (index === 1) return null; // Simulate null key
        return null;
      });

      const backup = StorageMigration.createBackup();

      expect(backup).toEqual({
        key1: 'value1',
      });

      mockLocalStorage.key.mockImplementation(originalKey);
    });
  });

  describe('restoreFromBackup', () => {
    it('restores localStorage from backup', () => {
      mockLocalStorage._setStore({
        currentKey: 'currentValue',
      });

      const backup = {
        key1: 'value1',
        key2: 'value2',
      };

      StorageMigration.restoreFromBackup(backup);

      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key1', 'value1');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key2', 'value2');
      expect(mockLogger.info).toHaveBeenCalledWith('Storage restored from backup');
    });

    it('handles empty backup', () => {
      mockLocalStorage._setStore({
        existingKey: 'existingValue',
      });

      StorageMigration.restoreFromBackup({});

      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Storage restored from backup');
    });

    it('handles errors during restore', () => {
      const originalClear = mockLocalStorage.clear;
      mockLocalStorage.clear.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      const backup = { key1: 'value1' };

      StorageMigration.restoreFromBackup(backup);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to restore from backup',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'restoreFromBackup',
        }),
      );

      mockLocalStorage.clear.mockImplementation(originalClear);
    });

    it('handles setItem errors during restore', () => {
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        if (key === 'error-key') {
          throw new Error('SetItem failed');
        }
        originalSetItem(key, value);
      });

      const backup = {
        'good-key': 'good-value',
        'error-key': 'error-value',
      };

      StorageMigration.restoreFromBackup(backup);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to restore from backup',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'restoreFromBackup',
        }),
      );

      mockLocalStorage.setItem.mockImplementation(originalSetItem);
    });

    it('handles non-Error exceptions during restore', () => {
      const originalClear = mockLocalStorage.clear;
      mockLocalStorage.clear.mockImplementation(() => {
        throw 'String error';
      });

      StorageMigration.restoreFromBackup({});

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to restore from backup',
        expect.any(Error),
        expect.objectContaining({
          component: 'StorageMigration',
          action: 'restoreFromBackup',
        }),
      );

      mockLocalStorage.clear.mockImplementation(originalClear);
    });
  });

  describe('Integration Tests', () => {
    it('performs complete migration workflow', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      // Set up mixed storage state
      mockLocalStorage._setStore({
        selectedModel: 'gpt-4', // String to migrate
        perfectCircleBest: '85.5', // Number to migrate
        notesAiEnabled: 'true', // Boolean to migrate
        customSystemPrompt: '"already-json"', // Already JSON
        invalidNumber: 'not-a-number', // Invalid number
      });

      const results = await StorageMigration.runMigrations();

      // Verify all migrations happened
      expect(results.length).toBe(12); // All defined keys
      
      // Check specific migrations
      const stringResult = results.find(r => r.key === 'selectedModel');
      expect(stringResult?.success).toBe(true);
      expect(stringResult?.newValue).toBe('"gpt-4"');

      const numberResult = results.find(r => r.key === 'perfectCircleBest');
      expect(numberResult?.success).toBe(true);

      const booleanResult = results.find(r => r.key === 'notesAiEnabled');
      expect(booleanResult?.success).toBe(true);
      
      // Verify version was updated
      expect(mockStorageService.set).toHaveBeenCalledWith('virgil_storage_migration_version', '1.0.0');
    });

    it('creates backup, validates, and restores workflow', () => {
      // Set up initial state
      mockLocalStorage._setStore({
        key1: '"json-value"',
        key2: '42',
        key3: 'true',
      });

      // Create backup
      const backup = StorageMigration.createBackup();
      expect(backup).toEqual({
        key1: '"json-value"',
        key2: '42',
        key3: 'true',
      });

      // Validate storage
      const validation = StorageMigration.validateStorage();
      expect(validation.valid).toBe(true);

      // Modify storage
      mockLocalStorage._setStore({
        different: 'data',
      });

      // Restore from backup
      StorageMigration.restoreFromBackup(backup);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key1', '"json-value"');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key2', '42');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key3', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles very large values', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      const largeValue = 'x'.repeat(10000);
      
      mockLocalStorage._setStore({
        selectedModel: largeValue,
      });

      const results = await StorageMigration.runMigrations();

      const result = results.find(r => r.key === 'selectedModel');
      expect(result?.success).toBe(true);
      expect(result?.newValue).toBe(JSON.stringify(largeValue));
    });

    it('handles special characters in values', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      const specialValue = 'Special chars: "quotes" \\backslash\\ \nnewline\n 🎵';
      
      mockLocalStorage._setStore({
        selectedModel: specialValue,
      });

      const results = await StorageMigration.runMigrations();

      const result = results.find(r => r.key === 'selectedModel');
      expect(result?.success).toBe(true);
      expect(result?.newValue).toBe(JSON.stringify(specialValue));
    });

    it('handles extreme number values', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      mockLocalStorage._setStore({
        perfectCircleBest: String(Number.MAX_SAFE_INTEGER),
        rhythmVolume: String(Number.MIN_SAFE_INTEGER),
        weatherLastUpdated: '0',
      });

      const results = await StorageMigration.runMigrations();

      const maxResult = results.find(r => r.key === 'perfectCircleBest');
      expect(maxResult?.success).toBe(true);

      const minResult = results.find(r => r.key === 'rhythmVolume');
      expect(minResult?.success).toBe(true);

      const zeroResult = results.find(r => r.key === 'weatherLastUpdated');
      expect(zeroResult?.success).toBe(true);
    });

    it('handles concurrent access to localStorage', async () => {
      mockStorageService.get.mockReturnValue('0.0.0');
      
      // Simulate concurrent modifications during migration
      let callCount = 0;
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem.mockImplementation((key) => {
        callCount++;
        if (callCount === 5) {
          // Simulate external modification
          mockLocalStorage._setStore({
            ...mockLocalStorage._getStore(),
            newKey: 'added-during-migration',
          });
        }
        return originalGetItem(key);
      });

      const results = await StorageMigration.runMigrations();

      expect(results.length).toBe(12);
      expect(results.every(r => r.success !== undefined)).toBe(true);

      mockLocalStorage.getItem.mockImplementation(originalGetItem);
    });
  });
});