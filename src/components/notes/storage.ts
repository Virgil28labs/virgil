/**
 * IndexedDB storage layer for Notes application
 * Provides persistent storage with proper error handling and type safety
 */

import type { Entry } from './types';
import { NotesError, ErrorType } from './types';
import { STORAGE_CONFIG } from './constants';
import { timeService } from '../../services/TimeService';

/**
 * Handles all IndexedDB operations for notes storage
 * Implements error handling, retries, and data validation
 */
class NotesStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes the IndexedDB database
   * Creates the database and object stores if they don't exist
   * @throws {NotesError} If database initialization fails
   */
  async init(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(STORAGE_CONFIG.DB_NAME, STORAGE_CONFIG.DB_VERSION);

        request.onerror = () => {
          const error = new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to open database',
            request.error,
          );
          reject(error);
        };

        request.onsuccess = () => {
          this.db = request.result;

          // Handle database version changes
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            this.initPromise = null;
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
            const store = db.createObjectStore(STORAGE_CONFIG.STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          }
        };
      } catch (error) {
        reject(new NotesError(
          ErrorType.STORAGE_ERROR,
          'Failed to initialize database',
          error,
        ));
      }
    });

    return this.initPromise;
  }

  /**
   * Ensures the database is initialized before operations
   * @throws {NotesError} If database is not available
   */
  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Database not available',
      );
    }

    return this.db;
  }

  /**
   * Retrieves all entries from the database
   * @returns Promise<Entry[]> Array of all stored entries
   * @throws {NotesError} If retrieval fails
   */
  async getAllEntries(): Promise<Entry[]> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result.map(entry => ({
            ...entry,
            timestamp: timeService.parseDate(entry.timestamp) || timeService.getCurrentDateTime(),
          }));
          resolve(entries);
        };

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to retrieve entries',
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to get all entries',
        error,
      );
    }
  }

  /**
   * Adds a new entry to the database
   * @param entry The entry to add
   * @throws {NotesError} If the entry cannot be added
   */
  async addEntry(entry: Entry): Promise<void> {
    try {
      // Validate entry before saving
      if (!entry.id || !entry.content) {
        throw new NotesError(
          ErrorType.VALIDATION_ERROR,
          'Entry must have id and content',
        );
      }

      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const request = store.add({
          ...entry,
          timestamp: timeService.toISOString(entry.timestamp),
        });

        request.onsuccess = () => resolve();

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to add entry',
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to add entry',
        error,
      );
    }
  }

  /**
   * Updates an existing entry in the database
   * @param entry The entry to update
   * @throws {NotesError} If the entry cannot be updated
   */
  async updateEntry(entry: Entry): Promise<void> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const request = store.put({
          ...entry,
          timestamp: timeService.toISOString(entry.timestamp),
        });

        request.onsuccess = () => resolve();

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to update entry',
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to update entry',
        error,
      );
    }
  }

  /**
   * Deletes an entry from the database
   * @param id The ID of the entry to delete
   * @throws {NotesError} If the entry cannot be deleted
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to delete entry',
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to delete entry',
        error,
      );
    }
  }

  /**
   * Searches entries by content or tags
   * @param query The search query
   * @returns Promise<Entry[]> Matching entries
   */
  async searchEntries(query: string): Promise<Entry[]> {
    try {
      const allEntries = await this.getAllEntries();
      const lowerQuery = query.toLowerCase();

      return allEntries.filter(entry =>
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
      );
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to search entries',
        error,
      );
    }
  }

  /**
   * Retrieves entries with a specific tag
   * @param tag The tag to filter by
   * @returns Promise<Entry[]> Entries with the specified tag
   */
  async getEntriesByTag(tag: string): Promise<Entry[]> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const index = store.index('tags');
        const request = index.getAll(tag);

        request.onsuccess = () => {
          const entries = request.result.map(entry => ({
            ...entry,
            timestamp: timeService.parseDate(entry.timestamp) || timeService.getCurrentDateTime(),
          }));
          resolve(entries);
        };

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            `Failed to get entries with tag: ${tag}`,
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to get entries by tag',
        error,
      );
    }
  }

  /**
   * Retrieves entries within a date range
   * @param start Start date (inclusive)
   * @param end End date (inclusive)
   * @returns Promise<Entry[]> Entries within the date range
   */
  async getEntriesByDateRange(start: Date, end: Date): Promise<Entry[]> {
    try {
      const allEntries = await this.getAllEntries();

      return allEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : timeService.parseDate(entry.timestamp) || timeService.getCurrentDateTime();
        return entryDate >= start && entryDate <= end;
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to get entries by date range',
        error,
      );
    }
  }

  /**
   * Clears all entries from the database
   * Use with caution - this cannot be undone
   * @throws {NotesError} If the operation fails
   */
  async clearAllEntries(): Promise<void> {
    try {
      const db = await this.ensureDb();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORAGE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORAGE_CONFIG.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();

        request.onerror = () => {
          reject(new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to clear entries',
            request.error,
          ));
        };
      });
    } catch (error) {
      if (error instanceof NotesError) throw error;
      throw new NotesError(
        ErrorType.STORAGE_ERROR,
        'Failed to clear all entries',
        error,
      );
    }
  }
}

// Export a singleton instance
export const notesStorage = new NotesStorage();
