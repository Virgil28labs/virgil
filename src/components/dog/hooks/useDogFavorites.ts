import { useState, useEffect, useCallback } from 'react';
import type { DogImage } from './useDogApi';
import { STORAGE_KEYS, StorageService } from '../../../services/StorageService';

export const useDogFavorites = () => {
  const [favorites, setFavorites] = useState<DogImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = StorageService.get<DogImage[]>(STORAGE_KEYS.DOG_FAVORITES, []);
      setFavorites(stored);
    } catch (error) {
      console.error('Failed to load dog favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever favorites change (after initial load)
  useEffect(() => {
    if (!isLoading) {
      StorageService.set(STORAGE_KEYS.DOG_FAVORITES, favorites);
    }
  }, [favorites, isLoading]);

  // Check if image is favorited
  const isFavorited = useCallback((imageUrl: string): boolean => {
    return favorites.some(fav => fav.url === imageUrl);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((dog: DogImage) => {
    setFavorites(prev => {
      const exists = prev.some(fav => fav.url === dog.url);

      if (exists) {
        return prev.filter(fav => fav.url !== dog.url);
      } else {
        return [...prev, dog];
      }
    });
  }, []);

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    isLoading,
  };
};
