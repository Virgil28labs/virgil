import { StorageService } from '../StorageService';
import { logger } from '../../lib/logger';

// Mock logger
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('StorageService', () => {
  // Mock localStorage with proper implementation
  let store: Record<string, string> = {};
  
  const localStorageMock = {
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
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    store = {}; // Clear the store
    // Reset mock implementations to use the store
    localStorageMock.getItem.mockImplementation((key: string) => store[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete store[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      store = {};
    });
  });

  describe('get', () => {
    test('returns default value when key does not exist', () => {
      const defaultValue = { test: 'default' };
      const result = StorageService.get('nonexistent', defaultValue);
      
      expect(result).toEqual(defaultValue);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistent');
    });

    test('returns parsed JSON object when valid JSON is stored', () => {
      const testData = { name: 'test', value: 123 };
      store['testKey'] = JSON.stringify(testData);
      
      const result = StorageService.get('testKey', null);
      
      expect(result).toEqual(testData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
    });

    test('returns plain string for backward compatibility', () => {
      const plainString = 'plain text value';
      store['stringKey'] = plainString;
      
      const result = StorageService.get<string>('stringKey', '');
      
      expect(result).toBe(plainString);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('stringKey');
    });

    test('handles localStorage errors gracefully', () => {
      const defaultValue = 'default';
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = StorageService.get('errorKey', defaultValue);
      
      expect(result).toBe(defaultValue);
      expect(logger.error).toHaveBeenCalledWith(
        'Error reading localStorage key "errorKey"',
        expect.any(Error),
        { component: 'StorageService', action: 'get' },
      );
    });

    test('handles nested objects correctly', () => {
      const complexData = {
        user: {
          name: 'John',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        timestamp: '2024-01-15T12:00:00.000Z',
      };
      store['complexKey'] = JSON.stringify(complexData);
      
      const result = StorageService.get('complexKey', {});
      
      expect(result).toEqual(complexData);
    });

    test('handles arrays correctly', () => {
      const arrayData = [1, 2, 3, 'test', { id: 1 }];
      store['arrayKey'] = JSON.stringify(arrayData);
      
      const result = StorageService.get('arrayKey', []);
      
      expect(result).toEqual(arrayData);
    });

    test('handles boolean values correctly', () => {
      store['boolKey'] = JSON.stringify(true);
      
      const result = StorageService.get('boolKey', false);
      
      expect(result).toBe(true);
    });

    test('handles number values correctly', () => {
      store['numberKey'] = JSON.stringify(42);
      
      const result = StorageService.get('numberKey', 0);
      
      expect(result).toBe(42);
    });

    test('handles null values correctly', () => {
      store['nullKey'] = JSON.stringify(null);
      
      const result = StorageService.get('nullKey', 'default');
      
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    test('stores simple string value as JSON', () => {
      StorageService.set('stringKey', 'test value');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stringKey',
        '"test value"',
      );
    });

    test('stores object as JSON string', () => {
      const testObject = { id: 1, name: 'test' };
      StorageService.set('objectKey', testObject);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'objectKey',
        JSON.stringify(testObject),
      );
    });

    test('stores array as JSON string', () => {
      const testArray = [1, 2, 3, 'test'];
      StorageService.set('arrayKey', testArray);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'arrayKey',
        JSON.stringify(testArray),
      );
    });

    test('stores boolean as JSON', () => {
      StorageService.set('boolKey', true);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'boolKey',
        'true',
      );
    });

    test('stores number as JSON', () => {
      StorageService.set('numberKey', 123.45);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'numberKey',
        '123.45',
      );
    });

    test('stores null as JSON', () => {
      StorageService.set('nullKey', null);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'nullKey',
        'null',
      );
    });

    test('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      StorageService.set('errorKey', 'value');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error setting localStorage key "errorKey"',
        expect.any(Error),
        { component: 'StorageService', action: 'set' },
      );
    });

    test('handles circular references gracefully', () => {
      interface CircularRef {
        name: string;
        self?: CircularRef;
      }
      const circular: CircularRef = { name: 'test' };
      circular.self = circular;
      
      StorageService.set('circularKey', circular);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error setting localStorage key "circularKey"',
        expect.any(Error),
        { component: 'StorageService', action: 'set' },
      );
    });

    test('stores complex nested objects', () => {
      const complexData = {
        metadata: {
          created: '2024-01-15',
          version: 2,
        },
        data: {
          users: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' },
          ],
          settings: {
            theme: 'dark',
            language: 'en',
          },
        },
      };
      
      StorageService.set('complexKey', complexData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'complexKey',
        JSON.stringify(complexData),
      );
    });
  });

  describe('remove', () => {
    test('removes item from localStorage', () => {
      store['testKey'] = 'test value';
      
      StorageService.remove('testKey');
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testKey');
    });

    test('handles remove errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });
      
      StorageService.remove('errorKey');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error removing localStorage key "errorKey"',
        expect.any(Error),
        { component: 'StorageService', action: 'remove' },
      );
    });
  });

  describe('clear', () => {
    test('clears all localStorage', () => {
      store['key1'] = 'value1';
      store['key2'] = 'value2';
      
      StorageService.clear();
      
      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    test('handles clear errors gracefully', () => {
      localStorageMock.clear.mockImplementation(() => {
        throw new Error('Clear error');
      });
      
      StorageService.clear();
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error clearing localStorage',
        expect.any(Error),
        { component: 'StorageService', action: 'clear' },
      );
    });
  });

  describe('exists', () => {
    test('returns true when key exists', () => {
      store['existingKey'] = 'value';
      
      const result = StorageService.exists('existingKey');
      
      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('existingKey');
    });

    test('returns false when key does not exist', () => {
      const result = StorageService.exists('nonexistentKey');
      
      expect(result).toBe(false);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistentKey');
    });

    test('handles errors and returns false', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = StorageService.exists('errorKey');
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error checking localStorage key "errorKey"',
        expect.any(Error),
        { component: 'StorageService', action: 'exists' },
      );
    });
  });

  describe('getKeys', () => {
    test('returns all storage keys', () => {
      store['key1'] = 'value1';
      store['key2'] = 'value2';
      store['key3'] = 'value3';
      
      const keys = StorageService.getKeys();
      
      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    test('returns empty array when no keys exist', () => {
      // Store is already empty from beforeEach
      const keys = StorageService.getKeys();
      
      expect(keys).toEqual([]);
    });

    test('handles errors and returns empty array', () => {
      // Save original implementation
      const originalLength = Object.getOwnPropertyDescriptor(localStorageMock, 'length');
      
      Object.defineProperty(localStorageMock, 'length', {
        get: () => {
          throw new Error('Storage error');
        },
        configurable: true,
      });
      
      const keys = StorageService.getKeys();
      
      expect(keys).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting localStorage keys',
        expect.any(Error),
        { component: 'StorageService', action: 'getKeys' },
      );
      
      // Restore original implementation
      if (originalLength) {
        Object.defineProperty(localStorageMock, 'length', originalLength);
      }
    });
  });

  describe('integration scenarios', () => {
    test('round-trip storage and retrieval of complex data', () => {
      const originalData = {
        user: {
          id: 123,
          name: 'Test User',
          preferences: {
            theme: 'dark',
            notifications: true,
            items: [1, 2, 3],
          },
        },
        lastLogin: '2024-01-15T12:00:00.000Z',
        active: true,
        score: 98.5,
      };
      
      StorageService.set('userData', originalData);
      const retrievedData = StorageService.get('userData', null);
      
      expect(retrievedData).toEqual(originalData);
    });

    test('maintains backward compatibility with plain strings', () => {
      // Simulate old data stored as plain string (not JSON encoded)
      store['legacyKey'] = 'plain string value';
      
      // New code reading it
      const result = StorageService.get('legacyKey', '');
      
      expect(result).toBe('plain string value');
    });

    test('handles migration from old to new format', () => {
      // Old plain string
      store['settingKey'] = 'dark';
      
      // Read with new service
      const oldValue = StorageService.get<string>('settingKey', 'light');
      expect(oldValue).toBe('dark');
      
      // Update with new service (will store as JSON)
      StorageService.set('settingKey', 'dark');
      
      // Verify it's stored as JSON
      expect(localStorageMock.setItem).toHaveBeenCalledWith('settingKey', '"dark"');
    });
  });
});