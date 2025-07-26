import { useState, useCallback, useEffect } from 'react';
import type { PhotoGalleryState, SavedPhoto } from '../../../types/camera.types';
import { usePhotos } from './usePhotos';
import { timeService } from '../../../services/TimeService';
import { logger } from '../../../lib/logger';

export const usePhotoGallery = () => {
  const {
    photos,
    favorites,
    loading,
    error,
    loadPhotos,
    savePhoto,
    deletePhoto,
    deletePhotos,
    toggleFavorite,
    getPhotoById,
    searchPhotos,
    sortPhotos,
    clearError,
  } = usePhotos();

  const [galleryState, setGalleryState] = useState<PhotoGalleryState>({
    photos: [],
    favorites: [],
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

  const updateGalleryState = useCallback((updates: Partial<PhotoGalleryState>) => {
    setGalleryState(prev => ({ ...prev, ...updates }));
  }, []);

  const setActiveTab = useCallback((tab: 'camera' | 'gallery' | 'favorites') => {
    updateGalleryState({
      activeTab: tab,
      selectedPhoto: null,
      selectedPhotos: new Set(),
      isSelectionMode: false,
    });
  }, [updateGalleryState]);

  const setSelectedPhoto = useCallback((photo: SavedPhoto | null) => {
    updateGalleryState({ selectedPhoto: photo });
  }, [updateGalleryState]);

  const togglePhotoSelection = useCallback((photoId: string) => {
    setGalleryState(prev => {
      const newSelectedPhotos = new Set(prev.selectedPhotos);

      if (newSelectedPhotos.has(photoId)) {
        newSelectedPhotos.delete(photoId);
      } else {
        newSelectedPhotos.add(photoId);
      }

      return {
        ...prev,
        selectedPhotos: newSelectedPhotos,
        isSelectionMode: newSelectedPhotos.size > 0,
      };
    });
  }, []);

  const selectAllPhotos = useCallback(() => {
    let currentPhotos: SavedPhoto[] = [];

    switch (galleryState.activeTab) {
      case 'gallery':
        currentPhotos = photos;
        break;
      case 'favorites':
        currentPhotos = favorites;
        break;
      case 'camera':
      default:
        currentPhotos = [];
        break;
    }

    if (galleryState.filter === 'favorites') {
      currentPhotos = currentPhotos.filter(photo => photo.isFavorite);
    } else if (galleryState.filter === 'recent') {
      const oneDayAgo = timeService.getTimestamp() - (24 * 60 * 60 * 1000);
      currentPhotos = currentPhotos.filter(photo => photo.timestamp > oneDayAgo);
    }

    const allPhotoIds = new Set(currentPhotos.map(photo => photo.id));

    updateGalleryState({
      selectedPhotos: allPhotoIds,
      isSelectionMode: allPhotoIds.size > 0,
    });
  }, [updateGalleryState, galleryState.activeTab, galleryState.filter, photos, favorites]);

  const clearSelection = useCallback(() => {
    updateGalleryState({
      selectedPhotos: new Set(),
      isSelectionMode: false,
    });
  }, [updateGalleryState]);

  const setSearchQuery = useCallback((query: string) => {
    updateGalleryState({ searchQuery: query });
  }, [updateGalleryState]);

  const setSortBy = useCallback((sortBy: 'date' | 'name' | 'size') => {
    updateGalleryState({ sortBy });
  }, [updateGalleryState]);

  const setSortOrder = useCallback((sortOrder: 'asc' | 'desc') => {
    updateGalleryState({ sortOrder });
  }, [updateGalleryState]);

  const setFilter = useCallback((filter: 'all' | 'favorites' | 'recent') => {
    updateGalleryState({ filter });
  }, [updateGalleryState]);

  const getCurrentPhotos = useCallback((): SavedPhoto[] => {
    let currentPhotos: SavedPhoto[] = [];

    switch (galleryState.activeTab) {
      case 'gallery':
        currentPhotos = photos;
        break;
      case 'favorites':
        currentPhotos = favorites;
        break;
      case 'camera':
      default:
        currentPhotos = [];
        break;
    }

    // Apply search filter
    if (galleryState.searchQuery) {
      currentPhotos = searchPhotos(galleryState.searchQuery);
    }

    // Apply additional filters
    switch (galleryState.filter) {
      case 'favorites':
        currentPhotos = currentPhotos.filter(photo => photo.isFavorite);
        break;
      case 'recent': {
        const oneDayAgo = timeService.getTimestamp() - (24 * 60 * 60 * 1000);
        currentPhotos = currentPhotos.filter(photo => photo.timestamp > oneDayAgo);
        break;
      }
      case 'all':
      default:
        // No additional filtering
        break;
    }

    // Apply sorting
    currentPhotos = sortPhotos(currentPhotos, galleryState.sortBy, galleryState.sortOrder);

    return currentPhotos;
  }, [galleryState.activeTab, galleryState.searchQuery, galleryState.filter, galleryState.sortBy, galleryState.sortOrder, photos, favorites, searchPhotos, sortPhotos]);

  const handlePhotoCapture = useCallback(async (dataUrl: string, name?: string): Promise<SavedPhoto | null> => {
    try {
      const photo = await savePhoto(dataUrl, name);
      if (photo) {
        // Auto-switch to gallery tab to show the new photo
        setActiveTab('gallery');
      }
      return photo;
    } catch (err) {
      logger.error('Error saving captured photo', err instanceof Error ? err : new Error(String(err)), {
        component: 'usePhotoGallery',
        action: 'handleCapture',
      });
      return null;
    }
  }, [savePhoto, setActiveTab]);

  const handlePhotoDelete = useCallback(async (photoId: string): Promise<boolean> => {
    const success = await deletePhoto(photoId);

    if (success) {
      // Clear selection if deleted photo was selected
      if (galleryState.selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }

      // Remove from selection set
      if (galleryState.selectedPhotos.has(photoId)) {
        const newSelectedPhotos = new Set(galleryState.selectedPhotos);
        newSelectedPhotos.delete(photoId);
        updateGalleryState({
          selectedPhotos: newSelectedPhotos,
          isSelectionMode: newSelectedPhotos.size > 0,
        });
      }
    }

    return success;
  }, [deletePhoto, galleryState.selectedPhoto, galleryState.selectedPhotos, setSelectedPhoto, updateGalleryState]);

  const handleBulkDelete = useCallback(async (): Promise<number> => {
    const photoIds = Array.from(galleryState.selectedPhotos);
    const deletedCount = await deletePhotos(photoIds);

    if (deletedCount > 0) {
      clearSelection();
      setSelectedPhoto(null);
    }

    return deletedCount;
  }, [galleryState.selectedPhotos, deletePhotos, clearSelection, setSelectedPhoto]);

  const handleFavoriteToggle = useCallback(async (photoId: string): Promise<boolean> => {
    return await toggleFavorite(photoId);
  }, [toggleFavorite]);

  const handleBulkFavorite = useCallback(async (makeFavorite: boolean): Promise<number> => {
    const photoIds = Array.from(galleryState.selectedPhotos);
    let successCount = 0;

    for (const photoId of photoIds) {
      const photo = getPhotoById(photoId);
      if (photo && photo.isFavorite !== makeFavorite) {
        const success = await toggleFavorite(photoId);
        if (success) successCount++;
      }
    }

    return successCount;
  }, [galleryState.selectedPhotos, getPhotoById, toggleFavorite]);

  const navigatePhoto = useCallback((direction: 'next' | 'previous') => {
    if (!galleryState.selectedPhoto) return;

    const currentPhotos = getCurrentPhotos();
    const currentIndex = currentPhotos.findIndex(photo => photo.id === galleryState.selectedPhoto?.id);

    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % currentPhotos.length;
    } else {
      newIndex = currentIndex === 0 ? currentPhotos.length - 1 : currentIndex - 1;
    }

    setSelectedPhoto(currentPhotos[newIndex]);
  }, [galleryState.selectedPhoto, getCurrentPhotos, setSelectedPhoto]);

  const getPhotoStats = useCallback(() => {
    const currentPhotos = getCurrentPhotos();
    const totalPhotos = photos.length;
    const totalFavorites = favorites.length;
    const selectedCount = galleryState.selectedPhotos.size;

    return {
      currentPhotos: currentPhotos.length,
      totalPhotos,
      totalFavorites,
      selectedCount,
      hasSelection: selectedCount > 0,
    };
  }, [getCurrentPhotos, photos.length, favorites.length, galleryState.selectedPhotos.size]);

  // Update gallery state when photos change
  useEffect(() => {
    updateGalleryState({
      photos,
      favorites,
      isLoading: loading,
    });
  }, [photos, favorites, loading, updateGalleryState]);

  return {
    galleryState,
    loading,
    error,
    getCurrentPhotos,
    setActiveTab,
    setSelectedPhoto,
    togglePhotoSelection,
    selectAllPhotos,
    clearSelection,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setFilter,
    handlePhotoCapture,
    handlePhotoDelete,
    handleBulkDelete,
    handleFavoriteToggle,
    handleBulkFavorite,
    navigatePhoto,
    getPhotoStats,
    clearError,
    loadPhotos,
  };
};
