import { useState, useEffect, useCallback } from 'react';
import type { ApodImage } from '../../../types/nasa.types';
import { StorageService, STORAGE_KEYS } from '../../../services/StorageService';

// Simplified APOD for storage (reduce localStorage usage)
interface StoredApod {
  id: string
  date: string
  title: string
  imageUrl: string
  hdImageUrl?: string
  mediaType: 'image' | 'video'
  explanation: string
  copyright?: string
  savedAt: number // Timestamp when favorited
}

const apodToStored = (apod: ApodImage): StoredApod => ({
  id: apod.id,
  date: apod.date,
  title: apod.title,
  imageUrl: apod.imageUrl,
  hdImageUrl: apod.hdImageUrl,
  mediaType: apod.mediaType,
  explanation: apod.explanation,
  copyright: apod.copyright,
  savedAt: Date.now(),
});

const storedToApod = (stored: StoredApod): ApodImage => ({
  ...stored,
  explanation: stored.explanation || '',
  isHD: !!stored.hdImageUrl,
  copyright: stored.copyright,
  concepts: undefined,
  aspectRatio: undefined,
});

export const useNasaFavorites = () => {
  // Initialize state with StorageService value
  const [favorites, setFavorites] = useState<StoredApod[]>(() => {
    const storedFavorites = StorageService.get<StoredApod[]>(STORAGE_KEYS.NASA_FAVORITES, []);
    // Sort by savedAt timestamp (newest first)
    return storedFavorites.sort((a: StoredApod, b: StoredApod) => b.savedAt - a.savedAt);
  });

  // Save to localStorage whenever favorites change
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.NASA_FAVORITES, favorites);
  }, [favorites]);

  // Check if APOD is favorited
  const isFavorited = useCallback((apodId: string): boolean => {
    return favorites.some(fav => fav.id === apodId);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((apod: ApodImage) => {
    setFavorites(prev => {
      const exists = prev.some(fav => fav.id === apod.id);
      
      if (exists) {
        return prev.filter(fav => fav.id !== apod.id);
      } else {
        const newFavorite = apodToStored(apod);
        // Add to beginning and maintain sort by savedAt
        return [newFavorite, ...prev];
      }
    });
  }, []);

  // Get all favorites as ApodImage array
  const getFavorites = useCallback((): ApodImage[] => {
    return favorites.map(storedToApod);
  }, [favorites]);

  // Remove a favorite by ID
  const removeFavorite = useCallback((apodId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== apodId));
  }, []);

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  // Get favorite count
  const favoriteCount = favorites.length;

  // Get a specific favorite by ID
  const getFavoriteById = useCallback((apodId: string): ApodImage | null => {
    const found = favorites.find(fav => fav.id === apodId);
    return found ? storedToApod(found) : null;
  }, [favorites]);

  return {
    favorites: getFavorites(),
    favoriteCount,
    isFavorited,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    getFavoriteById,
  };
};