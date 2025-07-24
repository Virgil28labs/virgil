import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';

/**
 * Custom hook for localStorage with automatic JSON serialization
 * Uses StorageService for consistent storage access
 * 
 * @param key - The localStorage key
 * @param initialValue - The initial value if nothing is stored
 * @returns [value, setValue, removeValue] tuple
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    return StorageService.get(key, initialValue);
  });

  // Save to localStorage
  const setValue = useCallback((value: T) => {
    setStoredValue(value);
    StorageService.set(key, value);
  }, [key]);

  // Remove from localStorage
  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    StorageService.remove(key);
  }, [key, initialValue]);

  // Listen for changes in other tabs
  useEffect(() => {
    const unsubscribe = StorageService.onChange(key, (value: T) => {
      setStoredValue(value);
    });

    return unsubscribe;
  }, [key]);

  return [storedValue, setValue, removeValue];
}