import { useState, useEffect, useCallback } from 'react';
import type { DogImage } from './useDogApi';
import { STORAGE_KEYS } from '../../../services/StorageService';
import { appDataService } from '../../../services/AppDataService';

export const useDogFavorites = () => {
  // Initialize state empty, will load from IndexedDB
  const [favorites, setFavorites] = useState<DogImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Load favorites from IndexedDB on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await appDataService.get<DogImage[]>(STORAGE_KEYS.DOG_FAVORITES);
        if (stored && stored.length > 0) {
          setFavorites(stored);
          setHasLoadedInitialData(true);
        } else {
          // Only mark as loaded if we explicitly got null/empty from storage
          setHasLoadedInitialData(true);
        }
      } catch (error) {
        console.error('Failed to load dog favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFavorites();
  }, []);

  // Save to IndexedDB whenever favorites change (after initial load)
  useEffect(() => {
    // Only save if we've loaded initial data and are not in loading state
    if (!isLoading && hasLoadedInitialData) {
      appDataService.set(STORAGE_KEYS.DOG_FAVORITES, favorites).catch(error => {
        console.error('Failed to save dog favorites:', error);
      });
    }
  }, [favorites, isLoading, hasLoadedInitialData]);

  // Check if image is favorited
  const isFavorited = useCallback((imageUrl: string): boolean => {
    return favorites.some(fav => fav.url === imageUrl);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((dog: DogImage) => {
    // Mark that we now have user-initiated data
    if (!hasLoadedInitialData) {
      setHasLoadedInitialData(true);
    }
    
    setFavorites(prev => {
      const exists = prev.some(fav => fav.url === dog.url);

      if (exists) {
        return prev.filter(fav => fav.url !== dog.url);
      } else {
        return [...prev, dog];
      }
    });
  }, [hasLoadedInitialData]);

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    isLoading,
  };
};
