import { useContext } from 'react';
import { DogGalleryContext } from '../DogGalleryProvider';
import type { DogGalleryContextType } from '../../../types';

export function useDogGallery(): DogGalleryContextType {
  const context = useContext(DogGalleryContext);
  if (context === undefined) {
    throw new Error('useDogGallery must be used within a DogGalleryProvider');
  }
  return context;
}