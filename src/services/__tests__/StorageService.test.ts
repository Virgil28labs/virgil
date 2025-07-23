import { StorageService, STORAGE_KEYS } from '../StorageService';

describe('StorageService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return default value when key does not exist', () => {
      const result = StorageService.get('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('should parse JSON values correctly', () => {
      localStorage.setItem('test-json', JSON.stringify({ foo: 'bar' }));
      const result = StorageService.get('test-json', {});
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle plain string values for backward compatibility', () => {
      localStorage.setItem('test-string', 'plain string');
      const result = StorageService.get('test-string', '');
      expect(result).toBe('plain string');
    });

    it('should handle number values stored as plain strings', () => {
      localStorage.setItem('test-number', '42');
      const result = StorageService.get('test-number', 0);
      expect(result).toBe(42); // JSON.parse converts to number
    });

    it('should handle boolean values stored as plain strings', () => {
      localStorage.setItem('test-bool', 'true');
      const result = StorageService.get('test-bool', false);
      expect(result).toBe(true); // JSON.parse converts to boolean
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = StorageService.get('test', 'default');
      
      expect(result).toBe('default');
      expect(consoleSpy).toHaveBeenCalled();

      Storage.prototype.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should store values as JSON', () => {
      StorageService.set('test-string', 'hello');
      expect(localStorage.getItem('test-string')).toBe('"hello"');

      StorageService.set('test-number', 42);
      expect(localStorage.getItem('test-number')).toBe('42');

      StorageService.set('test-object', { foo: 'bar' });
      expect(localStorage.getItem('test-object')).toBe('{"foo":"bar"}');
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      StorageService.set('test', 'value');
      
      expect(consoleSpy).toHaveBeenCalled();

      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove items from localStorage', () => {
      localStorage.setItem('test', 'value');
      StorageService.remove('test');
      expect(localStorage.getItem('test')).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn().mockImplementation(() => {
        throw new Error('Remove error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      StorageService.remove('test');
      
      expect(consoleSpy).toHaveBeenCalled();

      Storage.prototype.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });
  });

  describe('has', () => {
    it('should return true if key exists', () => {
      localStorage.setItem('test', 'value');
      expect(StorageService.has('test')).toBe(true);
    });

    it('should return false if key does not exist', () => {
      expect(StorageService.has('nonexistent')).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(StorageService.has('test')).toBe(false);

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('migrate', () => {
    it('should return default value for non-existent keys', () => {
      const result = StorageService.migrate('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('should not re-save already JSON-encoded values', () => {
      const jsonValue = JSON.stringify({ foo: 'bar' });
      localStorage.setItem('test', jsonValue);
      
      const result = StorageService.migrate('test', {});
      expect(result).toEqual({ foo: 'bar' });
      expect(localStorage.getItem('test')).toBe(jsonValue);
    });

    it('should migrate plain string values to JSON', () => {
      localStorage.setItem('test', 'plain string');
      
      const result = StorageService.migrate('test', '');
      expect(result).toBe('plain string');
      expect(localStorage.getItem('test')).toBe('"plain string"');
    });

    it('should handle migration errors gracefully', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = StorageService.migrate('test', 'default');
      
      expect(result).toBe('default');
      expect(consoleSpy).toHaveBeenCalled();

      Storage.prototype.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('onChange', () => {
    it('should call callback when storage changes', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('test', callback);

      // Simulate storage event
      const event = new StorageEvent('storage', {
        key: 'test',
        newValue: '"new value"',
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith('new value');

      unsubscribe();
    });

    it('should handle plain string values in storage events', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('test', callback);

      // Simulate storage event with plain string
      const event = new StorageEvent('storage', {
        key: 'test',
        newValue: 'plain string',
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith('plain string');

      unsubscribe();
    });

    it('should not call callback for different keys', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('test', callback);

      const event = new StorageEvent('storage', {
        key: 'other',
        newValue: 'value',
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should not call callback when newValue is null', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('test', callback);

      const event = new StorageEvent('storage', {
        key: 'test',
        newValue: null,
        oldValue: 'old',
        storageArea: localStorage,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('isAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(StorageService.isAvailable()).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage disabled');
      });

      expect(StorageService.isAvailable()).toBe(false);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have all expected keys', () => {
      expect(STORAGE_KEYS.SELECTED_MODEL).toBe('virgil-selected-model');
      expect(STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT).toBe('virgil-custom-system-prompt');
      expect(STORAGE_KEYS.WINDOW_SIZE).toBe('virgil-window-size');
      expect(STORAGE_KEYS.ACTIVE_CONVERSATION).toBe('virgil-active-conversation');
    });
  });
});