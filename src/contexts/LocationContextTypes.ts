import { createContext } from 'react';
import type { LocationContextValue } from '../types/location.types';

export const LocationContext = createContext<LocationContextValue | undefined>(undefined);