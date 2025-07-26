/**
 * Storage Migration Service
 *
 * Handles migration of localStorage values from plain strings to JSON format
 * and ensures consistency across the application
 */

import { StorageService, STORAGE_KEYS } from './StorageService';
import { logger } from '../lib/logger';

interface MigrationResult {
  key: string;
  success: boolean;
  oldValue: unknown;
  newValue: unknown;
  error?: string;
}

export class StorageMigration {
  private static MIGRATION_VERSION_KEY = 'virgil_storage_migration_version';
  private static CURRENT_VERSION = '1.0.0';

  /**
   * Run all necessary migrations
   */
  static async runMigrations(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    // Check if migrations have already been run
    const lastVersion = StorageService.get(this.MIGRATION_VERSION_KEY, '0.0.0');
    if (lastVersion === this.CURRENT_VERSION) {
      logger.info('Storage migrations already up to date');
      return results;
    }

    logger.info('Running storage migrations...');

    // Migrate string values that should remain strings but need JSON encoding
    const stringKeys = [
      STORAGE_KEYS.SELECTED_MODEL,
      STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT,
      STORAGE_KEYS.WINDOW_SIZE,
      STORAGE_KEYS.ELEVATION_UNIT,
      STORAGE_KEYS.WEATHER_UNIT,
      STORAGE_KEYS.LAST_DESTINATION,
      STORAGE_KEYS.USER_EMAIL,
    ];

    for (const key of stringKeys) {
      const result = this.migrateStringValue(key);
      results.push(result);
    }

    // Migrate number values
    const numberKeys = [
      STORAGE_KEYS.PERFECT_CIRCLE_BEST,
      STORAGE_KEYS.PERFECT_CIRCLE_ATTEMPTS,
      STORAGE_KEYS.RHYTHM_VOLUME,
      STORAGE_KEYS.WEATHER_LAST_UPDATED,
    ];

    for (const key of numberKeys) {
      const result = this.migrateNumberValue(key);
      results.push(result);
    }

    // Migrate boolean values
    const booleanKeys = [
      STORAGE_KEYS.NOTES_AI_ENABLED,
    ];

    for (const key of booleanKeys) {
      const result = this.migrateBooleanValue(key);
      results.push(result);
    }

    // Update migration version
    StorageService.set(this.MIGRATION_VERSION_KEY, this.CURRENT_VERSION);

    logger.info('Storage migrations completed', {
      component: 'StorageMigration',
      action: 'runMigrations',
      metadata: { results },
    });
    return results;
  }

  /**
   * Migrate a string value to JSON format
   */
  private static migrateStringValue(key: string): MigrationResult {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) {
        return { key, success: true, oldValue: null, newValue: null };
      }

      // Check if it's already JSON
      try {
        JSON.parse(rawValue);
        // Already JSON, no migration needed
        return { key, success: true, oldValue: rawValue, newValue: rawValue };
      } catch {
        // Not JSON, needs migration
        const newValue = JSON.stringify(rawValue);
        localStorage.setItem(key, newValue);
        return {
          key,
          success: true,
          oldValue: rawValue,
          newValue: newValue,
        };
      }
    } catch (error) {
      return {
        key,
        success: false,
        oldValue: null,
        newValue: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate a number value to JSON format
   */
  private static migrateNumberValue(key: string): MigrationResult {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) {
        return { key, success: true, oldValue: null, newValue: null };
      }

      // Check if it's already JSON
      try {
        JSON.parse(rawValue);
        // Already JSON, no migration needed
        return { key, success: true, oldValue: rawValue, newValue: rawValue };
      } catch {
        // Not JSON, needs migration
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
          const newValue = JSON.stringify(numValue);
          localStorage.setItem(key, newValue);
          return {
            key,
            success: true,
            oldValue: rawValue,
            newValue: newValue,
          };
        } else {
          // Invalid number, remove it
          localStorage.removeItem(key);
          return {
            key,
            success: true,
            oldValue: rawValue,
            newValue: null,
          };
        }
      }
    } catch (error) {
      return {
        key,
        success: false,
        oldValue: null,
        newValue: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate a boolean value to JSON format
   */
  private static migrateBooleanValue(key: string): MigrationResult {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) {
        return { key, success: true, oldValue: null, newValue: null };
      }

      // Check if it's already JSON
      try {
        JSON.parse(rawValue);
        // Already JSON, no migration needed
        return { key, success: true, oldValue: rawValue, newValue: rawValue };
      } catch {
        // Not JSON, needs migration
        const boolValue = rawValue === 'true' || rawValue === 'True' || rawValue === '1';
        const newValue = JSON.stringify(boolValue);
        localStorage.setItem(key, newValue);
        return {
          key,
          success: true,
          oldValue: rawValue,
          newValue: newValue,
        };
      }
    } catch (error) {
      return {
        key,
        success: false,
        oldValue: null,
        newValue: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up deprecated storage keys
   */
  static cleanupDeprecatedKeys(deprecatedKeys: string[]): void {
    deprecatedKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        logger.info(`Removed deprecated key: ${key}`);
      } catch (error) {
        logger.error(
          `Failed to remove deprecated key ${key}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'StorageMigration',
            action: 'cleanupDeprecatedKeys',
            metadata: { key },
          },
        );
      }
    });
  }

  /**
   * Validate storage integrity
   */
  static validateStorage(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that all expected keys can be parsed as JSON
    const allKeys = Object.values(STORAGE_KEYS);

    for (const key of allKeys) {
      const rawValue = localStorage.getItem(key);
      if (rawValue !== null) {
        try {
          JSON.parse(rawValue);
        } catch {
          errors.push(`Key "${key}" contains invalid JSON: ${rawValue}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a backup of current localStorage
   */
  static createBackup(): Record<string, string> {
    const backup: Record<string, string> = {};

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          backup[key] = localStorage.getItem(key) || '';
        }
      }
    } catch (error) {
      logger.error(
        'Failed to create backup',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'StorageMigration',
          action: 'createBackup',
        },
      );
    }

    return backup;
  }

  /**
   * Restore from backup
   */
  static restoreFromBackup(backup: Record<string, string>): void {
    try {
      // Clear current storage
      localStorage.clear();

      // Restore from backup
      Object.entries(backup).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      logger.info('Storage restored from backup');
    } catch (error) {
      logger.error(
        'Failed to restore from backup',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'StorageMigration',
          action: 'restoreFromBackup',
        },
      );
    }
  }
}
