import { createContext } from 'react';
import type { GiphyImage } from '../../types/giphy.types';

interface GiphyGalleryContextType {
  state: {
    isOpen: boolean;
    searchGifs: GiphyImage[];
    trendingGifs: GiphyImage[];
    searchQuery: string;
    loading: boolean;
    error: string | null;
    searchOffset: number;
    trendingOffset: number;
  };
  actions: {
    openGallery: () => void;
    closeGallery: () => void;
    searchGifs: (query: string) => Promise<void>;
    loadMoreSearchResults: () => Promise<void>;
    loadMoreTrending: () => Promise<void>;
    sendGif: (gif: GiphyImage) => void;
    downloadGif: (gif: GiphyImage) => Promise<void>;
    copyGifUrl: (gif: GiphyImage) => Promise<void>;
    shareGif: (gif: GiphyImage) => void;
  };
  loading: boolean;
  error: string | null;
}

export const GiphyGalleryContext = createContext<GiphyGalleryContextType | undefined>(undefined);
