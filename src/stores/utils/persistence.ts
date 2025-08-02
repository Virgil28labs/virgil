/**
 * Persistence Utilities
 * 
 * Simple utilities for managing localStorage persistence with TTL support
 * and error handling for the Context Store.
 */

import { timeService } from '../../services/TimeService';

// Performance metrics tracking
const performanceMetrics = {
  operations: {
    read: { count: 0, totalTime: 0 },
    write: { count: 0, totalTime: 0 },
    remove: { count: 0, totalTime: 0 },
  },
  
  track: (operation: 'read' | 'write' | 'remove', startTime: number) => {
    const duration = performance.now() - startTime;
    performanceMetrics.operations[operation].count++;
    performanceMetrics.operations[operation].totalTime += duration;
  },
  
  getStats: () => ({
    read: {
      count: performanceMetrics.operations.read.count,
      avgTime: performanceMetrics.operations.read.count > 0 
        ? performanceMetrics.operations.read.totalTime / performanceMetrics.operations.read.count 
        : 0,
    },
    write: {
      count: performanceMetrics.operations.write.count,
      avgTime: performanceMetrics.operations.write.count > 0 
        ? performanceMetrics.operations.write.totalTime / performanceMetrics.operations.write.count 
        : 0,
    },
    remove: {
      count: performanceMetrics.operations.remove.count,
      avgTime: performanceMetrics.operations.remove.count > 0 
        ? performanceMetrics.operations.remove.totalTime / performanceMetrics.operations.remove.count 
        : 0,
    },
  }),
  
  reset: () => {
    performanceMetrics.operations = {
      read: { count: 0, totalTime: 0 },
      write: { count: 0, totalTime: 0 },
      remove: { count: 0, totalTime: 0 },
    };
  },
};

export interface TTLData<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  // Storage keys with versioning
  keys: {
    user: 'virgil-user-v1',
    weatherCache: 'virgil-weather-cache-v1',
    locationCache: 'virgil-location-cache-v1',
    preferences: 'virgil-preferences-v1',
  },
  
  // TTL durations in milliseconds
  ttl: {
    weather: 30 * 60 * 1000,      // 30 minutes
    location: 24 * 60 * 60 * 1000, // 24 hours
    user: Infinity,                // Never expires
    preferences: Infinity,         // Never expires
  },

  // Storage quotas and limits
  limits: {
    maxStorageSize: 50 * 1024,    // 50KB soft limit
    warningThreshold: 0.8,        // Warn at 80% usage
    criticalThreshold: 0.95,      // Critical at 95% usage
    maxEntries: 100,              // Max cache entries
  },
} as const;

/**
 * Create TTL data wrapper
 */
export const createTTLData = <T>(data: T, ttlMs: number): TTLData<T> => {
  const now = timeService.getTimestamp();
  return {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  };
};

/**
 * Check if TTL data is expired
 */
export const isTTLExpired = (ttlData: TTLData | null): boolean => {
  if (!ttlData) return true;
  return timeService.getTimestamp() > ttlData.expiresAt;
};

/**
 * Get data from TTL wrapper if not expired
 */
export const getTTLData = <T>(ttlData: TTLData<T> | null): T | null => {
  if (!ttlData || isTTLExpired(ttlData)) {
    return null;
  }
  return ttlData.data;
};

/**
 * Safe localStorage operations with error handling and performance tracking
 */
export const storage: {
  set: (key: string, value: unknown) => boolean;
  get: <T = unknown>(key: string) => T | null;
  remove: (key: string) => boolean;
  clear: () => boolean;
  exists: (key: string) => boolean;
  size: () => number;
  getAllKeys: () => string[];
  clearAll: () => void;
  cleanupExpired: () => { cleaned: number; errors: string[] };
  checkQuota: () => { status: 'healthy' | 'warning' | 'critical'; message: string; usage: { used: number; total: number; percentage: number } };
  getUsage: () => { used: number; total: number; percentage: number };
  performMaintenance: () => { quota: ReturnType<typeof storage.checkQuota>; cleanup: ReturnType<typeof storage.cleanupExpired> };
  monitorQuota: () => boolean;
  getPerformanceMetrics: () => { read: { count: number; avgTime: number }; write: { count: number; avgTime: number }; remove: { count: number; avgTime: number } };
  resetPerformanceMetrics: () => void;
} = {
  /**
   * Set item in localStorage with error handling
   */
  set: (key: string, value: unknown): boolean => {
    const startTime = performance.now();
    try {
      localStorage.setItem(key, JSON.stringify(value));
      performanceMetrics.track('write', startTime);
      return true;
    } catch (error) {
      performanceMetrics.track('write', startTime);
      console.warn(`Failed to save to localStorage (${key}):`, error);
      return false;
    }
  },

  /**
   * Get item from localStorage with error handling
   */
  get: <T = unknown>(key: string): T | null => {
    const startTime = performance.now();
    try {
      const item = localStorage.getItem(key);
      performanceMetrics.track('read', startTime);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      performanceMetrics.track('read', startTime);
      console.warn(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  },

  /**
   * Remove item from localStorage
   */
  remove: (key: string): boolean => {
    const startTime = performance.now();
    try {
      localStorage.removeItem(key);
      performanceMetrics.track('remove', startTime);
      return true;
    } catch (error) {
      performanceMetrics.track('remove', startTime);
      console.warn(`Failed to remove from localStorage (${key}):`, error);
      return false;
    }
  },

  /**
   * Clear all localStorage
   */
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  },

  /**
   * Check if key exists in localStorage
   */
  exists: (key: string): boolean => {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.warn(`Failed to check if key exists (${key}):`, error);
      return false;
    }
  },

  /**
   * Get number of items in localStorage
   */
  size: (): number => {
    try {
      return localStorage.length;
    } catch (error) {
      console.warn('Failed to get localStorage size:', error);
      return 0;
    }
  },

  /**
   * Get all localStorage keys
   */
  getAllKeys: (): string[] => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      console.warn('Failed to get localStorage keys:', error);
      return [];
    }
  },

  /**
   * Clear all Virgil storage
   */
  clearAll: (): void => {
    Object.values(STORAGE_CONFIG.keys).forEach((key) => {
      storage.remove(key);
    });
  },

  /**
   * Clean up expired cache entries
   */
  cleanupExpired: (): { cleaned: number; errors: string[] } => {
    const errors: string[] = [];
    let cleaned = 0;

    // Check weather cache
    try {
      const weatherCache = storage.get(STORAGE_CONFIG.keys.weatherCache) as TTLData | null;
      if (weatherCache && isTTLExpired(weatherCache)) {
        storage.remove(STORAGE_CONFIG.keys.weatherCache);
        cleaned++;
      }
    } catch (error) {
      errors.push(`Weather cache cleanup failed: ${error}`);
    }

    // Check location cache
    try {
      const locationCache = storage.get(STORAGE_CONFIG.keys.locationCache) as TTLData | null;
      if (locationCache && isTTLExpired(locationCache)) {
        storage.remove(STORAGE_CONFIG.keys.locationCache);
        cleaned++;
      }
    } catch (error) {
      errors.push(`Location cache cleanup failed: ${error}`);
    }

    return { cleaned, errors };
  },

  /**
   * Perform maintenance on storage (cleanup + quota check)
   */
  performMaintenance: (): {
    quota: ReturnType<typeof storage.checkQuota>;
    cleanup: ReturnType<typeof storage.cleanupExpired>;
  } => {
    const cleanup = storage.cleanupExpired();
    const quota = storage.checkQuota();

    if (process.env.NODE_ENV === 'development') {
      // Storage maintenance performed
    }

    return { quota, cleanup };
  },

  /**
   * Get storage usage estimate
   */
  getUsage: (): { used: number; total: number; percentage: number } => {
    try {
      let used = 0;
      Object.values(STORAGE_CONFIG.keys).forEach((key) => {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length;
        }
      });
      
      // Rough estimate: 5MB typical localStorage limit
      const total = 5 * 1024 * 1024;
      const percentage = (used / total) * 100;
      
      return { used, total, percentage };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  },

  /**
   * Check if storage is approaching quota limits
   */
  checkQuota: (): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    usage: { used: number; total: number; percentage: number };
  } => {
    const usage = storage.getUsage();
    const percentage = usage.percentage / 100;
    
    if (percentage >= STORAGE_CONFIG.limits.criticalThreshold) {
      return {
        status: 'critical',
        message: `Storage usage critical: ${usage.percentage.toFixed(1)}% (${(usage.used / 1024).toFixed(1)}KB)`,
        usage,
      };
    } else if (percentage >= STORAGE_CONFIG.limits.warningThreshold) {
      return {
        status: 'warning',
        message: `Storage usage high: ${usage.percentage.toFixed(1)}% (${(usage.used / 1024).toFixed(1)}KB)`,
        usage,
      };
    } else {
      return {
        status: 'healthy',
        message: `Storage usage normal: ${usage.percentage.toFixed(1)}% (${(usage.used / 1024).toFixed(1)}KB)`,
        usage,
      };
    }
  },

  /**
   * Monitor storage and warn if approaching limits
   */
  monitorQuota: (): boolean => {
    const quota = storage.checkQuota();
    
    if (quota.status === 'critical') {
      console.error('🚨 Storage quota critical:', quota.message);
      return false;
    } else if (quota.status === 'warning') {
      console.warn('⚠️ Storage quota warning:', quota.message);
      return true;
    }
    
    return true;
  },

  /**
   * Get performance metrics for storage operations
   */
  getPerformanceMetrics: () => performanceMetrics.getStats(),

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics: () => performanceMetrics.reset(),
};

/**
 * Storage debugging utilities
 */
export const storageDebug = {
  /**
   * Log all persisted data
   */
  logAll: (): void => {
    if (process.env.NODE_ENV !== 'development') return;
    
    Object.entries(STORAGE_CONFIG.keys).forEach(([, key]) => {
      storage.get(key);
      // Log data for debugging
    });
    
    storage.getUsage();
    // Storage usage calculated
  },

  /**
   * Check TTL status of cached data
   */
  checkTTL: (): void => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const weatherCache = storage.get(STORAGE_CONFIG.keys.weatherCache) as TTLData | null;
    if (weatherCache) {
      isTTLExpired(weatherCache);
      // Weather cache status checked
    }
    
    const locationCache = storage.get(STORAGE_CONFIG.keys.locationCache) as TTLData | null;
    if (locationCache) {
      isTTLExpired(locationCache);
      // Location cache status checked
    }
  },
};

/**
 * Migration utilities for future schema changes
 */
export const migration = {
  /**
   * Check if migration is needed
   */
  needsMigration: (currentVersion: string, storedVersion?: string): boolean => {
    return storedVersion !== currentVersion;
  },

  /**
   * Simple version bump migration
   */
  migrateVersion: (oldKey: string, newKey: string): boolean => {
    try {
      const data = storage.get(oldKey);
      if (data) {
        storage.set(newKey, data);
        storage.remove(oldKey);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};