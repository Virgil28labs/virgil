/**
 * Unified IndexedDB Service
 *
 * Provides consistent interface for all IndexedDB operations with:
 * - Automatic connection management
 * - Retry logic for failed operations
 * - Error handling and logging
 * - Performance monitoring
 * - Cross-database transactions
 */

import { logger } from '../lib/logger';

interface DBConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

interface StoreConfig {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

interface IndexConfig {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
}

export class IndexedDBService {
  private static instance: IndexedDBService;
  private databases: Map<string, IDBDatabase> = new Map();
  private configs: Map<string, DBConfig> = new Map();
  private pendingConnections: Map<string, Promise<IDBDatabase>> = new Map();
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  private constructor() {}

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  /**
   * Register a database configuration
   */
  registerDatabase(config: DBConfig): void {
    this.configs.set(config.name, config);
  }

  /**
   * Get or create a database connection
   */
  private async getDatabase(dbName: string): Promise<IDBDatabase> {
    // Return existing connection if available
    const existing = this.databases.get(dbName);
    if (existing && existing.version) {
      return existing;
    }

    // Return pending connection if one exists
    const pending = this.pendingConnections.get(dbName);
    if (pending) {
      return pending;
    }

    // Create new connection
    const connectionPromise = this.connectToDatabase(dbName);
    this.pendingConnections.set(dbName, connectionPromise);

    try {
      const db = await connectionPromise;
      this.databases.set(dbName, db);
      this.pendingConnections.delete(dbName);
      return db;
    } catch (error) {
      logger.error('Failed to get database connection', error as Error, {
        component: 'IndexedDBService',
        action: 'getDatabase',
        metadata: { dbName },
      });
      this.pendingConnections.delete(dbName);
      throw error;
    }
  }

  /**
   * Connect to a database with upgrade handling
   */
  private connectToDatabase(dbName: string): Promise<IDBDatabase> {
    const config = this.configs.get(dbName);
    if (!config) {
      throw new Error(`Database ${dbName} not registered`);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database ${dbName}: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const db = request.result;

        // Handle version changes
        db.onversionchange = () => {
          db.close();
          this.databases.delete(dbName);
        };

        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores as needed
        config.stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement,
            });

            // Create indexes
            storeConfig.indexes?.forEach(indexConfig => {
              store.createIndex(
                indexConfig.name,
                indexConfig.keyPath,
                indexConfig.options,
              );
            });
          }
        });
      };
    });
  }

  /**
   * Execute an operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.retryAttempts,
  ): Promise<OperationResult<T>> {
    const startTime = performance.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          duration: performance.now() - startTime,
        };
      } catch (error) {
        if (attempt === retries) {
          logger.error('Operation failed after all retries', error as Error, {
            component: 'IndexedDBService',
            action: 'executeWithRetry',
            metadata: { attempt, retries },
          });
          return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            duration: performance.now() - startTime,
          };
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)),
        );
      }
    }

    return {
      success: false,
      error: new Error('Operation failed after all retries'),
      duration: performance.now() - startTime,
    };
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(dbName: string, storeName: string): Promise<OperationResult<T[]>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get all from ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Get a single record by key
   */
  async get<T>(dbName: string, storeName: string, key: IDBValidKey): Promise<OperationResult<T | undefined>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get ${key} from ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Add a new record
   */
  async add<T>(dbName: string, storeName: string, data: T): Promise<OperationResult<IDBValidKey>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<IDBValidKey>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to add to ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Update an existing record
   */
  async put<T>(dbName: string, storeName: string, data: T): Promise<OperationResult<IDBValidKey>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<IDBValidKey>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to put to ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Delete a record
   */
  async delete(dbName: string, storeName: string, key: IDBValidKey): Promise<OperationResult<void>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete ${key} from ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Clear all records from a store
   */
  async clear(dbName: string, storeName: string): Promise<OperationResult<void>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Count records in a store
   */
  async count(dbName: string, storeName: string): Promise<OperationResult<number>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to count ${storeName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Query records using an index
   */
  async query<T>(
    dbName: string,
    storeName: string,
    indexName: string,
    query?: IDBKeyRange | IDBValidKey,
  ): Promise<OperationResult<T[]>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);

      return new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = query ? index.getAll(query) : index.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to query ${indexName}: ${request.error?.message}`));
      });
    });
  }

  /**
   * Execute a transaction across multiple stores
   */
  async transaction<T>(
    dbName: string,
    storeNames: string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(async () => {
      const db = await this.getDatabase(dbName);
      const transaction = db.transaction(storeNames, mode);

      return operation(transaction);
    });
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<OperationResult<StorageEstimate | null>> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { success: true, data: null };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return { success: true, data: estimate };
    } catch (error) {
      logger.error('Failed to get storage estimate', error as Error, {
        component: 'IndexedDBService',
        action: 'getStorageEstimate',
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get storage estimate'),
      };
    }
  }

  /**
   * Close a database connection
   */
  closeDatabase(dbName: string): void {
    const db = this.databases.get(dbName);
    if (db) {
      db.close();
      this.databases.delete(dbName);
    }
  }

  /**
   * Close all database connections
   */
  closeAll(): void {
    this.databases.forEach((db) => {
      db.close();
    });
    this.databases.clear();
    this.pendingConnections.clear();
  }

  /**
   * Delete a database
   */
  async deleteDatabase(dbName: string): Promise<OperationResult<void>> {
    this.closeDatabase(dbName);

    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({
        success: false,
        error: new Error(`Failed to delete database ${dbName}: ${request.error?.message}`),
      });
    });
  }
}

// Export singleton instance
export const indexedDBService = IndexedDBService.getInstance();

// Register existing databases
// Note: VirgilMemory database removed - chat/memory functionality now uses Supabase

indexedDBService.registerDatabase({
  name: 'VirgilCameraDB',
  version: 1,
  stores: [
    {
      name: 'photos',
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'isFavorite', keyPath: 'isFavorite' },
      ],
    },
  ],
});

indexedDBService.registerDatabase({
  name: 'VirgilAppDataDB',
  version: 1,
  stores: [
    {
      name: 'appData',
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
  ],
});

indexedDBService.registerDatabase({
  name: 'NotesDB',
  version: 1,
  stores: [
    {
      name: 'notes',
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'tags', keyPath: 'tags', options: { unique: false, multiEntry: true } },
      ],
    },
  ],
});
