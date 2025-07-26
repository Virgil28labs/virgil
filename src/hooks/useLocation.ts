import { useContext } from 'react';
import { LocationContext } from '../contexts/LocationContextInstance';
import type { LocationContextValue } from '../types/location.types';

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
