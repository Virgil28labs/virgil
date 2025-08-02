/**
 * usePhotoGallery Hook Test Suite
 * 
 * Tests gallery state management, tab navigation, photo selection,
 * search/filter/sort functionality, and photo operations integration.
 */

import { renderHook, act } from '@testing-library/react';
import { usePhotoGallery } from '../usePhotoGallery';
import { usePhotos } from '../usePhotos';
import { timeService } from '../../../../services/TimeService';
import type { SavedPhoto } from '../../../../types/camera.types';

// Mock usePhotos hook
jest.mock('../usePhotos', () => ({
  usePhotos: jest.fn(),
}));

jest.mock('../../../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));

jest.mock('../../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockUsePhotos = usePhotos as jest.MockedFunction<typeof usePhotos>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock photo data
const mockPhoto1: SavedPhoto = {
  id: 'photo-1',
  dataUrl: 'data:image/jpeg;base64,photo1',
  timestamp: 1640995200000, // 2022-01-01
  isFavorite: false,
  name: 'Photo 1',
  size: 1024,
};

const mockPhoto2: SavedPhoto = {
  id: 'photo-2',
  dataUrl: 'data:image/jpeg;base64,photo2',
  timestamp: 1641081600000, // 2022-01-02
  isFavorite: true,
  name: 'Photo 2',
  size: 2048,
};

const mockPhoto3: SavedPhoto = {
  id: 'photo-3',
  dataUrl: 'data:image/jpeg;base64,photo3',
  timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago (recent)
  isFavorite: true,
  name: 'Recent Photo',
  size: 1500,
};

const mockPhotos = [mockPhoto1, mockPhoto2, mockPhoto3];
const mockFavorites = [mockPhoto2, mockPhoto3];

const mockUsePhotosReturn = {
  photos: mockPhotos,
  favorites: mockFavorites,
  loading: false,
  error: null,
  loadPhotos: jest.fn(),
  savePhoto: jest.fn(),
  deletePhoto: jest.fn(),
  deletePhotos: jest.fn(),
  toggleFavorite: jest.fn(),
  getPhotoById: jest.fn(),
  searchPhotos: jest.fn(() => []),
  sortPhotos: jest.fn(),
  clearError: jest.fn(),
  updatePhoto: jest.fn(),
  getStorageInfo: jest.fn(),
  clearAllPhotos: jest.fn(),
  downloadPhoto: jest.fn(),
  sharePhoto: jest.fn(),
};

describe('usePhotoGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockUsePhotosReturn.getPhotoById.mockImplementation(id => 
      mockPhotos.find(photo => photo.id === id) || null,
    );
    mockUsePhotosReturn.searchPhotos.mockReturnValue([mockPhoto1] as any); // Return filtered results synchronously
    mockUsePhotosReturn.sortPhotos.mockImplementation((photos) => photos);
    mockUsePhotosReturn.loadPhotos.mockResolvedValue(undefined);
    mockUsePhotosReturn.savePhoto.mockResolvedValue(mockPhoto1);
    mockUsePhotosReturn.deletePhoto.mockResolvedValue(true);
    mockUsePhotosReturn.deletePhotos.mockResolvedValue(2);
    mockUsePhotosReturn.toggleFavorite.mockResolvedValue(true);
    mockUsePhotosReturn.clearError.mockImplementation(() => {});
    
    mockUsePhotos.mockReturnValue(mockUsePhotosReturn);
    mockTimeService.getTimestamp.mockReturnValue(Date.now());
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => usePhotoGallery());

      expect(result.current.galleryState).toEqual({
        photos: mockPhotos,
        favorites: mockFavorites,
        activeTab: 'camera',
        selectedPhoto: null,
        selectedPhotos: new Set(),
        searchQuery: '',
        sortBy: 'date',
        sortOrder: 'desc',
        isSelectionMode: false,
        isLoading: false,
        filter: 'all',
      });
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => usePhotoGallery());

      expect(result.current).toHaveProperty('galleryState');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('getCurrentPhotos');
      expect(result.current).toHaveProperty('setActiveTab');
      expect(result.current).toHaveProperty('setSelectedPhoto');
      expect(result.current).toHaveProperty('togglePhotoSelection');
      expect(result.current).toHaveProperty('selectAllPhotos');
      expect(result.current).toHaveProperty('clearSelection');
      expect(result.current).toHaveProperty('setSearchQuery');
      expect(result.current).toHaveProperty('setSortBy');
      expect(result.current).toHaveProperty('setSortOrder');
      expect(result.current).toHaveProperty('setFilter');
      expect(result.current).toHaveProperty('handlePhotoCapture');
      expect(result.current).toHaveProperty('handlePhotoDelete');
      expect(result.current).toHaveProperty('handleBulkDelete');
      expect(result.current).toHaveProperty('handleFavoriteToggle');
      expect(result.current).toHaveProperty('handleBulkFavorite');
      expect(result.current).toHaveProperty('navigatePhoto');
      expect(result.current).toHaveProperty('getPhotoStats');
    });
  });

  describe('tab management', () => {
    it('should set active tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      expect(result.current.galleryState.activeTab).toBe('gallery');
      expect(result.current.galleryState.selectedPhoto).toBeNull();
      expect(result.current.galleryState.selectedPhotos).toEqual(new Set());
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });

    it('should clear selection when changing tabs', () => {
      const { result } = renderHook(() => usePhotoGallery());

      // Set some selection first
      act(() => {
        result.current.setSelectedPhoto(mockPhoto1);
        result.current.togglePhotoSelection('photo-1');
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto1);
      expect(result.current.galleryState.selectedPhotos.has('photo-1')).toBe(true);

      act(() => {
        result.current.setActiveTab('favorites');
      });

      expect(result.current.galleryState.selectedPhoto).toBeNull();
      expect(result.current.galleryState.selectedPhotos).toEqual(new Set());
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });
  });

  describe('photo selection', () => {
    it('should set selected photo', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setSelectedPhoto(mockPhoto1);
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto1);
    });

    it('should toggle photo selection', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.togglePhotoSelection('photo-1');
      });

      expect(result.current.galleryState.selectedPhotos.has('photo-1')).toBe(true);
      expect(result.current.galleryState.isSelectionMode).toBe(true);

      act(() => {
        result.current.togglePhotoSelection('photo-1');
      });

      expect(result.current.galleryState.selectedPhotos.has('photo-1')).toBe(false);
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });

    it('should select multiple photos', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.togglePhotoSelection('photo-1');
        result.current.togglePhotoSelection('photo-2');
      });

      expect(result.current.galleryState.selectedPhotos.has('photo-1')).toBe(true);
      expect(result.current.galleryState.selectedPhotos.has('photo-2')).toBe(true);
      expect(result.current.galleryState.isSelectionMode).toBe(true);
    });

    it('should select all photos in gallery tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      // Wait for state to update before selecting all
      act(() => {
        result.current.selectAllPhotos();
      });

      expect(result.current.galleryState.selectedPhotos.size).toBe(mockPhotos.length);
      expect(result.current.galleryState.isSelectionMode).toBe(true);
      mockPhotos.forEach(photo => {
        expect(result.current.galleryState.selectedPhotos.has(photo.id)).toBe(true);
      });
    });

    it('should select all photos in favorites tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('favorites');
      });

      act(() => {
        result.current.selectAllPhotos();
      });

      expect(result.current.galleryState.selectedPhotos.size).toBe(mockFavorites.length);
      mockFavorites.forEach(photo => {
        expect(result.current.galleryState.selectedPhotos.has(photo.id)).toBe(true);
      });
    });

    it('should not select photos in camera tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('camera');
        result.current.selectAllPhotos();
      });

      expect(result.current.galleryState.selectedPhotos.size).toBe(0);
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });

    it('should select all with favorites filter', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setFilter('favorites');
      });

      act(() => {
        result.current.selectAllPhotos();
      });

      // Should only select favorites
      expect(result.current.galleryState.selectedPhotos.size).toBe(mockFavorites.length);
      mockFavorites.forEach(photo => {
        expect(result.current.galleryState.selectedPhotos.has(photo.id)).toBe(true);
      });
    });

    it('should select all with recent filter', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setFilter('recent');
      });

      act(() => {
        result.current.selectAllPhotos();
      });

      // Should only select recent photos (within 24 hours)
      expect(result.current.galleryState.selectedPhotos.size).toBe(1);
      expect(result.current.galleryState.selectedPhotos.has('photo-3')).toBe(true);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => usePhotoGallery());

      // Set some selection first
      act(() => {
        result.current.togglePhotoSelection('photo-1');
        result.current.togglePhotoSelection('photo-2');
      });

      expect(result.current.galleryState.selectedPhotos.size).toBe(2);
      expect(result.current.galleryState.isSelectionMode).toBe(true);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.galleryState.selectedPhotos.size).toBe(0);
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });
  });

  describe('search and filters', () => {
    it('should set search query', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.galleryState.searchQuery).toBe('test query');
    });

    it('should set sort by', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setSortBy('name');
      });

      expect(result.current.galleryState.sortBy).toBe('name');
    });

    it('should set sort order', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.galleryState.sortOrder).toBe('asc');
    });

    it('should set filter', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setFilter('favorites');
      });

      expect(result.current.galleryState.filter).toBe('favorites');
    });
  });

  describe('getCurrentPhotos', () => {
    it('should return all photos for gallery tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(currentPhotos).toEqual(mockPhotos);
    });

    it('should return favorites for favorites tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('favorites');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(currentPhotos).toEqual(mockFavorites);
    });

    it('should return empty array for camera tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('camera');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(currentPhotos).toEqual([]);
    });

    it('should apply search filter', async () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setSearchQuery('Photo 1');
      });

      // Wait for async searchPhotos to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(mockUsePhotosReturn.searchPhotos).toHaveBeenCalledWith('Photo 1');
      // searchPhotos returns filtered results
      expect(currentPhotos).toEqual([mockPhoto1]);
    });

    it('should apply favorites filter', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setFilter('favorites');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(currentPhotos).toEqual(mockFavorites);
    });

    it('should apply recent filter', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setFilter('recent');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(currentPhotos).toEqual([mockPhoto3]); // Only recent photo
    });

    it('should apply sorting', () => {
      mockUsePhotosReturn.sortPhotos.mockReturnValue([mockPhoto2, mockPhoto1, mockPhoto3]);
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setSortBy('name');
        result.current.setSortOrder('asc');
      });

      const currentPhotos = result.current.getCurrentPhotos();
      expect(mockUsePhotosReturn.sortPhotos).toHaveBeenCalledWith(mockPhotos, 'name', 'asc');
      expect(currentPhotos).toEqual([mockPhoto2, mockPhoto1, mockPhoto3]);
    });
  });

  describe('photo operations', () => {
    it('should handle photo capture', async () => {
      mockUsePhotosReturn.savePhoto.mockResolvedValue(mockPhoto1);

      const { result } = renderHook(() => usePhotoGallery());

      let capturedPhoto: SavedPhoto | null = null;
      await act(async () => {
        capturedPhoto = await result.current.handlePhotoCapture('data:image/jpeg;base64,test', 'Test Photo');
      });

      expect(mockUsePhotosReturn.savePhoto).toHaveBeenCalledWith('data:image/jpeg;base64,test', 'Test Photo');
      expect(capturedPhoto).toBe(mockPhoto1);
      expect(result.current.galleryState.activeTab).toBe('gallery'); // Should switch to gallery
    });

    it('should handle photo capture error', async () => {
      mockUsePhotosReturn.savePhoto.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => usePhotoGallery());

      let capturedPhoto: SavedPhoto | null = null;
      await act(async () => {
        capturedPhoto = await result.current.handlePhotoCapture('data:image/jpeg;base64,test');
      });

      expect(capturedPhoto).toBeNull();
    });

    it('should handle photo delete', async () => {
      mockUsePhotosReturn.deletePhoto.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotoGallery());

      // Set selected photo first
      act(() => {
        result.current.setSelectedPhoto(mockPhoto1);
      });

      let deleteResult = false;
      await act(async () => {
        deleteResult = await result.current.handlePhotoDelete('photo-1');
      });

      expect(mockUsePhotosReturn.deletePhoto).toHaveBeenCalledWith('photo-1');
      expect(deleteResult).toBe(true);
      expect(result.current.galleryState.selectedPhoto).toBeNull(); // Should clear selected photo
    });

    it('should handle photo delete from selection', async () => {
      mockUsePhotosReturn.deletePhoto.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotoGallery());

      // Select photo first
      act(() => {
        result.current.togglePhotoSelection('photo-1');
      });

      await act(async () => {
        await result.current.handlePhotoDelete('photo-1');
      });

      expect(result.current.galleryState.selectedPhotos.has('photo-1')).toBe(false);
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });

    it('should handle bulk delete', async () => {
      mockUsePhotosReturn.deletePhotos.mockResolvedValue(2);

      const { result } = renderHook(() => usePhotoGallery());

      // Select photos first
      act(() => {
        result.current.setSelectedPhoto(mockPhoto1);
        result.current.togglePhotoSelection('photo-1');
        result.current.togglePhotoSelection('photo-2');
      });

      let deletedCount = 0;
      await act(async () => {
        deletedCount = await result.current.handleBulkDelete();
      });

      expect(mockUsePhotosReturn.deletePhotos).toHaveBeenCalledWith(['photo-1', 'photo-2']);
      expect(deletedCount).toBe(2);
      expect(result.current.galleryState.selectedPhotos.size).toBe(0);
      expect(result.current.galleryState.selectedPhoto).toBeNull();
      expect(result.current.galleryState.isSelectionMode).toBe(false);
    });

    it('should handle favorite toggle', async () => {
      mockUsePhotosReturn.toggleFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotoGallery());

      let toggleResult = false;
      await act(async () => {
        toggleResult = await result.current.handleFavoriteToggle('photo-1');
      });

      expect(mockUsePhotosReturn.toggleFavorite).toHaveBeenCalledWith('photo-1');
      expect(toggleResult).toBe(true);
    });

    it('should handle bulk favorite', async () => {
      mockUsePhotosReturn.toggleFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotoGallery());

      // Select photos first
      act(() => {
        result.current.togglePhotoSelection('photo-1'); // Not a favorite
        result.current.togglePhotoSelection('photo-2'); // Already a favorite
      });

      let favoriteCount = 0;
      await act(async () => {
        favoriteCount = await result.current.handleBulkFavorite(true);
      });

      // Should only toggle photo-1 (photo-2 is already a favorite)
      expect(mockUsePhotosReturn.toggleFavorite).toHaveBeenCalledWith('photo-1');
      expect(mockUsePhotosReturn.toggleFavorite).not.toHaveBeenCalledWith('photo-2');
      expect(favoriteCount).toBe(1);
    });

    it('should handle bulk unfavorite', async () => {
      mockUsePhotosReturn.toggleFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => usePhotoGallery());

      // Select photos first
      act(() => {
        result.current.togglePhotoSelection('photo-1'); // Not a favorite
        result.current.togglePhotoSelection('photo-2'); // Is a favorite
      });

      let unfavoriteCount = 0;
      await act(async () => {
        unfavoriteCount = await result.current.handleBulkFavorite(false);
      });

      // Should only toggle photo-2 (photo-1 is not a favorite)
      expect(mockUsePhotosReturn.toggleFavorite).toHaveBeenCalledWith('photo-2');
      expect(mockUsePhotosReturn.toggleFavorite).not.toHaveBeenCalledWith('photo-1');
      expect(unfavoriteCount).toBe(1);
    });
  });

  describe('photo navigation', () => {
    it('should navigate to next photo', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      act(() => {
        result.current.setSelectedPhoto(mockPhoto1);
      });

      act(() => {
        result.current.navigatePhoto('next');
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto2);
    });

    it('should navigate to previous photo', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      act(() => {
        result.current.setSelectedPhoto(mockPhoto2);
      });

      act(() => {
        result.current.navigatePhoto('previous');
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto1);
    });

    it('should wrap around when navigating next from last photo', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      act(() => {
        result.current.setSelectedPhoto(mockPhoto3); // Last photo
      });

      act(() => {
        result.current.navigatePhoto('next');
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto1); // Should wrap to first
    });

    it('should wrap around when navigating previous from first photo', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
      });

      act(() => {
        result.current.setSelectedPhoto(mockPhoto1); // First photo
      });

      act(() => {
        result.current.navigatePhoto('previous');
      });

      expect(result.current.galleryState.selectedPhoto).toBe(mockPhoto3); // Should wrap to last
    });

    it('should not navigate if no photo selected', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.navigatePhoto('next');
      });

      expect(result.current.galleryState.selectedPhoto).toBeNull();
    });

    it('should not navigate if selected photo not found', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.setSelectedPhoto({ ...mockPhoto1, id: 'non-existent' });
        result.current.navigatePhoto('next');
      });

      expect(result.current.galleryState.selectedPhoto?.id).toBe('non-existent');
    });
  });

  describe('photo stats', () => {
    it('should return correct photo stats', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('gallery');
        result.current.togglePhotoSelection('photo-1');
        result.current.togglePhotoSelection('photo-2');
      });

      const stats = result.current.getPhotoStats();
      expect(stats).toEqual({
        currentPhotos: mockPhotos.length,
        totalPhotos: mockPhotos.length,
        totalFavorites: mockFavorites.length,
        selectedCount: 2,
        hasSelection: true,
      });
    });

    it('should return stats for favorites tab', () => {
      const { result } = renderHook(() => usePhotoGallery());

      act(() => {
        result.current.setActiveTab('favorites');
      });

      const stats = result.current.getPhotoStats();
      expect(stats).toEqual({
        currentPhotos: mockFavorites.length,
        totalPhotos: mockPhotos.length,
        totalFavorites: mockFavorites.length,
        selectedCount: 0,
        hasSelection: false,
      });
    });
  });

  describe('state synchronization', () => {
    it('should update gallery state when photos change', () => {
      const { result, rerender } = renderHook(() => usePhotoGallery());

      const newPhotos = [...mockPhotos, mockPhoto1];
      const newFavorites = [...mockFavorites, mockPhoto1];

      // Update mock return value
      mockUsePhotos.mockReturnValue({
        ...mockUsePhotosReturn,
        photos: newPhotos,
        favorites: newFavorites,
        loading: true,
      });

      rerender();

      expect(result.current.galleryState.photos).toEqual(newPhotos);
      expect(result.current.galleryState.favorites).toEqual(newFavorites);
      expect(result.current.galleryState.isLoading).toBe(true);
    });
  });
});