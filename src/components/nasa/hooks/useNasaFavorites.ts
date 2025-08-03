import { useState, useEffect, useCallback } from 'react';
import type { ApodImage } from '../../../types/nasa.types';
import { STORAGE_KEYS } from '../../../services/StorageService';
import { timeService } from '../../../services/TimeService';
import { appDataService } from '../../../services/AppDataService';

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
  savedAt: timeService.getTimestamp(),
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
  // Initialize state empty, will load from IndexedDB
  const [favorites, setFavorites] = useState<StoredApod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from IndexedDB on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await appDataService.get<StoredApod[]>(STORAGE_KEYS.NASA_FAVORITES);
        if (stored) {
          // Sort by savedAt timestamp (newest first)
          const sortedFavorites = stored.sort((a: StoredApod, b: StoredApod) => b.savedAt - a.savedAt);
          setFavorites(sortedFavorites);
        }
      } catch (error) {
        console.error('Failed to load NASA favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFavorites();
  }, []);

  // Save to IndexedDB whenever favorites change (after initial load)
  useEffect(() => {
    if (!isLoading) {
      appDataService.set(STORAGE_KEYS.NASA_FAVORITES, favorites).catch(error => {
        console.error('Failed to save NASA favorites:', error);
      });
    }
  }, [favorites, isLoading]);

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
    isLoading,
  };
};
