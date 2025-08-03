/**
 * AppDataService - Handles app data storage in IndexedDB
 * 
 * Migrates app data from localStorage to IndexedDB for better performance
 * and storage capacity. Provides simple get/set interface.
 */

import { indexedDBService } from './IndexedDBService';
import { timeService } from './TimeService';
import { logger } from '../lib/logger';

interface AppDataItem<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
}

class AppDataService {
  private static instance: AppDataService;
  private readonly DB_NAME = 'VirgilAppDataDB';
  private readonly STORE_NAME = 'appData';
  private initPromise: Promise<void> | null = null;

  // Keys to migrate from localStorage to IndexedDB
  private readonly MIGRATION_KEYS = [
    'virgil_dog_favorites',
    'virgil_nasa_favorites',
    'giphy-favorites',
    'virgil_habits',
    'rhythmMachineSaveSlots',
    'virgil_selected_timezones',
    'perfectCircleBestScore',
    'perfectCircleAttempts',
    'perfectCircleScoreHistory',
    'perfectCircleLastPlay',
  ];

  private constructor() {
    // Register the database configuration
    indexedDBService.registerDatabase({
      name: this.DB_NAME,
      version: 1,
      stores: [{
        name: this.STORE_NAME,
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      }],
    });
    // Do NOT start initialization here - wait for explicit init() call
  }

  static getInstance(): AppDataService {
    if (!AppDataService.instance) {
      AppDataService.instance = new AppDataService();
    }
    return AppDataService.instance;
  }

  /**
   * Initialize the service - call this after user authentication
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  /**
   * Initialize database and run migration
   */
  private async initialize(): Promise<void> {
    try {
      // Test database connection first
      await indexedDBService.count(this.DB_NAME, this.STORE_NAME);
      
      await this.migrateFromLocalStorage();
    } catch (error) {
      logger.error('Failed to initialize AppDataService', error as Error, {
        component: 'AppDataService',
        action: 'initialize',
      });
      throw error; // Re-throw to handle in caller
    }
  }

  /**
   * Ensure initialization is complete
   */
  async ready(): Promise<void> {
    if (!this.initPromise) {
      throw new Error('AppDataService not initialized. Call init() first.');
    }
    return this.initPromise;
  }


  /**
   * Get data from IndexedDB
   */
  async get<T>(key: string): Promise<T | null> {
    // Auto-initialize if not already initialized
    if (!this.initPromise) {
      await this.init();
    }
    
    // Wait for initialization to complete
    await this.initPromise;
    
    try {
      const result = await indexedDBService.get<AppDataItem<T>>(this.DB_NAME, this.STORE_NAME, key);
      if (result.success && result.data) {
        return result.data.data;
      }
      
      // If no data in IndexedDB, check localStorage as fallback during migration
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          // Save to IndexedDB for next time
          await this.setInternal(key, parsed);
          return parsed as T;
        } catch {
          // Save non-JSON data as well
          await this.setInternal(key, localData);
          return localData as unknown as T;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get app data for key: ${key}`, error as Error, {
        component: 'AppDataService',
        action: 'get',
      });
      return null;
    }
  }

  /**
   * Set data in IndexedDB (internal use - doesn't wait for init)
   */
  private async setInternal<T>(key: string, data: T): Promise<boolean> {
    try {
      const item: AppDataItem<T> = {
        id: key,
        data,
        timestamp: timeService.getTimestamp(),
      };
      
      const result = await indexedDBService.put(this.DB_NAME, this.STORE_NAME, item);
      return result.success;
    } catch (error) {
      logger.error(`Failed to set app data for key: ${key}`, error as Error, {
        component: 'AppDataService',
        action: 'set',
      });
      return false;
    }
  }

  /**
   * Set data in IndexedDB (public API - waits for init)
   */
  async set<T>(key: string, data: T): Promise<boolean> {
    // Auto-initialize if not already initialized
    if (!this.initPromise) {
      await this.init();
    }
    await this.initPromise;
    return this.setInternal(key, data);
  }

  /**
   * Remove data from IndexedDB
   */
  async remove(key: string): Promise<boolean> {
    if (!this.initPromise) {
      throw new Error('AppDataService not initialized. Call init() first.');
    }
    await this.initPromise;
    
    try {
      const result = await indexedDBService.delete(this.DB_NAME, this.STORE_NAME, key);
      return result.success;
    } catch (error) {
      logger.error(`Failed to remove app data for key: ${key}`, error as Error, {
        component: 'AppDataService',
        action: 'remove',
      });
      return false;
    }
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  private async migrateFromLocalStorage(): Promise<void> {
    await Promise.all(
      this.MIGRATION_KEYS.map(async (key) => {
        const localData = localStorage.getItem(key);
        if (localData !== null) {
          try {
            const data = localData.startsWith('{') || localData.startsWith('[') 
              ? JSON.parse(localData) 
              : localData;
            
            await this.setInternal(key, data);
          } catch (error) {
            logger.warn(`Failed to migrate ${key} from localStorage`, {
              component: 'AppDataService',
              action: 'migrateFromLocalStorage',
              metadata: { key, error },
            });
          }
        }
      }),
    );
  }

  /**
   * Get all app data keys (for debugging/analysis)
   */
  async getAllKeys(): Promise<string[]> {
    if (!this.initPromise) {
      return []; // Return empty if not initialized
    }
    await this.initPromise;
    
    try {
      const result = await indexedDBService.getAll<AppDataItem<unknown>>(this.DB_NAME, this.STORE_NAME);
      if (result.success && result.data) {
        return result.data.map(item => item.id);
      }
      return [];
    } catch (error) {
      logger.error('Failed to get all app data keys', error as Error, {
        component: 'AppDataService',
        action: 'getAllKeys',
      });
      return [];
    }
  }
}

export const appDataService = AppDataService.getInstance();