import { useState, useEffect, useCallback } from 'react';
import type { DogImage } from './useDogApi';
import { StorageService, STORAGE_KEYS } from '../../../services/StorageService';

export const useDogFavorites = () => {
  // Initialize state with StorageService value
  const [favorites, setFavorites] = useState<DogImage[]>(() => {
    return StorageService.get<DogImage[]>(STORAGE_KEYS.DOG_FAVORITES, []);
  });

  // Save to localStorage whenever favorites change
  useEffect(() => {
    StorageService.set(STORAGE_KEYS.DOG_FAVORITES, favorites);
  }, [favorites]);

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
  };
};
