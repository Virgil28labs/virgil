import { useState, useCallback, useRef } from 'react';
import { dedupeFetch } from '../../../lib/requestDeduplication';
import { timeService } from '../../../services/TimeService';
import { logger } from '../../../lib/logger';

// Environment-configurable API endpoints
const DOG_API = import.meta.env.VITE_DOG_API_URL || 'https://dog.ceo/api';
const REQUEST_TIMEOUT = 8000;

export interface DogImage {
  url: string
  breed: string
  id: string
}

export const useDogApi = () => {
  const [dogs, setDogs] = useState<DogImage[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch with timeout wrapper
  const fetchWithTimeout = useCallback(async (url: string, signal: AbortSignal): Promise<Response> => {
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await dedupeFetch(url, { signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, []);

  // Extract breed from URL
  const extractBreedFromUrl = (url: string): string => {
    const match = url.match(/breeds\/([^/]+)/);
    return match ? match[1] : 'mixed';
  };

  // Fetch dogs
  const fetchDogs = useCallback(async (breed: string = '', count: number = 1) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `${DOG_API}/breeds/image/random`;
      
      if (breed) {
        url = `${DOG_API}/breed/${breed}/images/random`;
      }
      
      if (count > 1) {
        url += `/${count}`;
      }
      
      const response = await fetchWithTimeout(url, abortControllerRef.current.signal);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dogs');
      }
      
      const data = await response.json();
      const urls = Array.isArray(data.message) ? data.message : [data.message];
      
      const newDogs: DogImage[] = urls.map((url: string, index: number) => ({
        url,
        breed: breed || extractBreedFromUrl(url),
        id: `${timeService.getTimestamp()}-${index}`,
      }));
      
      setDogs(newDogs);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      logger.warn('Dog API fetch failed', {
        component: 'useDogApi',
        action: 'fetchDogs',
        metadata: { error, breed },
      });
      setError('Unable to fetch dogs. Please try again.');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout]);

  // Fetch breeds list
  const fetchBreeds = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(`${DOG_API}/breeds/list/all`, new AbortController().signal);
      
      if (!response.ok) {
        throw new Error('Failed to fetch breeds');
      }
      
      const data = await response.json();
      const breedList = Object.keys(data.message || {});
      setBreeds(breedList);
      
    } catch (error) {
      logger.warn('Failed to fetch breeds', {
        component: 'useDogApi',
        action: 'fetchBreeds',
        metadata: { error },
      });
      setBreeds([]);
    }
  }, [fetchWithTimeout]);

  return {
    dogs,
    breeds,
    loading,
    error,
    fetchDogs,
    fetchBreeds,
  };
};