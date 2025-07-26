/**
 * Unified Storage Service
 *
 * Provides consistent localStorage access with:
 * - Automatic JSON serialization/deserialization
 * - Backward compatibility for plain string values
 * - Error handling and fallbacks
 * - Type safety
 * - Migration utilities
 */

import { logger } from '../lib/logger';

export class StorageService {
  /**
   * Gets a value from localStorage with automatic JSON parsing
   * Falls back to plain string if JSON parsing fails
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // Try to parse as JSON first
      try {
        return JSON.parse(item) as T;
      } catch {
        // If JSON parsing fails, return as-is (backward compatibility)
        // This handles cases where values were stored as plain strings
        return item as unknown as T;
      }
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}"`, error as Error, { component: 'StorageService', action: 'get' });
      return defaultValue;
    }
  }

  /**
   * Sets a value in localStorage with automatic JSON serialization
   * Strings are stored as JSON-encoded strings for consistency
   */
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}"`, error as Error, { component: 'StorageService', action: 'set' });
    }
  }

  /**
   * Removes a value from localStorage
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, error as Error, { component: 'StorageService', action: 'remove' });
    }
  }

  /**
   * Checks if a key exists in localStorage
   */
  static has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clears all localStorage data
   */
  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      logger.error('Error clearing localStorage', error as Error, { component: 'StorageService', action: 'clear' });
    }
  }

  /**
   * Gets all keys in localStorage
   */
  static keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }

  /**
   * Migrates a value to ensure it's properly JSON-encoded
   * Useful for transitioning from plain string storage to JSON
   */
  static migrate<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // Check if it's already valid JSON
      try {
        const parsed = JSON.parse(item);
        return parsed as T;
      } catch {
        // Not JSON, migrate it
        const value = item as unknown as T;
        // Re-save as JSON
        this.set(key, value);
        return value;
      }
    } catch (error) {
      logger.error(`Error migrating localStorage key "${key}"`, error as Error, { component: 'StorageService', action: 'migrate' });
      return defaultValue;
    }
  }

  /**
   * Batch migration for multiple keys
   */
  static migrateKeys(keys: string[]): void {
    keys.forEach(key => {
      const value = this.get(key, null);
      if (value !== null) {
        this.set(key, value);
      }
    });
  }

  /**
   * Storage event listener for cross-tab synchronization
   */
  static onChange<T = unknown>(key: string, callback: (value: T) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const value = JSON.parse(e.newValue);
          callback(value);
        } catch {
          // Handle plain string values
          callback(e.newValue as T);
        }
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  /**
   * Get storage size in bytes
   */
  static getSize(): number {
    let size = 0;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          size += value.length + key.length;
        }
      });
    } catch {
      // Ignore errors
    }
    return size;
  }

  /**
   * Check if storage is available
   */
  static isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Storage keys used throughout the application
 * Centralized for easy management and migration
 */
export const STORAGE_KEYS = {
  // Virgil Chat
  SELECTED_MODEL: 'virgil-selected-model',
  CUSTOM_SYSTEM_PROMPT: 'virgil-custom-system-prompt',
  WINDOW_SIZE: 'virgil-window-size',
  ACTIVE_CONVERSATION: 'virgil-active-conversation',

  // User preferences
  ELEVATION_UNIT: 'elevationUnit',
  WEATHER_UNIT: 'weatherUnit',
  WEATHER_DATA: 'weatherData',
  WEATHER_LAST_UPDATED: 'weatherLastUpdated',
  RHYTHM_VOLUME: 'rhythmVolume',

  // App data
  VIRGIL_HABITS: 'virgil_habits',
  DOG_FAVORITES: 'virgil_dog_favorites',
  NASA_FAVORITES: 'virgil_nasa_favorites',
  GIPHY_FAVORITES: 'giphy-favorites',
  RHYTHM_SAVE_SLOTS: 'rhythmMachineSaveSlots',
  PERFECT_CIRCLE_BEST: 'perfectCircleBestScore',
  PERFECT_CIRCLE_ATTEMPTS: 'perfectCircleAttempts',
  CAMERA_SETTINGS: 'virgil_camera_settings',
  CAMERA_VERSION: 'virgil_camera_version',
  SAVED_PLACES: 'virgil_saved_places',
  LAST_DESTINATION: 'virgil_last_destination',
  NOTES_AI_ENABLED: 'notesAiEnabled',
  TIMEZONES: 'virgil_selected_timezones',
  USER_EMAIL: 'virgil_email',
} as const;

/**
 * Type-safe storage wrapper
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
