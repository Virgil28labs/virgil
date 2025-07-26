import type { SavedPhoto, PhotoStorageOptions } from '../../../types/camera.types';
import { CameraUtils } from './cameraUtils';
import { logger } from '../../../lib/logger';
import { timeService } from '../../../services/TimeService';

export class PhotoStorage {
  private static readonly PHOTOS_KEY = 'virgil_camera_photos';
  private static readonly SETTINGS_KEY = 'virgil_camera_settings';
  private static readonly VERSION_KEY = 'virgil_camera_version';
  private static readonly CURRENT_VERSION = '2.0.0'; // Bumped for IndexedDB migration

  // IndexedDB configuration
  private static readonly DB_NAME = 'VirgilCameraDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'photos';
  private static db: IDBDatabase | null = null;
  private static initPromise: Promise<void> | null = null;

  private static readonly DEFAULT_OPTIONS: PhotoStorageOptions = {
    maxStorage: 50, // 50MB
    compressionQuality: 0.8,
    autoCleanup: true,
    cleanupAfterDays: 30,
  };

  static async initialize(): Promise<void> {
    try {
      await this.initDB();
      await this.migrateData();
      await this.cleanupOldPhotos();
    } catch (error) {
      logger.error('Error initializing photo storage', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'initDB',
      });
    }
  }

  private static async initDB(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open database', request.error || new Error('Unknown database error'), {
          component: 'PhotoStorage',
          action: 'openDB',
        });
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private static async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  static async savePhoto(photo: Omit<SavedPhoto, 'id'>): Promise<SavedPhoto> {
    try {
      const photoId = CameraUtils.generatePhotoId();
      const size = CameraUtils.calculateDataUrlSize(photo.dataUrl);
      const dimensions = await CameraUtils.getImageDimensions(photo.dataUrl);

      const savedPhoto: SavedPhoto = {
        ...photo,
        id: photoId,
        size,
        ...dimensions,
      };

      await this.checkStorageQuota();

      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.add(savedPhoto);

        request.onsuccess = () => resolve(savedPhoto);
        request.onerror = () => {
          logger.error('Error saving photo', request.error || new Error('Unknown save error'), {
            component: 'PhotoStorage',
            action: 'savePhoto',
          });
          reject(new Error('Failed to save photo'));
        };
      });
    } catch (error) {
      logger.error('Error saving photo', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'savePhoto',
      });
      throw new Error('Failed to save photo');
    }
  }

  static async getAllPhotos(): Promise<SavedPhoto[]> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const photos = request.result as SavedPhoto[];
          resolve(photos.sort((a, b) => b.timestamp - a.timestamp));
        };

        request.onerror = () => {
          logger.error('Error loading photos', request.error || new Error('Unknown load error'), {
            component: 'PhotoStorage',
            action: 'loadPhotos',
          });
          resolve([]); // Return empty array on error
        };
      });
    } catch (error) {
      logger.error('Error loading photos', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'loadPhotos',
      });
      return [];
    }
  }

  static async getFavoritePhotos(): Promise<SavedPhoto[]> {
    const photos = await this.getAllPhotos();
    return photos.filter(photo => photo.isFavorite);
  }

  static async getPhotoById(id: string): Promise<SavedPhoto | null> {
    const photos = await this.getAllPhotos();
    return photos.find(photo => photo.id === id) || null;
  }

  static async updatePhoto(id: string, updates: Partial<SavedPhoto>): Promise<SavedPhoto | null> {
    try {
      const db = await this.ensureDB();

      // First get the existing photo
      const existingPhoto = await this.getPhotoById(id);
      if (!existingPhoto) return null;

      const updatedPhoto = { ...existingPhoto, ...updates };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(updatedPhoto);

        request.onsuccess = () => resolve(updatedPhoto);
        request.onerror = () => {
          logger.error('Error updating photo', request.error || new Error('Unknown update error'), {
            component: 'PhotoStorage',
            action: 'updatePhoto',
          });
          reject(new Error('Failed to update photo'));
        };
      });
    } catch (error) {
      logger.error('Error updating photo', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'updatePhoto',
      });
      throw new Error('Failed to update photo');
    }
  }

  static async deletePhoto(id: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          logger.error('Error deleting photo', request.error || new Error('Unknown delete error'), {
            component: 'PhotoStorage',
            action: 'deletePhoto',
          });
          resolve(false);
        };
      });
    } catch (error) {
      logger.error('Error deleting photo', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'deletePhoto',
      });
      throw new Error('Failed to delete photo');
    }
  }

  static async deletePhotos(ids: string[]): Promise<number> {
    try {
      const db = await this.ensureDB();
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        ids.forEach(id => {
          const request = store.delete(id);
          request.onsuccess = () => {
            deletedCount++;
          };
        });

        transaction.oncomplete = () => {
          resolve(deletedCount);
        };

        transaction.onerror = () => {
          logger.error('Error deleting photos', transaction.error || new Error('Unknown deletion error'), {
            component: 'PhotoStorage',
            action: 'deleteAllPhotos',
          });
          reject(new Error('Failed to delete photos'));
        };
      });
    } catch (error) {
      logger.error('Error deleting photos', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'deletePhotos',
      });
      throw new Error('Failed to delete photos');
    }
  }

  static async toggleFavorite(id: string): Promise<boolean> {
    try {
      const photo = await this.getPhotoById(id);

      if (!photo) return false;

      const updatedPhoto = await this.updatePhoto(id, { isFavorite: !photo.isFavorite });

      return updatedPhoto?.isFavorite || false;
    } catch (error) {
      logger.error('Error toggling favorite', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'toggleFavorite',
      });
      throw new Error('Failed to toggle favorite');
    }
  }

  static async getStorageInfo(): Promise<{
    totalPhotos: number
    totalSize: number
    maxSize: number
    usedPercentage: number
    favoriteCount: number
  }> {
    try {
      const photos = await this.getAllPhotos();
      const options = this.getStorageOptions();

      const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
      const maxSize = options.maxStorage * 1024 * 1024; // Convert MB to bytes
      const usedPercentage = (totalSize / maxSize) * 100;
      const favoriteCount = photos.filter(photo => photo.isFavorite).length;

      return {
        totalPhotos: photos.length,
        totalSize,
        maxSize,
        usedPercentage,
        favoriteCount,
      };
    } catch (error) {
      logger.error('Error getting storage info', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'getStorageInfo',
      });
      return {
        totalPhotos: 0,
        totalSize: 0,
        maxSize: this.DEFAULT_OPTIONS.maxStorage * 1024 * 1024,
        usedPercentage: 0,
        favoriteCount: 0,
      };
    }
  }

  static async clearAllPhotos(): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          logger.error('Error clearing photos', request.error || new Error('Unknown clear error'), {
            component: 'PhotoStorage',
            action: 'clearAllPhotos',
          });
          reject(new Error('Failed to clear photos'));
        };
      });
    } catch (error) {
      logger.error('Error clearing photos', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'clearAllPhotos',
      });
      throw new Error('Failed to clear photos');
    }
  }

  static async exportPhotos(photos: SavedPhoto[]): Promise<string> {
    try {
      const exportData = {
        version: this.CURRENT_VERSION,
        timestamp: timeService.getTimestamp(),
        photos,
        totalPhotos: photos.length,
        totalSize: photos.reduce((sum, photo) => sum + (photo.size || 0), 0),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Error exporting photos', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'exportPhotos',
      });
      throw new Error('Failed to export photos');
    }
  }

  static async importPhotos(jsonData: string): Promise<number> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.photos || !Array.isArray(importData.photos)) {
        throw new Error('Invalid import data format');
      }

      const existingPhotos = await this.getAllPhotos();
      const existingIds = new Set(existingPhotos.map(p => p.id));

      const newPhotos = importData.photos.filter((photo: SavedPhoto) =>
        !existingIds.has(photo.id),
      );

      if (newPhotos.length === 0) {
        return 0;
      }

      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        let addedCount = 0;

        newPhotos.forEach((photo: SavedPhoto) => {
          const request = store.add(photo);
          request.onsuccess = () => {
            addedCount++;
          };
        });

        transaction.oncomplete = () => {
          resolve(addedCount);
        };

        transaction.onerror = () => {
          logger.error('Error importing photos', transaction.error || new Error('Unknown import error'), {
            component: 'PhotoStorage',
            action: 'importPhotos',
          });
          reject(new Error('Failed to import photos'));
        };
      });
    } catch (error) {
      logger.error('Error importing photos', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'importPhotos',
      });
      throw new Error('Failed to import photos');
    }
  }

  static getStorageOptions(): PhotoStorageOptions {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) return this.DEFAULT_OPTIONS;

      const saved = JSON.parse(data) as Partial<PhotoStorageOptions>;
      return { ...this.DEFAULT_OPTIONS, ...saved };
    } catch (error) {
      logger.error('Error loading storage options', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'getStorageOptions',
      });
      return this.DEFAULT_OPTIONS;
    }
  }

  static saveStorageOptions(options: Partial<PhotoStorageOptions>): void {
    try {
      const current = this.getStorageOptions();
      const updated = { ...current, ...options };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Error saving storage options', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'saveStorageOptions',
      });
    }
  }

  private static async checkStorageQuota(): Promise<void> {
    const storageInfo = await this.getStorageInfo();

    if (storageInfo.usedPercentage > 90) {
      throw new Error('Storage is almost full. Please delete some photos.');
    }
  }

  private static async cleanupOldPhotos(): Promise<void> {
    const options = this.getStorageOptions();

    if (!options.autoCleanup) return;

    try {
      const photos = await this.getAllPhotos();
      const cutoffTime = timeService.getTimestamp() - (options.cleanupAfterDays * 24 * 60 * 60 * 1000);

      const photosToDelete = photos.filter(photo =>
        photo.timestamp <= cutoffTime && !photo.isFavorite,
      );

      if (photosToDelete.length > 0) {
        const idsToDelete = photosToDelete.map(photo => photo.id);
        await this.deletePhotos(idsToDelete);
      }
    } catch (_error) {
      // Storage cleanup errors are non-critical
    }
  }

  private static async migrateData(): Promise<void> {
    try {
      const currentVersion = localStorage.getItem(this.VERSION_KEY);

      if (currentVersion === this.CURRENT_VERSION) {
        return;
      }

      // Migrate photos from localStorage to IndexedDB
      const localStoragePhotos = localStorage.getItem(this.PHOTOS_KEY);
      if (localStoragePhotos) {
        try {
          const photos = JSON.parse(localStoragePhotos) as SavedPhoto[];
          if (photos.length > 0) {
            logger.info(`Migrating ${photos.length} photos from localStorage to IndexedDB...`, {
              component: 'PhotoStorage',
              action: 'migrateFromLocalStorage',
            });

            const db = await this.ensureDB();

            // Add all photos to IndexedDB
            await new Promise<void>((resolve, reject) => {
              const transaction = db.transaction([this.STORE_NAME], 'readwrite');
              const store = transaction.objectStore(this.STORE_NAME);
              let migratedCount = 0;

              photos.forEach(photo => {
                const request = store.add(photo);
                request.onsuccess = () => {
                  migratedCount++;
                };
                request.onerror = () => {
                  logger.warn(`Failed to migrate photo ${photo.id}`, {
                    component: 'PhotoStorage',
                    action: 'migrateFromLocalStorage',
                    metadata: { photoId: photo.id, error: request.error },
                  });
                };
              });

              transaction.oncomplete = () => {
                logger.info(`Successfully migrated ${migratedCount} photos to IndexedDB`, {
                  component: 'PhotoStorage',
                  action: 'migrateFromLocalStorage',
                  metadata: { count: migratedCount },
                });
                // Remove photos from localStorage after successful migration
                localStorage.removeItem(this.PHOTOS_KEY);
                resolve();
              };

              transaction.onerror = () => {
                logger.error('Migration transaction failed', transaction.error || new Error('Unknown transaction error'), {
                  component: 'PhotoStorage',
                  action: 'migrateFromLocalStorage',
                });
                reject(transaction.error);
              };
            });
          }
        } catch (error) {
          logger.error('Error parsing photos from localStorage', error instanceof Error ? error : new Error(String(error)), {
            component: 'PhotoStorage',
            action: 'migrateFromLocalStorage',
          });
        }
      }

      // Update version
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
    } catch (error) {
      logger.error('Error during migration', error instanceof Error ? error : new Error(String(error)), {
        component: 'PhotoStorage',
        action: 'migrateData',
      });
    }
  }
}
