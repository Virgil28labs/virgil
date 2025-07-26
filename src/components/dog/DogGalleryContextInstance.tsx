import { createContext } from 'react';
import type { DogGalleryContextType } from '../../types';

export const DogGalleryContext = createContext<DogGalleryContextType | undefined>(undefined);