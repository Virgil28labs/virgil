import { StorageService, STORAGE_KEYS } from '../StorageService';

describe('StorageService', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: { [key: string]: string } = {};
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
      get length() {
        return Object.keys(store).length;
      },
      key: jest.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
    };
  })();

  // Replace global localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Note: console.error is mocked in jest.setup.ts to filter specific errors
  // We'll check for the console.error calls being made

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns defaultValue when key does not exist', () => {
      const result = StorageService.get('nonexistent', 'default');
      expect(result).toBe('default');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistent');
    });

    it('returns parsed JSON value when valid JSON is stored', () => {
      const testObject = { name: 'test', value: 123 };
      localStorageMock.setItem('testKey', JSON.stringify(testObject));
      
      const result = StorageService.get('testKey', {});
      expect(result).toEqual(testObject);
    });

    it('returns string value when stored value is not valid JSON', () => {
      localStorageMock.setItem('testKey', 'plain string');
      
      const result = StorageService.get('testKey', '');
      expect(result).toBe('plain string');
    });

    it('handles array values', () => {
      const testArray = [1, 2, 3, 'test'];
      localStorageMock.setItem('testKey', JSON.stringify(testArray));
      
      const result = StorageService.get('testKey', []);
      expect(result).toEqual(testArray);
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const result = StorageService.get('testKey', 'default');
      expect(result).toBe('default');
      // console.error is mocked in jest.setup.ts
    });

    it('handles null values correctly', () => {
      localStorageMock.setItem('testKey', JSON.stringify(null));
      
      const result = StorageService.get('testKey', 'default');
      expect(result).toBeNull();
    });

    it('handles boolean values', () => {
      localStorageMock.setItem('boolKey', JSON.stringify(true));
      
      const result = StorageService.get('boolKey', false);
      expect(result).toBe(true);
    });

    it('handles number values', () => {
      localStorageMock.setItem('numKey', JSON.stringify(42.5));
      
      const result = StorageService.get('numKey', 0);
      expect(result).toBe(42.5);
    });
  });

  describe('set', () => {
    it('stores values as JSON strings', () => {
      const testObject = { key: 'value' };
      StorageService.set('testKey', testObject);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(testObject)
      );
    });

    it('stores string values as JSON-encoded strings', () => {
      StorageService.set('testKey', 'test string');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        '"test string"'
      );
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      StorageService.set('testKey', 'value');
      
      // console.error is mocked in jest.setup.ts
    });

    it('stores arrays correctly', () => {
      const testArray = ['a', 'b', 'c'];
      StorageService.set('testKey', testArray);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(testArray)
      );
    });

    it('stores null values', () => {
      StorageService.set('testKey', null);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        'null'
      );
    });

    it('stores undefined values', () => {
      StorageService.set('testKey', undefined);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        undefined
      );
    });
  });

  describe('remove', () => {
    it('removes items from localStorage', () => {
      localStorageMock.setItem('testKey', 'value');
      
      StorageService.remove('testKey');
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('handles errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove error');
      });
      
      StorageService.remove('testKey');
      
      // console.error is mocked in jest.setup.ts
    });
  });

  describe('has', () => {
    it('returns true when key exists', () => {
      localStorageMock.setItem('testKey', 'value');
      
      expect(StorageService.has('testKey')).toBe(true);
    });

    it('returns false when key does not exist', () => {
      expect(StorageService.has('nonexistent')).toBe(false);
    });

    it('returns false on error', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      expect(StorageService.has('testKey')).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears all localStorage data', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');
      
      StorageService.clear();
      
      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    it('handles errors gracefully', () => {
      localStorageMock.clear.mockImplementationOnce(() => {
        throw new Error('Clear error');
      });
      
      StorageService.clear();
      
      // console.error is mocked in jest.setup.ts
    });
  });

  describe('keys', () => {
    it('returns all localStorage keys', () => {
      // Set up localStorage mock with enumerable properties
      const store = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: store,
        writable: true,
        configurable: true,
      });
      
      const keys = StorageService.keys();
      expect(keys).toEqual(['key1', 'key2', 'key3']);
      
      // Restore mock
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });

    it('returns empty array on error', () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage error');
        },
        configurable: true,
      });
      
      const keys = StorageService.keys();
      expect(keys).toEqual([]);
      
      // Restore mock
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });
  });

  describe('migrate', () => {
    it('returns defaultValue when key does not exist', () => {
      const result = StorageService.migrate('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('returns already JSON-encoded values as-is', () => {
      const testObject = { migrated: true };
      localStorageMock.setItem('testKey', JSON.stringify(testObject));
      
      const result = StorageService.migrate('testKey', {});
      expect(result).toEqual(testObject);
    });

    it('migrates plain string values to JSON', () => {
      localStorageMock.setItem('testKey', 'plain string');
      
      const result = StorageService.migrate('testKey', '');
      expect(result).toBe('plain string');
      
      // Check that it was re-saved as JSON
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'testKey',
        '"plain string"'
      );
    });

    it('handles migration errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const result = StorageService.migrate('testKey', 'default');
      expect(result).toBe('default');
      // console.error is mocked in jest.setup.ts
    });
  });

  describe('migrateKeys', () => {
    it('migrates multiple keys', () => {
      localStorageMock.setItem('key1', 'value1');
      localStorageMock.setItem('key2', 'value2');
      localStorageMock.setItem('key3', JSON.stringify({ already: 'json' }));
      
      StorageService.migrateKeys(['key1', 'key2', 'key3']);
      
      // Plain strings should be re-saved as JSON
      expect(localStorageMock.setItem).toHaveBeenCalledWith('key1', '"value1"');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('key2', '"value2"');
      // Already JSON should be re-saved as-is
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'key3',
        JSON.stringify({ already: 'json' })
      );
    });

    it('skips non-existent keys', () => {
      localStorageMock.setItem('key1', 'value1');
      
      const setItemCallsBefore = localStorageMock.setItem.mock.calls.length;
      
      StorageService.migrateKeys(['key1', 'nonexistent']);
      
      // Should only call setItem once for key1
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(setItemCallsBefore + 1);
    });
  });

  describe('onChange', () => {
    it('listens for storage changes and calls callback with parsed JSON', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('testKey', callback);
      
      const event = new StorageEvent('storage', {
        key: 'testKey',
        newValue: JSON.stringify({ changed: true }),
        oldValue: null,
      });
      
      window.dispatchEvent(event);
      
      expect(callback).toHaveBeenCalledWith({ changed: true });
      
      unsubscribe();
    });

    it('handles plain string values in storage events', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('testKey', callback);
      
      const event = new StorageEvent('storage', {
        key: 'testKey',
        newValue: 'plain string',
        oldValue: null,
      });
      
      window.dispatchEvent(event);
      
      expect(callback).toHaveBeenCalledWith('plain string');
      
      unsubscribe();
    });

    it('ignores events for different keys', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('testKey', callback);
      
      const event = new StorageEvent('storage', {
        key: 'differentKey',
        newValue: 'value',
      });
      
      window.dispatchEvent(event);
      
      expect(callback).not.toHaveBeenCalled();
      
      unsubscribe();
    });

    it('ignores events with null newValue', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('testKey', callback);
      
      const event = new StorageEvent('storage', {
        key: 'testKey',
        newValue: null,
      });
      
      window.dispatchEvent(event);
      
      expect(callback).not.toHaveBeenCalled();
      
      unsubscribe();
    });

    it('unsubscribes when returned function is called', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('testKey', callback);
      
      unsubscribe();
      
      const event = new StorageEvent('storage', {
        key: 'testKey',
        newValue: 'value',
      });
      
      window.dispatchEvent(event);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getSize', () => {
    it('calculates total storage size in bytes', () => {
      // Create a mock with real string storage
      const store: { [key: string]: string } = {
        key1: 'value1',
        key2: 'longer value here',
        key3: JSON.stringify({ some: 'object' }),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...localStorageMock,
          getItem: (key: string) => store[key] || null,
        },
        writable: true,
        configurable: true,
      });
      
      // Mock Object.keys to return our store keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn((obj) => {
        if (obj === localStorage) {
          return Object.keys(store);
        }
        return originalKeys(obj);
      });
      
      const size = StorageService.getSize();
      
      // Calculate expected size
      let expectedSize = 0;
      Object.entries(store).forEach(([key, value]) => {
        expectedSize += key.length + value.length;
      });
      
      expect(size).toBe(expectedSize);
      
      // Restore
      Object.keys = originalKeys;
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });

    it('returns 0 on error', () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage error');
        },
        configurable: true,
      });
      
      const size = StorageService.getSize();
      expect(size).toBe(0);
      
      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });

    it('handles null values in storage', () => {
      const store: { [key: string]: string | null } = {
        key1: 'value1',
        key2: null,
        key3: 'value3',
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...localStorageMock,
          getItem: (key: string) => store[key] ?? null,
        },
        writable: true,
        configurable: true,
      });
      
      // Mock Object.keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn((obj) => {
        if (obj === localStorage) {
          return ['key1', 'key2', 'key3'];
        }
        return originalKeys(obj);
      });
      
      const size = StorageService.getSize();
      
      // Should only count non-null values - key2 has null value
      const expectedSize = 'key1'.length + 'value1'.length + 'key3'.length + 'value3'.length;
      expect(size).toBe(expectedSize);
      
      // Restore
      Object.keys = originalKeys;
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });
  });

  describe('isAvailable', () => {
    it('returns true when localStorage is available', () => {
      expect(StorageService.isAvailable()).toBe(true);
      
      // Should have tested by setting and removing a test key
      expect(localStorageMock.setItem).toHaveBeenCalledWith('__storage_test__', 'test');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('__storage_test__');
    });

    it('returns false when localStorage throws error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage not available');
      });
      
      expect(StorageService.isAvailable()).toBe(false);
    });

    it('returns false when removeItem throws error', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove not available');
      });
      
      expect(StorageService.isAvailable()).toBe(false);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('contains all expected keys', () => {
      // Verify some key storage keys exist
      expect(STORAGE_KEYS.SELECTED_MODEL).toBe('virgil-selected-model');
      expect(STORAGE_KEYS.ELEVATION_UNIT).toBe('elevationUnit');
      expect(STORAGE_KEYS.WEATHER_UNIT).toBe('weatherUnit');
      expect(STORAGE_KEYS.DOG_FAVORITES).toBe('virgil_dog_favorites');
      expect(STORAGE_KEYS.NASA_FAVORITES).toBe('virgil_nasa_favorites');
    });

    it('has unique values', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('integration tests', () => {
    it('round-trip stores and retrieves complex objects', () => {
      const complexObject = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'nested',
          },
        },
      };
      
      StorageService.set('complex', complexObject);
      const retrieved = StorageService.get('complex', null);
      
      expect(retrieved).toEqual(complexObject);
    });

    it('handles migration of legacy string values', () => {
      // Simulate legacy storage
      localStorageMock.setItem('legacyKey', 'plain string value');
      
      // First get returns the plain string
      const firstGet = StorageService.get('legacyKey', '');
      expect(firstGet).toBe('plain string value');
      
      // Migrate it
      const migrated = StorageService.migrate('legacyKey', '');
      expect(migrated).toBe('plain string value');
      
      // Now it should be stored as JSON
      const secondGet = StorageService.get('legacyKey', '');
      expect(secondGet).toBe('plain string value');
      expect(localStorageMock.getItem('legacyKey')).toBe('"plain string value"');
    });
  });
});