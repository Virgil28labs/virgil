import { createContext } from 'react';
import type { DogGalleryContextType } from '../../types/dog.types';

export const DogGalleryContext = createContext<DogGalleryContextType | undefined>(undefined);