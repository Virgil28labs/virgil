import { useState, useEffect, useCallback } from 'react';
import type { DogImage } from './useDogApi';

const STORAGE_KEY_FAVORITES = 'virgil_dog_favorites';

export const useDogFavorites = () => {
  // Initialize state with localStorage value immediately
  const [favorites, setFavorites] = useState<DogImage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse favorites from localStorage:', e);
    }
    return [];
  });

  // Save to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites to localStorage:', e);
    }
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