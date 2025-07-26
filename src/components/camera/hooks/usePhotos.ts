import { useState, useCallback, useEffect } from 'react';
import type { SavedPhoto } from '../../../types/camera.types';
import { PhotoStorage } from '../utils/photoStorage';
import { CameraUtils } from '../utils/cameraUtils';
import { timeService } from '../../../services/TimeService';

export const usePhotos = () => {
  const [photos, setPhotos] = useState<SavedPhoto[]>([]);
  const [favorites, setFavorites] = useState<SavedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allPhotos, favoritePhotos] = await Promise.all([
        PhotoStorage.getAllPhotos(),
        PhotoStorage.getFavoritePhotos(),
      ]);

      setPhotos(allPhotos);
      setFavorites(favoritePhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePhoto = useCallback(async (dataUrl: string, name?: string): Promise<SavedPhoto | null> => {
    try {
      setError(null);

      const photo = await PhotoStorage.savePhoto({
        dataUrl,
        timestamp: timeService.getTimestamp(),
        isFavorite: false,
        name,
      });

      // Update local state
      setPhotos(prev => [photo, ...prev]);

      return photo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo');
      return null;
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      setError(null);

      const deleted = await PhotoStorage.deletePhoto(photoId);

      if (deleted) {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        setFavorites(prev => prev.filter(photo => photo.id !== photoId));
      }

      return deleted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
      return false;
    }
  }, []);

  const deletePhotos = useCallback(async (photoIds: string[]): Promise<number> => {
    try {
      setError(null);

      const deletedCount = await PhotoStorage.deletePhotos(photoIds);

      if (deletedCount > 0) {
        setPhotos(prev => prev.filter(photo => !photoIds.includes(photo.id)));
        setFavorites(prev => prev.filter(photo => !photoIds.includes(photo.id)));
      }

      return deletedCount;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photos');
      return 0;
    }
  }, []);

  const toggleFavorite = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      setError(null);

      const isFavorite = await PhotoStorage.toggleFavorite(photoId);

      // Update local state
      setPhotos(prev => prev.map(photo =>
        photo.id === photoId ? { ...photo, isFavorite } : photo,
      ));

      if (isFavorite) {
        // Add to favorites
        const photo = photos.find(p => p.id === photoId);
        if (photo) {
          setFavorites(prev => [{ ...photo, isFavorite: true }, ...prev]);
        }
      } else {
        // Remove from favorites
        setFavorites(prev => prev.filter(photo => photo.id !== photoId));
      }

      return isFavorite;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      return false;
    }
  }, [photos]);

  const updatePhoto = useCallback(async (photoId: string, updates: Partial<SavedPhoto>): Promise<SavedPhoto | null> => {
    try {
      setError(null);

      const updatedPhoto = await PhotoStorage.updatePhoto(photoId, updates);

      if (updatedPhoto) {
        setPhotos(prev => prev.map(photo =>
          photo.id === photoId ? updatedPhoto : photo,
        ));

        if (updatedPhoto.isFavorite) {
          setFavorites(prev => prev.map(photo =>
            photo.id === photoId ? updatedPhoto : photo,
          ));
        }
      }

      return updatedPhoto;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update photo');
      return null;
    }
  }, []);

  const getPhotoById = useCallback((photoId: string): SavedPhoto | null => {
    return photos.find(photo => photo.id === photoId) || null;
  }, [photos]);

  const searchPhotos = useCallback((query: string): SavedPhoto[] => {
    if (!query.trim()) return photos;

    const lowerQuery = query.toLowerCase();
    return photos.filter(photo =>
      photo.name?.toLowerCase().includes(lowerQuery) ||
      photo.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)),
    );
  }, [photos]);

  const sortPhotos = useCallback((
    photosToSort: SavedPhoto[],
    sortBy: 'date' | 'name' | 'size',
    order: 'asc' | 'desc',
  ): SavedPhoto[] => {
    const sorted = [...photosToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, []);

  const getStorageInfo = useCallback(async () => {
    try {
      return await PhotoStorage.getStorageInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get storage info');
      return null;
    }
  }, []);

  const clearAllPhotos = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      await PhotoStorage.clearAllPhotos();
      setPhotos([]);
      setFavorites([]);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear photos');
      return false;
    }
  }, []);

  const downloadPhoto = useCallback(async (photo: SavedPhoto): Promise<boolean> => {
    try {
      setError(null);

      const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
      await CameraUtils.downloadPhoto(photo.dataUrl, filename);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download photo');
      return false;
    }
  }, []);

  const sharePhoto = useCallback(async (photo: SavedPhoto): Promise<boolean> => {
    try {
      setError(null);

      const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
      await CameraUtils.sharePhoto(photo.dataUrl, filename);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share photo');
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize photos on mount
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Initialize photo storage
  useEffect(() => {
    PhotoStorage.initialize();
  }, []);

  return {
    photos,
    favorites,
    loading,
    error,
    loadPhotos,
    savePhoto,
    deletePhoto,
    deletePhotos,
    toggleFavorite,
    updatePhoto,
    getPhotoById,
    searchPhotos,
    sortPhotos,
    getStorageInfo,
    clearAllPhotos,
    downloadPhoto,
    sharePhoto,
    clearError,
  };
};
