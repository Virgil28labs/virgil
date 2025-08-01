/**
 * usePhotos Hook Test Suite
 * 
 * Tests photo storage operations, CRUD operations, favorites management,
 * search and sort functionality, and error handling.
 */

import { renderHook, act } from '@testing-library/react';
import { usePhotos } from '../usePhotos';
import { PhotoStorage } from '../../utils/photoStorage';
import { CameraUtils } from '../../utils/cameraUtils';
import { timeService } from '../../../../services/TimeService';
import type { SavedPhoto } from '../../../../types/camera.types';

// Mock dependencies
jest.mock('../../utils/photoStorage', () => ({
  PhotoStorage: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllPhotos: jest.fn(),
    getFavoritePhotos: jest.fn(),
    savePhoto: jest.fn(),
    deletePhoto: jest.fn(),
    deletePhotos: jest.fn(),
    toggleFavorite: jest.fn(),
    getPhotoById: jest.fn(),
    searchPhotos: jest.fn(),
    clearStorage: jest.fn(),
    updatePhoto: jest.fn(),
    getStorageInfo: jest.fn(),
    clearAllPhotos: jest.fn(),
  },
}));

jest.mock('../../utils/cameraUtils', () => ({
  CameraUtils: {
    generatePhotoId: jest.fn(),
    compressImage: jest.fn(),
    getImageDimensions: jest.fn(),
    calculateDataUrlSize: jest.fn(),
    generatePhotoName: jest.fn().mockReturnValue('photo-name.jpg'),
    downloadPhoto: jest.fn().mockResolvedValue(undefined),
    sharePhoto: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    fromTimestamp: jest.fn(),
    getTimeAgo: jest.fn(),
  },
}));

const mockPhotoStorage = PhotoStorage as jest.Mocked<typeof PhotoStorage>;
const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock photo data
const mockPhoto1: SavedPhoto = {
  id: 'photo-1',
  dataUrl: 'data:image/jpeg;base64,photo1',
  timestamp: 1640995200000, // 2022-01-01
  isFavorite: false,
  name: 'Photo 1',
  size: 1024,
  width: 800,
  height: 600,
};

const mockPhoto2: SavedPhoto = {
  id: 'photo-2',
  dataUrl: 'data:image/jpeg;base64,photo2',
  timestamp: 1641081600000, // 2022-01-02
  isFavorite: true,
  name: 'Photo 2',
  size: 2048,
  width: 1200,
  height: 900,
};

const mockPhotos = [mockPhoto1, mockPhoto2];
const mockFavorites = [mockPhoto2];

describe('usePhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockPhotoStorage.getAllPhotos.mockResolvedValue(mockPhotos);
    mockPhotoStorage.getFavoritePhotos.mockResolvedValue(mockFavorites);
    mockTimeService.getTimestamp.mockReturnValue(Date.now());
    mockCameraUtils.generatePhotoId.mockReturnValue('new-photo-id');
    mockCameraUtils.compressImage.mockResolvedValue('compressed-data-url');
    mockCameraUtils.getImageDimensions.mockResolvedValue({ width: 1024, height: 768 });
    mockCameraUtils.calculateDataUrlSize.mockReturnValue(1500);
  });

  describe('initial state', () => {
    it('should have correct initial state', async () => {
      // Mock to prevent automatic loading on mount
      mockPhotoStorage.getAllPhotos.mockImplementation(() => new Promise(() => {}));
      mockPhotoStorage.getFavoritePhotos.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePhotos());

      expect(result.current.photos).toEqual([]);
      expect(result.current.favorites).toEqual([]);
      expect(result.current.loading).toBe(true); // Loading starts on mount
      expect(result.current.error).toBeNull();
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => usePhotos());

      expect(result.current).toHaveProperty('photos');
      expect(result.current).toHaveProperty('favorites');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('loadPhotos');
      expect(result.current).toHaveProperty('savePhoto');
      expect(result.current).toHaveProperty('deletePhoto');
      expect(result.current).toHaveProperty('deletePhotos');
      expect(result.current).toHaveProperty('toggleFavorite');
      expect(result.current).toHaveProperty('getPhotoById');
      expect(result.current).toHaveProperty('searchPhotos');
      expect(result.current).toHaveProperty('sortPhotos');
      expect(result.current).toHaveProperty('clearError');
      expect(result.current).toHaveProperty('updatePhoto');
      expect(result.current).toHaveProperty('getStorageInfo');
      expect(result.current).toHaveProperty('clearAllPhotos');
      expect(result.current).toHaveProperty('downloadPhoto');
      expect(result.current).toHaveProperty('sharePhoto');
    });
  });

  describe('loadPhotos', () => {
    it('should load photos successfully', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      expect(mockPhotoStorage.getAllPhotos).toHaveBeenCalled();
      expect(mockPhotoStorage.getFavoritePhotos).toHaveBeenCalled();
      expect(result.current.photos).toEqual(mockPhotos);
      expect(result.current.favorites).toEqual(mockFavorites);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during load', async () => {
      const { result } = renderHook(() => usePhotos());

      // Mock delayed response
      mockPhotoStorage.getAllPhotos.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockPhotos), 100)),
      );

      // Start loading
      const loadPromise = act(async () => {
        result.current.loadPhotos();
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      await loadPromise;

      expect(result.current.loading).toBe(false);
    });

    it('should handle load errors', async () => {
      const errorMessage = 'Failed to load photos';
      mockPhotoStorage.getAllPhotos.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(result.current.photos).toEqual([]);
      expect(result.current.favorites).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      mockPhotoStorage.getAllPhotos.mockRejectedValue('String error');

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      expect(result.current.error).toBe('Failed to load photos');
    });
  });

  describe('savePhoto', () => {
    const mockSavedPhoto: SavedPhoto = {
      id: 'new-photo',
      dataUrl: 'data:image/jpeg;base64,newphoto',
      timestamp: 1641168000000,
      isFavorite: false,
      name: 'New Photo',
      size: 1500,
      width: 1024,
      height: 768,
    };

    it('should save photo successfully', async () => {
      mockPhotoStorage.savePhoto.mockResolvedValue(mockSavedPhoto);

      const { result } = renderHook(() => usePhotos());

      // Wait for initial load to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let savedPhoto: SavedPhoto | null = null;
      await act(async () => {
        savedPhoto = await result.current.savePhoto('data:image/jpeg;base64,test', 'Test Photo');
      });

      expect(mockPhotoStorage.savePhoto).toHaveBeenCalledWith({
        dataUrl: 'data:image/jpeg;base64,test',
        timestamp: expect.any(Number),
        isFavorite: false,
        name: 'Test Photo',
      });
      expect(savedPhoto).toEqual(mockSavedPhoto);
      expect(result.current.photos).toEqual([mockSavedPhoto, ...mockPhotos]);
    });

    it('should save photo without name', async () => {
      mockPhotoStorage.savePhoto.mockResolvedValue(mockSavedPhoto);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.savePhoto('data:image/jpeg;base64,test');
      });

      expect(mockPhotoStorage.savePhoto).toHaveBeenCalledWith({
        dataUrl: 'data:image/jpeg;base64,test',
        timestamp: expect.any(Number),
        isFavorite: false,
        name: undefined,
      });
    });

    it('should handle save errors', async () => {
      mockPhotoStorage.savePhoto.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => usePhotos());

      // Wait for initial load to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let savedPhoto: SavedPhoto | null = null;
      await act(async () => {
        savedPhoto = await result.current.savePhoto('data:image/jpeg;base64,test');
      });

      expect(savedPhoto).toBeNull();
      expect(result.current.error).toBe('Save failed');
      expect(result.current.photos).toEqual(mockPhotos); // Photos from initial load
    });

    it('should clear error on successful save', async () => {
      mockPhotoStorage.savePhoto.mockResolvedValue(mockSavedPhoto);

      const { result } = renderHook(() => usePhotos());

      // Set initial error
      act(() => {
        result.current.error = 'Previous error';
      });

      await act(async () => {
        await result.current.savePhoto('data:image/jpeg;base64,test');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      mockPhotoStorage.deletePhoto.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotos());

      // Load initial photos
      await act(async () => {
        await result.current.loadPhotos();
      });

      let deleteResult = false;
      await act(async () => {
        deleteResult = await result.current.deletePhoto('photo-1');
      });

      expect(mockPhotoStorage.deletePhoto).toHaveBeenCalledWith('photo-1');
      expect(deleteResult).toBe(true);
      expect(result.current.photos).toEqual([mockPhoto2]);
      expect(result.current.favorites).toEqual([mockPhoto2]); // photo-1 wasn't a favorite
    });

    it('should remove favorite when deleting favorite photo', async () => {
      mockPhotoStorage.deletePhoto.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotos());

      // Load initial photos
      await act(async () => {
        await result.current.loadPhotos();
      });

      await act(async () => {
        await result.current.deletePhoto('photo-2'); // This is a favorite
      });

      expect(result.current.photos).toEqual([mockPhoto1]);
      expect(result.current.favorites).toEqual([]);
    });

    it('should handle delete errors', async () => {
      mockPhotoStorage.deletePhoto.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let deleteResult = false;
      await act(async () => {
        deleteResult = await result.current.deletePhoto('photo-1');
      });

      expect(deleteResult).toBe(false);
      expect(result.current.error).toBe('Delete failed');
      expect(result.current.photos).toEqual(mockPhotos); // Should remain unchanged
    });

    it('should handle photo not found during delete', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      await act(async () => {
        await result.current.deletePhoto('non-existent');
      });

      expect(result.current.photos).toEqual(mockPhotos); // Should remain unchanged
    });
  });

  describe('deletePhotos (bulk delete)', () => {
    it('should delete multiple photos successfully', async () => {
      mockPhotoStorage.deletePhotos.mockResolvedValue(2);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let deletedCount = 0;
      await act(async () => {
        deletedCount = await result.current.deletePhotos(['photo-1', 'photo-2']);
      });

      expect(mockPhotoStorage.deletePhotos).toHaveBeenCalledWith(['photo-1', 'photo-2']);
      expect(deletedCount).toBe(2);
      expect(result.current.photos).toEqual([]);
      expect(result.current.favorites).toEqual([]);
    });

    it('should handle partial deletion', async () => {
      mockPhotoStorage.deletePhotos.mockResolvedValue(1);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let deletedCount = 0;
      await act(async () => {
        deletedCount = await result.current.deletePhotos(['photo-1', 'non-existent']);
      });

      expect(deletedCount).toBe(1);
      expect(result.current.photos).toEqual([mockPhoto2]);
    });

    it('should handle bulk delete errors', async () => {
      mockPhotoStorage.deletePhotos.mockRejectedValue(new Error('Bulk delete failed'));

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let deletedCount = 0;
      await act(async () => {
        deletedCount = await result.current.deletePhotos(['photo-1', 'photo-2']);
      });

      expect(deletedCount).toBe(0);
      expect(result.current.error).toBe('Bulk delete failed');
      expect(result.current.photos).toEqual(mockPhotos); // Should remain unchanged
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite successfully', async () => {
      mockPhotoStorage.toggleFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let toggleResult = false;
      await act(async () => {
        toggleResult = await result.current.toggleFavorite('photo-1');
      });

      expect(mockPhotoStorage.toggleFavorite).toHaveBeenCalledWith('photo-1');
      expect(toggleResult).toBe(true);
      
      // Should update the photo in state
      const updatedPhoto1 = { ...mockPhoto1, isFavorite: true };
      expect(result.current.photos).toEqual([updatedPhoto1, mockPhoto2]);
      expect(result.current.favorites).toEqual([updatedPhoto1, mockPhoto2]);
    });

    it('should toggle favorite off', async () => {
      mockPhotoStorage.toggleFavorite.mockResolvedValue(false); // Returns false when unfavoriting

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      await act(async () => {
        await result.current.toggleFavorite('photo-2'); // This is already a favorite
      });

      const updatedPhoto2 = { ...mockPhoto2, isFavorite: false };
      expect(result.current.photos).toEqual([mockPhoto1, updatedPhoto2]);
      expect(result.current.favorites).toEqual([]);
    });

    it('should handle toggle favorite errors', async () => {
      mockPhotoStorage.toggleFavorite.mockRejectedValue(new Error('Toggle failed'));

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let toggleResult = false;
      await act(async () => {
        toggleResult = await result.current.toggleFavorite('photo-1');
      });

      expect(toggleResult).toBe(false);
      expect(result.current.error).toBe('Toggle failed');
      expect(result.current.photos).toEqual(mockPhotos); // Should remain unchanged
    });

    it('should handle photo not found during toggle', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      await act(async () => {
        await result.current.toggleFavorite('non-existent');
      });

      expect(result.current.photos).toEqual(mockPhotos); // Should remain unchanged
    });
  });

  describe('getPhotoById', () => {
    it('should return photo by id', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const photo = result.current.getPhotoById('photo-1');
      expect(photo).toEqual(mockPhoto1);
    });

    it('should return null for non-existent photo', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const photo = result.current.getPhotoById('non-existent');
      expect(photo).toBeNull();
    });
  });

  describe('searchPhotos', () => {
    it('should search photos by name', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const searchResult = result.current.searchPhotos('Photo 1');
      expect(searchResult).toEqual([mockPhoto1]);
    });

    it('should return all photos for empty query', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const searchResult = result.current.searchPhotos('');
      expect(searchResult).toEqual(mockPhotos);
    });

    it('should return empty array when no matches', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const searchResult = result.current.searchPhotos('NonExistent');
      expect(searchResult).toEqual([]);
    });

    it('should search photos by tags', async () => {
      const photoWithTags = { ...mockPhoto1, tags: ['vacation', 'beach'] };
      mockPhotoStorage.getAllPhotos.mockResolvedValue([photoWithTags, mockPhoto2]);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const searchResult = result.current.searchPhotos('beach');
      expect(searchResult).toEqual([photoWithTags]);
    });
  });

  describe('sortPhotos', () => {
    it('should sort photos by date descending', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const sorted = result.current.sortPhotos(mockPhotos, 'date', 'desc');
      expect(sorted[0]).toEqual(mockPhoto2); // More recent photo first
      expect(sorted[1]).toEqual(mockPhoto1);
    });

    it('should sort photos by date ascending', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const sorted = result.current.sortPhotos(mockPhotos, 'date', 'asc');
      expect(sorted[0]).toEqual(mockPhoto1); // Older photo first
      expect(sorted[1]).toEqual(mockPhoto2);
    });

    it('should sort photos by name', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const sorted = result.current.sortPhotos(mockPhotos, 'name', 'asc');
      expect(sorted[0]).toEqual(mockPhoto1); // "Photo 1" comes before "Photo 2"
      expect(sorted[1]).toEqual(mockPhoto2);
    });

    it('should sort photos by size', async () => {
      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      const sorted = result.current.sortPhotos(mockPhotos, 'size', 'desc');
      expect(sorted[0]).toEqual(mockPhoto2); // Larger file first
      expect(sorted[1]).toEqual(mockPhoto1);
    });

    it('should handle sorting without size', async () => {
      const photosWithoutSize = [
        { ...mockPhoto1, size: undefined },
        { ...mockPhoto2, size: undefined },
      ];

      const { result } = renderHook(() => usePhotos());

      const sorted = result.current.sortPhotos(photosWithoutSize, 'size', 'desc');
      expect(sorted).toEqual(photosWithoutSize); // Should maintain original order
    });

    it('should handle sorting without name', async () => {
      const photosWithoutName = [
        { ...mockPhoto1, name: undefined },
        { ...mockPhoto2, name: undefined },
      ];

      const { result } = renderHook(() => usePhotos());

      const sorted = result.current.sortPhotos(photosWithoutName, 'name', 'asc');
      expect(sorted).toEqual(photosWithoutName); // Should maintain original order
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => usePhotos());

      // Set error first
      await act(async () => {
        mockPhotoStorage.getAllPhotos.mockRejectedValue(new Error('Test error'));
        await result.current.loadPhotos();
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('initialization', () => {
    it('should load photos on mount', async () => {
      const { result } = renderHook(() => usePhotos());

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockPhotoStorage.getAllPhotos).toHaveBeenCalled();
      expect(mockPhotoStorage.getFavoritePhotos).toHaveBeenCalled();
      expect(result.current.photos).toEqual(mockPhotos);
      expect(result.current.favorites).toEqual(mockFavorites);
    });

    it('should initialize PhotoStorage on mount', async () => {
      renderHook(() => usePhotos());

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockPhotoStorage.initialize).toHaveBeenCalled();
    });
  });

  describe('updatePhoto', () => {
    it('should update photo successfully', async () => {
      const updatedPhoto = { ...mockPhoto1, name: 'Updated Photo 1' };
      mockPhotoStorage.updatePhoto.mockResolvedValue(updatedPhoto);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let updateResult: SavedPhoto | null = null;
      await act(async () => {
        updateResult = await result.current.updatePhoto('photo-1', { name: 'Updated Photo 1' });
      });

      expect(mockPhotoStorage.updatePhoto).toHaveBeenCalledWith('photo-1', { name: 'Updated Photo 1' });
      expect(updateResult).toEqual(updatedPhoto);
      expect(result.current.photos).toContainEqual(updatedPhoto);
    });

    it('should update favorite photo in favorites list', async () => {
      const updatedPhoto = { ...mockPhoto2, name: 'Updated Photo 2' };
      mockPhotoStorage.updatePhoto.mockResolvedValue(updatedPhoto);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      await act(async () => {
        await result.current.updatePhoto('photo-2', { name: 'Updated Photo 2' });
      });

      expect(result.current.favorites).toContainEqual(updatedPhoto);
    });

    it('should handle update errors', async () => {
      mockPhotoStorage.updatePhoto.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let updateResult: SavedPhoto | null = null;
      await act(async () => {
        updateResult = await result.current.updatePhoto('photo-1', { name: 'Updated' });
      });

      expect(updateResult).toBeNull();
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('getStorageInfo', () => {
    it('should get storage info successfully', async () => {
      const storageInfo = {
        totalPhotos: 2,
        totalSize: 3072,
        maxSize: 52428800,
        usedPercentage: 0.01,
        favoriteCount: 1,
      };
      mockPhotoStorage.getStorageInfo.mockResolvedValue(storageInfo);

      const { result } = renderHook(() => usePhotos());

      let info: any = null;
      await act(async () => {
        info = await result.current.getStorageInfo();
      });

      expect(mockPhotoStorage.getStorageInfo).toHaveBeenCalled();
      expect(info).toEqual(storageInfo);
    });

    it('should handle storage info errors', async () => {
      mockPhotoStorage.getStorageInfo.mockRejectedValue(new Error('Storage info failed'));

      const { result } = renderHook(() => usePhotos());

      let info: any = null;
      await act(async () => {
        info = await result.current.getStorageInfo();
      });

      expect(info).toBeNull();
      expect(result.current.error).toBe('Storage info failed');
    });
  });

  describe('clearAllPhotos', () => {
    it('should clear all photos successfully', async () => {
      mockPhotoStorage.clearAllPhotos.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let clearResult = false;
      await act(async () => {
        clearResult = await result.current.clearAllPhotos();
      });

      expect(mockPhotoStorage.clearAllPhotos).toHaveBeenCalled();
      expect(clearResult).toBe(true);
      expect(result.current.photos).toEqual([]);
      expect(result.current.favorites).toEqual([]);
    });

    it('should handle clear all errors', async () => {
      mockPhotoStorage.clearAllPhotos.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => usePhotos());

      let clearResult = false;
      await act(async () => {
        clearResult = await result.current.clearAllPhotos();
      });

      expect(clearResult).toBe(false);
      expect(result.current.error).toBe('Clear failed');
    });
  });

  describe('downloadPhoto', () => {
    it('should download photo successfully', async () => {
      mockCameraUtils.downloadPhoto.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let downloadResult = false;
      await act(async () => {
        downloadResult = await result.current.downloadPhoto(mockPhoto1);
      });

      expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(mockPhoto1.dataUrl, 'Photo 1');
      expect(downloadResult).toBe(true);
    });

    it('should use generated name if photo has no name', async () => {
      mockCameraUtils.downloadPhoto.mockResolvedValue(undefined);
      mockCameraUtils.generatePhotoName.mockReturnValue('generated-name.jpg');

      const { result } = renderHook(() => usePhotos());

      const photoWithoutName = { ...mockPhoto1, name: undefined };

      await act(async () => {
        await result.current.downloadPhoto(photoWithoutName);
      });

      expect(mockCameraUtils.generatePhotoName).toHaveBeenCalledWith(photoWithoutName.timestamp);
      expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(photoWithoutName.dataUrl, 'generated-name.jpg');
    });

    it('should handle download errors', async () => {
      mockCameraUtils.downloadPhoto.mockRejectedValue(new Error('Download failed'));

      const { result } = renderHook(() => usePhotos());

      let downloadResult = false;
      await act(async () => {
        downloadResult = await result.current.downloadPhoto(mockPhoto1);
      });

      expect(downloadResult).toBe(false);
      expect(result.current.error).toBe('Download failed');
    });
  });

  describe('sharePhoto', () => {
    it('should share photo successfully', async () => {
      mockCameraUtils.sharePhoto.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePhotos());

      await act(async () => {
        await result.current.loadPhotos();
      });

      let shareResult = false;
      await act(async () => {
        shareResult = await result.current.sharePhoto(mockPhoto1);
      });

      expect(mockCameraUtils.sharePhoto).toHaveBeenCalledWith(mockPhoto1.dataUrl, 'Photo 1');
      expect(shareResult).toBe(true);
    });

    it('should handle share errors', async () => {
      mockCameraUtils.sharePhoto.mockRejectedValue(new Error('Share failed'));

      const { result } = renderHook(() => usePhotos());

      let shareResult = false;
      await act(async () => {
        shareResult = await result.current.sharePhoto(mockPhoto1);
      });

      expect(shareResult).toBe(false);
      expect(result.current.error).toBe('Share failed');
    });
  });
});