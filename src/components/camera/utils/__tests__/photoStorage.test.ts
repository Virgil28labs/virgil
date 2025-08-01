/**
 * PhotoStorage Test Suite
 * 
 * Tests IndexedDB-based photo storage functionality including:
 * - Database initialization and migration
 * - Photo CRUD operations (Create, Read, Update, Delete)
 * - Favorite management
 * - Storage quota and cleanup
 * - Import/Export functionality
 * - LocalStorage migration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PhotoStorage } from '../photoStorage';
import { CameraUtils } from '../cameraUtils';
import { logger } from '../../../../lib/logger';
import { timeService } from '../../../../services/TimeService';
import type { SavedPhoto } from '../../../../types/camera.types';

// Mock dependencies
jest.mock('../cameraUtils', () => ({
  CameraUtils: {
    generatePhotoId: jest.fn(),
    calculateDataUrlSize: jest.fn(),
    getImageDimensions: jest.fn(),
  },
}));

jest.mock('../../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));

const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock IndexedDB
class MockIDBDatabase {
  objectStoreNames = {
    contains: jest.fn().mockReturnValue(true),
  };
  transaction = jest.fn();
  close = jest.fn();
}

class MockIDBTransaction {
  objectStore = jest.fn();
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: Error | null = null;

  complete() {
    if (this.oncomplete) this.oncomplete();
  }

  fail(error: Error) {
    this.error = error;
    if (this.onerror) this.onerror();
  }
}

class MockIDBObjectStore {
  add = jest.fn();
  put = jest.fn();
  get = jest.fn();
  getAll = jest.fn();
  delete = jest.fn();
  clear = jest.fn();
  createIndex = jest.fn();
}

class MockIDBRequest<T = any> {
  result: T | null = null;
  error: Error | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;

  success(result: T) {
    this.result = result;
    if (this.onsuccess) this.onsuccess();
  }

  fail(error: Error) {
    this.error = error;
    if (this.onerror) this.onerror();
  }
}

describe('PhotoStorage', () => {
  let mockDB: MockIDBDatabase;
  let mockTransaction: MockIDBTransaction;
  let mockObjectStore: MockIDBObjectStore;
  let mockOpenRequest: MockIDBRequest<IDBDatabase>;

  const mockPhoto: SavedPhoto = {
    id: 'photo-1',
    dataUrl: 'data:image/jpeg;base64,mock',
    timestamp: 1640995200000,
    isFavorite: false,
    name: 'Test Photo',
    size: 1024,
    width: 1920,
    height: 1080,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset PhotoStorage state
    (PhotoStorage as any).db = null;
    (PhotoStorage as any).initPromise = null;

    // Setup mocks
    mockCameraUtils.generatePhotoId.mockReturnValue('photo-123');
    mockCameraUtils.calculateDataUrlSize.mockReturnValue(1024);
    mockCameraUtils.getImageDimensions.mockResolvedValue({ width: 1920, height: 1080 });
    mockTimeService.getTimestamp.mockReturnValue(Date.now());

    // Setup IndexedDB mocks
    mockDB = new MockIDBDatabase();
    mockTransaction = new MockIDBTransaction();
    mockObjectStore = new MockIDBObjectStore();
    mockOpenRequest = new MockIDBRequest<IDBDatabase>();

    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);

    // Mock indexedDB.open
    global.indexedDB = {
      open: jest.fn(() => mockOpenRequest),
      deleteDatabase: jest.fn(),
    } as any;

    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      const initPromise = PhotoStorage.initialize();
      
      // Simulate successful DB open
      mockOpenRequest.success(mockDB as any);
      
      await initPromise;
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('VirgilCameraDB', 1);
      expect((PhotoStorage as any).db).toBe(mockDB);
    });

    it('should handle database initialization errors', async () => {
      const initPromise = PhotoStorage.initialize();
      
      // Simulate DB open error
      mockOpenRequest.fail(new Error('Database error'));
      
      await initPromise;
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error initializing photo storage',
        expect.any(Error),
        expect.objectContaining({
          component: 'PhotoStorage',
          action: 'initDB',
        }),
      );
    });

    it('should create object store on upgrade', async () => {
      const upgradeRequest = new MockIDBRequest<IDBDatabase>();
      (global.indexedDB.open as jest.Mock).mockReturnValue(upgradeRequest);
      
      const initPromise = PhotoStorage.initialize();
      
      // Simulate upgrade needed
      const mockUpgradeDB = {
        objectStoreNames: {
          contains: jest.fn().mockReturnValue(false),
        },
        createObjectStore: jest.fn().mockReturnValue(mockObjectStore),
      };
      
      (upgradeRequest as any).onupgradeneeded({ target: { result: mockUpgradeDB } });
      upgradeRequest.success(mockDB as any);
      
      await initPromise;
      
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('photos', { keyPath: 'id' });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp', { unique: false });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('isFavorite', 'isFavorite', { unique: false });
    });

    it('should migrate data from localStorage if needed', async () => {
      const oldPhotos = [mockPhoto];
      (global.localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'virgil_camera_photos') return JSON.stringify(oldPhotos);
        if (key === 'virgil_camera_version') return null;
        return null;
      });

      const addRequest = new MockIDBRequest();
      mockObjectStore.add.mockReturnValue(addRequest);

      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      
      await initPromise;
      
      // Simulate successful add
      addRequest.success(undefined);
      mockTransaction.complete();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Migrating 1 photos'),
        expect.any(Object),
      );
    });
  });

  describe('savePhoto', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should save a photo successfully', async () => {
      const photoToSave = {
        dataUrl: 'data:image/jpeg;base64,test',
        timestamp: Date.now(),
        isFavorite: false,
        name: 'New Photo',
      };

      const addRequest = new MockIDBRequest();
      mockObjectStore.add.mockReturnValue(addRequest);

      const savePromise = PhotoStorage.savePhoto(photoToSave);
      
      // Simulate successful add
      addRequest.success(undefined);
      
      const savedPhoto = await savePromise;
      
      expect(savedPhoto).toMatchObject({
        id: 'photo-123',
        ...photoToSave,
        size: 1024,
        width: 1920,
        height: 1080,
      });
      expect(mockObjectStore.add).toHaveBeenCalledWith(savedPhoto);
    });

    it('should handle save errors', async () => {
      const photoToSave = {
        dataUrl: 'data:image/jpeg;base64,test',
        timestamp: Date.now(),
        isFavorite: false,
      };

      const addRequest = new MockIDBRequest();
      mockObjectStore.add.mockReturnValue(addRequest);

      const savePromise = PhotoStorage.savePhoto(photoToSave);
      
      // Simulate add error
      addRequest.fail(new Error('Add failed'));
      
      await expect(savePromise).rejects.toThrow('Failed to save photo');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should check storage quota before saving', async () => {
      // Mock storage info to indicate almost full
      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);
      
      // Create many photos to simulate full storage
      const manyPhotos = Array(100).fill(null).map((_, i) => ({
        ...mockPhoto,
        id: `photo-${i}`,
        size: 500 * 1024, // 500KB each
      }));

      const photoToSave = {
        dataUrl: 'data:image/jpeg;base64,test',
        timestamp: Date.now(),
        isFavorite: false,
      };

      const savePromise = PhotoStorage.savePhoto(photoToSave);
      
      // Simulate getAll for storage check
      getAllRequest.success(manyPhotos);
      
      await expect(savePromise).rejects.toThrow('Storage is almost full');
    });
  });

  describe('getAllPhotos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should retrieve all photos sorted by timestamp', async () => {
      const photos = [
        { ...mockPhoto, id: 'photo-1', timestamp: 1000 },
        { ...mockPhoto, id: 'photo-2', timestamp: 3000 },
        { ...mockPhoto, id: 'photo-3', timestamp: 2000 },
      ];

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const getPromise = PhotoStorage.getAllPhotos();
      
      // Simulate successful getAll
      getAllRequest.success(photos);
      
      const result = await getPromise;
      
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('photo-2'); // Most recent first
      expect(result[1].id).toBe('photo-3');
      expect(result[2].id).toBe('photo-1');
    });

    it('should return empty array on error', async () => {
      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const getPromise = PhotoStorage.getAllPhotos();
      
      // Simulate getAll error
      getAllRequest.fail(new Error('Get failed'));
      
      const result = await getPromise;
      
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getFavoritePhotos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should return only favorite photos', async () => {
      const photos = [
        { ...mockPhoto, id: 'photo-1', isFavorite: true },
        { ...mockPhoto, id: 'photo-2', isFavorite: false },
        { ...mockPhoto, id: 'photo-3', isFavorite: true },
      ];

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const getPromise = PhotoStorage.getFavoritePhotos();
      
      getAllRequest.success(photos);
      
      const result = await getPromise;
      
      expect(result).toHaveLength(2);
      expect(result.every(p => p.isFavorite)).toBe(true);
    });
  });

  describe('updatePhoto', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should update photo successfully', async () => {
      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);
      
      const putRequest = new MockIDBRequest();
      mockObjectStore.put.mockReturnValue(putRequest);

      const updatePromise = PhotoStorage.updatePhoto('photo-1', { name: 'Updated Name' });
      
      // Simulate finding the photo
      getAllRequest.success([mockPhoto]);
      
      // Wait for next tick to allow getPhotoById to complete
      await new Promise(resolve => setImmediate(resolve));
      
      // Simulate successful put
      putRequest.success(undefined);
      
      const result = await updatePromise;
      
      expect(result).toMatchObject({
        ...mockPhoto,
        name: 'Updated Name',
      });
      expect(mockObjectStore.put).toHaveBeenCalledWith(result);
    });

    it('should return null if photo not found', async () => {
      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const updatePromise = PhotoStorage.updatePhoto('nonexistent', { name: 'Updated' });
      
      getAllRequest.success([]);
      
      const result = await updatePromise;
      
      expect(result).toBeNull();
    });
  });

  describe('deletePhoto', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should delete photo successfully', async () => {
      const deleteRequest = new MockIDBRequest();
      mockObjectStore.delete.mockReturnValue(deleteRequest);

      const deletePromise = PhotoStorage.deletePhoto('photo-1');
      
      deleteRequest.success(undefined);
      
      const result = await deletePromise;
      
      expect(result).toBe(true);
      expect(mockObjectStore.delete).toHaveBeenCalledWith('photo-1');
    });

    it('should return false on delete error', async () => {
      const deleteRequest = new MockIDBRequest();
      mockObjectStore.delete.mockReturnValue(deleteRequest);

      const deletePromise = PhotoStorage.deletePhoto('photo-1');
      
      deleteRequest.fail(new Error('Delete failed'));
      
      const result = await deletePromise;
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deletePhotos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should delete multiple photos', async () => {
      const ids = ['photo-1', 'photo-2', 'photo-3'];
      const deleteRequests = ids.map(() => new MockIDBRequest());
      
      mockObjectStore.delete.mockImplementation(() => {
        const index = mockObjectStore.delete.mock.calls.length - 1;
        return deleteRequests[index];
      });

      const deletePromise = PhotoStorage.deletePhotos(ids);
      
      // Simulate successful deletes
      deleteRequests.forEach(req => req.success(undefined));
      mockTransaction.complete();
      
      const result = await deletePromise;
      
      expect(result).toBe(3);
      expect(mockObjectStore.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('toggleFavorite', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should toggle favorite status', async () => {
      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);
      
      const putRequest = new MockIDBRequest();
      mockObjectStore.put.mockReturnValue(putRequest);

      const togglePromise = PhotoStorage.toggleFavorite('photo-1');
      
      // Simulate finding the photo
      getAllRequest.success([{ ...mockPhoto, isFavorite: false }]);
      
      // Wait for getPhotoById to complete
      await new Promise(resolve => setImmediate(resolve));
      
      // Simulate successful put
      putRequest.success(undefined);
      
      const result = await togglePromise;
      
      expect(result).toBe(true);
    });
  });

  describe('getStorageInfo', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should calculate storage info correctly', async () => {
      const photos = [
        { ...mockPhoto, id: 'photo-1', size: 1024, isFavorite: true },
        { ...mockPhoto, id: 'photo-2', size: 2048, isFavorite: false },
        { ...mockPhoto, id: 'photo-3', size: 3072, isFavorite: true },
      ];

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const infoPromise = PhotoStorage.getStorageInfo();
      
      getAllRequest.success(photos);
      
      const result = await infoPromise;
      
      expect(result).toEqual({
        totalPhotos: 3,
        totalSize: 6144,
        maxSize: 50 * 1024 * 1024,
        usedPercentage: expect.any(Number),
        favoriteCount: 2,
      });
    });
  });

  describe('clearAllPhotos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should clear all photos', async () => {
      const clearRequest = new MockIDBRequest();
      mockObjectStore.clear.mockReturnValue(clearRequest);

      const clearPromise = PhotoStorage.clearAllPhotos();
      
      clearRequest.success(undefined);
      
      await clearPromise;
      
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
  });

  describe('exportPhotos', () => {
    it('should export photos as JSON', async () => {
      const photos = [mockPhoto];
      const timestamp = Date.now();
      mockTimeService.getTimestamp.mockReturnValue(timestamp);

      const result = await PhotoStorage.exportPhotos(photos);
      const parsed = JSON.parse(result);
      
      expect(parsed).toMatchObject({
        version: '2.0.0',
        timestamp,
        photos,
        totalPhotos: 1,
        totalSize: 1024,
      });
    });
  });

  describe('importPhotos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should import new photos', async () => {
      const importData = {
        version: '2.0.0',
        photos: [
          { ...mockPhoto, id: 'import-1' },
          { ...mockPhoto, id: 'import-2' },
        ],
      };

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);
      
      const addRequests = [new MockIDBRequest(), new MockIDBRequest()];
      let addIndex = 0;
      mockObjectStore.add.mockImplementation(() => addRequests[addIndex++]);

      const importPromise = PhotoStorage.importPhotos(JSON.stringify(importData));
      
      // No existing photos
      getAllRequest.success([]);
      
      // Simulate successful adds
      addRequests.forEach(req => req.success(undefined));
      mockTransaction.complete();
      
      const result = await importPromise;
      
      expect(result).toBe(2);
    });

    it('should skip duplicate photos', async () => {
      const importData = {
        version: '2.0.0',
        photos: [mockPhoto], // Same ID as existing
      };

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const importPromise = PhotoStorage.importPhotos(JSON.stringify(importData));
      
      // Existing photo with same ID
      getAllRequest.success([mockPhoto]);
      
      const result = await importPromise;
      
      expect(result).toBe(0);
      expect(mockObjectStore.add).not.toHaveBeenCalled();
    });

    it('should handle invalid import data', async () => {
      await expect(PhotoStorage.importPhotos('invalid json'))
        .rejects.toThrow('Failed to import photos');
      
      await expect(PhotoStorage.importPhotos('{}'))
        .rejects.toThrow('Failed to import photos');
    });
  });

  describe('storage options', () => {
    it('should get default storage options', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const options = PhotoStorage.getStorageOptions();
      
      expect(options).toEqual({
        maxStorage: 50,
        compressionQuality: 0.8,
        autoCleanup: true,
        cleanupAfterDays: 30,
      });
    });

    it('should save storage options', () => {
      PhotoStorage.saveStorageOptions({ maxStorage: 100 });
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'virgil_camera_settings',
        expect.stringContaining('"maxStorage":100'),
      );
    });
  });

  describe('cleanup old photos', () => {
    beforeEach(async () => {
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      await initPromise;
    });

    it('should delete old non-favorite photos during cleanup', async () => {
      const now = Date.now();
      const oldTime = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      
      const photos = [
        { ...mockPhoto, id: 'old-1', timestamp: oldTime, isFavorite: false },
        { ...mockPhoto, id: 'old-2', timestamp: oldTime, isFavorite: true },
        { ...mockPhoto, id: 'new-1', timestamp: now, isFavorite: false },
      ];

      const getAllRequest = new MockIDBRequest();
      mockObjectStore.getAll.mockReturnValue(getAllRequest);
      
      // Mock for cleanup
      jest.spyOn(PhotoStorage as any, 'deletePhotos').mockResolvedValue(1);
      mockTimeService.getTimestamp.mockReturnValue(now);

      // Trigger cleanup through initialize
      const initPromise = PhotoStorage.initialize();
      mockOpenRequest.success(mockDB as any);
      
      // Simulate finding photos for cleanup
      getAllRequest.success(photos);
      
      await initPromise;
      
      expect((PhotoStorage as any).deletePhotos).toHaveBeenCalledWith(['old-1']);
    });
  });
});