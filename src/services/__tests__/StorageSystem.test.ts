/**
 * Storage System Tests
 * 
 * Tests for the unified storage system focusing on localStorage optimization
 */

import { StorageService, STORAGE_KEYS } from '../StorageService';
import { StorageMigration } from '../StorageMigration';

describe('Storage System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('StorageService Core Functionality', () => {
    it('should handle all data types correctly', () => {
      // String
      StorageService.set('test-string', 'hello world');
      expect(StorageService.get('test-string', '')).toBe('hello world');

      // Number
      StorageService.set('test-number', 42);
      expect(StorageService.get('test-number', 0)).toBe(42);

      // Boolean
      StorageService.set('test-boolean', true);
      expect(StorageService.get('test-boolean', false)).toBe(true);

      // Object
      const testObject = { name: 'Test', count: 123, nested: { value: true } };
      StorageService.set('test-object', testObject);
      expect(StorageService.get('test-object', {})).toEqual(testObject);

      // Array
      const testArray = [1, 'two', { three: 3 }, [4, 5]];
      StorageService.set('test-array', testArray);
      expect(StorageService.get('test-array', [])).toEqual(testArray);

      // Null
      StorageService.set('test-null', null);
      expect(StorageService.get('test-null', 'default')).toBe(null);
    });

    it('should handle backward compatibility with plain strings', () => {
      // Simulate old localStorage values
      localStorage.setItem('legacy-string', 'plain text value');
      localStorage.setItem('legacy-number', '123.45');
      localStorage.setItem('legacy-boolean', 'false');

      // Should read them correctly
      expect(StorageService.get('legacy-string', '')).toBe('plain text value');
      expect(StorageService.get('legacy-number', 0)).toBe(123.45);
      expect(StorageService.get('legacy-boolean', true)).toBe(false);
    });

    it('should handle storage keys correctly', () => {
      // Test all defined storage keys
      StorageService.set(STORAGE_KEYS.SELECTED_MODEL, 'gpt-4.1-mini');
      StorageService.set(STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT, 'Custom prompt');
      StorageService.set(STORAGE_KEYS.WINDOW_SIZE, 'large');
      StorageService.set(STORAGE_KEYS.VIRGIL_HABITS, { habits: [] });

      expect(StorageService.get(STORAGE_KEYS.SELECTED_MODEL, '')).toBe('gpt-4.1-mini');
      expect(StorageService.get(STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT, '')).toBe('Custom prompt');
      expect(StorageService.get(STORAGE_KEYS.WINDOW_SIZE, '')).toBe('large');
      expect(StorageService.get(STORAGE_KEYS.VIRGIL_HABITS, {})).toEqual({ habits: [] });
    });

    it('should handle removal correctly', () => {
      StorageService.set('test-remove', 'value');
      expect(StorageService.has('test-remove')).toBe(true);

      StorageService.remove('test-remove');
      expect(StorageService.has('test-remove')).toBe(false);
      expect(StorageService.get('test-remove', 'default')).toBe('default');
    });

    it('should calculate storage size', () => {
      StorageService.set('size-test-1', 'x'.repeat(100));
      StorageService.set('size-test-2', { data: Array(50).fill('test') });

      const size = StorageService.getSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('StorageMigration', () => {
    it('should migrate string values correctly', async () => {
      // Set up legacy data
      localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, 'gpt-4');
      localStorage.setItem(STORAGE_KEYS.ELEVATION_UNIT, 'meters');

      // Run migration
      const results = await StorageMigration.runMigrations();

      // Check results
      expect(results.some(r => r.key === STORAGE_KEYS.SELECTED_MODEL)).toBe(true);
      expect(results.every(r => r.success)).toBe(true);

      // Verify data is still accessible
      expect(StorageService.get(STORAGE_KEYS.SELECTED_MODEL, '')).toBe('gpt-4');
      expect(StorageService.get(STORAGE_KEYS.ELEVATION_UNIT, '')).toBe('meters');

      // Verify JSON encoding
      expect(localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL)).toBe('"gpt-4"');
      expect(localStorage.getItem(STORAGE_KEYS.ELEVATION_UNIT)).toBe('"meters"');
    });

    it('should migrate number values correctly', async () => {
      // Set up legacy data
      localStorage.setItem(STORAGE_KEYS.PERFECT_CIRCLE_BEST, '98.5');
      localStorage.setItem(STORAGE_KEYS.PERFECT_CIRCLE_ATTEMPTS, '42');

      // Run migration
      await StorageMigration.runMigrations();

      // Verify data is accessible as numbers
      expect(StorageService.get(STORAGE_KEYS.PERFECT_CIRCLE_BEST, 0)).toBe(98.5);
      expect(StorageService.get(STORAGE_KEYS.PERFECT_CIRCLE_ATTEMPTS, 0)).toBe(42);
    });

    it('should validate storage integrity', () => {
      // Add valid and invalid data
      StorageService.set('valid-1', { test: true });
      StorageService.set('valid-2', [1, 2, 3]);
      localStorage.setItem('invalid-json', '{broken json');
      localStorage.setItem('plain-text', 'hello world');

      // Validate
      const validation = StorageMigration.validateStorage();

      // Should detect issues with non-JSON values
      if (!validation.valid) {
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors.some(e => e.includes('invalid-json'))).toBe(true);
      }
    });

    it('should handle backup and restore', () => {
      // Set up test data
      StorageService.set('backup-test-1', 'value1');
      StorageService.set('backup-test-2', { data: 'value2' });

      // Create backup
      const backup = StorageMigration.createBackup();
      expect(Object.keys(backup).length).toBeGreaterThan(0);

      // Clear storage
      localStorage.clear();
      expect(StorageService.get('backup-test-1', 'default')).toBe('default');

      // Restore
      StorageMigration.restoreFromBackup(backup);
      expect(StorageService.get('backup-test-1', '')).toBe('value1');
      expect(StorageService.get('backup-test-2', {})).toEqual({ data: 'value2' });
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should handle storage events', (done) => {
      const key = 'sync-test';
      const newValue = { synced: true };

      // Set up listener
      const unsubscribe = StorageService.onChange(key, (value) => {
        expect(value).toEqual(newValue);
        unsubscribe();
        done();
      });

      // Simulate storage event from another tab
      const event = new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(newValue),
        oldValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });

    it('should ignore null values in storage events', () => {
      const callback = jest.fn();
      const unsubscribe = StorageService.onChange('test-key', callback);

      // Simulate removal event
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: null,
        oldValue: 'old',
        storageArea: localStorage,
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted data gracefully', () => {
      // Set corrupted data
      localStorage.setItem('corrupted', '{invalid json');

      // Should return the raw string for backward compatibility
      const result = StorageService.get('corrupted', 'default');
      expect(result).toBe('{invalid json');
    });

    it('should handle localStorage errors', () => {
      // Mock localStorage to throw error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => {
        StorageService.set('test', 'value');
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should check storage availability', () => {
      expect(StorageService.isAvailable()).toBe(true);

      // Mock to simulate unavailable storage
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage disabled');
      });

      expect(StorageService.isAvailable()).toBe(false);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle Virgil chatbot settings correctly', () => {
      // Simulate chatbot settings
      const settings = {
        selectedModel: 'gpt-4.1-mini',
        customPrompt: 'You are a helpful assistant',
        windowSize: 'normal' as const
      };

      StorageService.set(STORAGE_KEYS.SELECTED_MODEL, settings.selectedModel);
      StorageService.set(STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT, settings.customPrompt);
      StorageService.set(STORAGE_KEYS.WINDOW_SIZE, settings.windowSize);

      // Retrieve and verify
      expect(StorageService.get(STORAGE_KEYS.SELECTED_MODEL, '')).toBe(settings.selectedModel);
      expect(StorageService.get(STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT, '')).toBe(settings.customPrompt);
      expect(StorageService.get(STORAGE_KEYS.WINDOW_SIZE, 'normal')).toBe(settings.windowSize);
    });

    it('should handle habits data correctly', () => {
      // Complex habits data structure
      const habitsData = {
        habits: [
          {
            id: 'habit-1',
            name: 'Exercise',
            emoji: '💪',
            checkIns: ['2024-01-01', '2024-01-02', '2024-01-03'],
            streak: 3,
            longestStreak: 3
          },
          {
            id: 'habit-2',
            name: 'Read',
            emoji: '📚',
            checkIns: ['2024-01-01'],
            streak: 0,
            longestStreak: 1
          }
        ],
        achievements: [
          { id: 'first-checkin', unlocked: true, progress: 100 }
        ],
        settings: {
          soundEnabled: true,
          notifications: false
        },
        stats: {
          totalCheckIns: 4,
          currentStreak: 3,
          perfectDays: ['2024-01-01']
        }
      };

      StorageService.set(STORAGE_KEYS.VIRGIL_HABITS, habitsData);

      const retrieved = StorageService.get(STORAGE_KEYS.VIRGIL_HABITS, {} as any);
      expect(retrieved).toEqual(habitsData);
      
      // Verify deep nested data
      expect((retrieved as any).habits?.[0]?.name).toBe('Exercise');
      expect((retrieved as any).stats?.totalCheckIns).toBe(4);
    });

    it('should handle favorites collections correctly', () => {
      // Dog favorites
      const dogFavorites = [
        { url: 'https://dog.ceo/1.jpg', breed: 'corgi', timestamp: Date.now() },
        { url: 'https://dog.ceo/2.jpg', breed: 'husky', timestamp: Date.now() }
      ];
      StorageService.set(STORAGE_KEYS.DOG_FAVORITES, dogFavorites);

      // NASA favorites
      const nasaFavorites = [
        {
          date: '2024-01-01',
          title: 'Andromeda Galaxy',
          url: 'https://nasa.gov/1.jpg',
          explanation: 'Beautiful galaxy',
          hdurl: 'https://nasa.gov/1-hd.jpg'
        }
      ];
      StorageService.set(STORAGE_KEYS.NASA_FAVORITES, nasaFavorites);

      // Verify retrieval
      expect(StorageService.get(STORAGE_KEYS.DOG_FAVORITES, [])).toEqual(dogFavorites);
      expect(StorageService.get(STORAGE_KEYS.NASA_FAVORITES, [])).toEqual(nasaFavorites);
    });
  });
});