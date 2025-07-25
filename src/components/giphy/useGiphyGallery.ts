import { useContext } from 'react';
import { GiphyGalleryContext } from './GiphyGalleryProvider';
import type { GiphyContextType } from '../../types';

// Custom hook to use the context
export function useGiphyGallery(): GiphyContextType {
  const context = useContext(GiphyGalleryContext);
  if (context === undefined) {
    throw new Error('useGiphyGallery must be used within a GiphyGalleryProvider');
  }
  return context;
}