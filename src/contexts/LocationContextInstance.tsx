import { createContext } from 'react';
import type { LocationContextType } from '../types/location.types';

export const LocationContext = createContext<LocationContextType | undefined>(undefined);