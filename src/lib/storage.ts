/**
 * Centralized localStorage utility with error handling and type safety
 */

import { logger } from "./logger";

type StorageKey = string;
type StorageValue = any;

interface StorageItem<T> {
  value: T;
  timestamp?: number;
  expiresAt?: number;
}

class Storage {
  private prefix = "virgil_";

  /**
   * Get a value from localStorage with error handling
   */
  get<T = any>(key: StorageKey, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) {
        return defaultValue ?? null;
      }

      const parsed: StorageItem<T> = JSON.parse(item);

      // Check if item has expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return parsed.value;
    } catch (error) {
      logger.error(`Failed to get item from localStorage: ${key}`, error);
      return defaultValue ?? null;
    }
  }

  /**
   * Set a value in localStorage with optional expiration
   */
  set<T>(key: StorageKey, value: T, expirationMinutes?: number): boolean {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
      };

      if (expirationMinutes) {
        item.expiresAt = Date.now() + expirationMinutes * 60 * 1000;
      }

      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      return true;
    } catch (error) {
      logger.error(`Failed to set item in localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Remove a value from localStorage
   */
  remove(key: StorageKey): boolean {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      logger.error(`Failed to remove item from localStorage: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all items with the app prefix
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      logger.error("Failed to clear localStorage", error);
      return false;
    }
  }

  /**
   * Check if a key exists in localStorage
   */
  has(key: StorageKey): boolean {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  /**
   * Get all keys with the app prefix
   */
  keys(): string[] {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .map((key) => key.substring(this.prefix.length));
  }

  /**
   * Get the size of stored data for a key (in bytes)
   */
  getSize(key: StorageKey): number {
    const item = localStorage.getItem(this.prefix + key);
    return item ? new Blob([item]).size : 0;
  }

  /**
   * Get total size of all stored data (in bytes)
   */
  getTotalSize(): number {
    let total = 0;
    this.keys().forEach((key) => {
      total += this.getSize(key);
    });
    return total;
  }
}

// Export singleton instance
export const storage = new Storage();

// Storage keys used across the app
export const STORAGE_KEYS = {
  USER_PROFILE: "userProfile",
  FAVORITE_DOGS: "favoriteDogs",
  NOTES: "notes",
  NOTE_CATEGORIES: "noteCategories",
  HABITS: "habits",
  USER_TIMEZONE: "userTimezone",
  WEATHER_UNIT: "weatherUnit",
  THEME: "theme",
  LANGUAGE: "language",
  CAMERA_PERMISSION: "cameraPermission",
  LOCATION_PERMISSION: "locationPermission",
  NOTIFICATION_PERMISSION: "notificationPermission",
} as const;

export type StorageKeyType = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
