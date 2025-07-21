// Giphy API TypeScript definitions

// Giphy Image Rendition
export interface GiphyImageRendition {
  url: string;
  width: string;
  height: string;
  size?: string;
  webp?: string;
  mp4?: string;
  mp4_size?: string;
  frames?: string;
}

// Complete Giphy Images object with all renditions
export interface GiphyImages {
  fixed_height: GiphyImageRendition;
  fixed_height_still: GiphyImageRendition;
  fixed_height_downsampled: GiphyImageRendition;
  fixed_width: GiphyImageRendition;
  fixed_width_still: GiphyImageRendition;
  fixed_width_downsampled: GiphyImageRendition;
  fixed_height_small: GiphyImageRendition;
  fixed_height_small_still: GiphyImageRendition;
  fixed_width_small: GiphyImageRendition;
  fixed_width_small_still: GiphyImageRendition;
  downsized: GiphyImageRendition;
  downsized_still: GiphyImageRendition;
  downsized_large: GiphyImageRendition;
  downsized_medium: GiphyImageRendition;
  downsized_small: GiphyImageRendition;
  original: GiphyImageRendition;
  original_still: GiphyImageRendition;
  looping: GiphyImageRendition;
  preview: GiphyImageRendition;
  preview_gif: GiphyImageRendition;
  preview_webp: GiphyImageRendition;
  "480w_still": GiphyImageRendition;
}

// Giphy User object
export interface GiphyUser {
  avatar_url: string;
  banner_image?: string;
  banner_url?: string;
  profile_url: string;
  username: string;
  display_name: string;
  description?: string;
  instagram_url?: string;
  website_url?: string;
  is_verified: boolean;
}

// Core Giphy GIF object
export interface GiphyGif {
  type: "gif";
  id: string;
  url: string;
  slug: string;
  bitly_gif_url: string;
  bitly_url: string;
  embed_url: string;
  username: string;
  source: string;
  title: string;
  rating: "g" | "pg" | "pg-13" | "r";
  content_url: string;
  source_tld: string;
  source_post_url: string;
  is_sticker: 0 | 1;
  import_datetime: string;
  trending_datetime: string;
  images: GiphyImages;
  user?: GiphyUser;
  analytics_response_payload: string;
  analytics: {
    onload: { url: string };
    onclick: { url: string };
    onsent: { url: string };
  };
  tags?: string[];
}

// Simplified GIF interface for app usage
export interface GiphyImage {
  id: string;
  url: string; // Will use downsized or fixed_height
  webpUrl: string; // WebP version for better performance
  previewUrl: string; // Still image for loading
  originalUrl: string; // Full quality version
  title: string;
  rating: "g" | "pg" | "pg-13" | "r";
  width: number;
  height: number;
  username?: string;
  user?: GiphyUser;
  source?: string;
  tags?: string[];
}

// API Response structures
export interface GiphyPagination {
  total_count: number;
  count: number;
  offset: number;
}

export interface GiphyMeta {
  status: number;
  msg: string;
  response_id: string;
}

export interface GiphyApiResponse {
  data: GiphyGif[];
  pagination: GiphyPagination;
  meta: GiphyMeta;
}

export interface GiphySingleApiResponse {
  data: GiphyGif;
  meta: GiphyMeta;
}

// Search parameters
export interface GiphySearchParams {
  q: string; // Search query
  limit?: number; // Number of results (default 25, max 50)
  offset?: number; // Starting position
  rating?: "g" | "pg" | "pg-13" | "r"; // Content rating
  lang?: string; // Language code
  fmt?: "json" | "html"; // Response format
  random_id?: string; // User session identifier
}

// Trending parameters
export interface GiphyTrendingParams {
  limit?: number;
  offset?: number;
  rating?: "g" | "pg" | "pg-13" | "r";
  fmt?: "json" | "html";
  random_id?: string;
}

// Loading states
export type GiphyLoadingState = "idle" | "loading" | "error" | "success";

// Component prop types
export interface GiphyCardProps {
  gif: GiphyImage;
  index: number;
  isFavorited: boolean;
  onImageClick: () => void;
  onFavoriteToggle: () => void;
}

export interface GiphyModalProps {
  gifs: GiphyImage[];
  currentIndex: number | null;
  isFavorited: (url: string) => boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onFavoriteToggle: (gif: GiphyImage) => void;
}

export interface GiphySearchControlsProps {
  searchQuery: string;
  rating: "g" | "pg" | "pg-13" | "r";
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onRatingChange: (rating: "g" | "pg" | "pg-13" | "r") => void;
  onSearch: () => void;
}

export interface GiphyGridProps {
  gifs: GiphyImage[];
  loading: boolean;
  error: string | null;
  onImageClick: (index: number) => void;
  onFavoriteToggle: (gif: GiphyImage) => void;
  isFavorited: (url: string) => boolean;
}

// Context types
export interface GiphyContextType {
  // State
  searchResults: GiphyImage[];
  trendingGifs: GiphyImage[];
  favorites: GiphyImage[];
  searchQuery: string;
  currentTab: "search" | "trending" | "favorites";
  rating: "g" | "pg" | "pg-13" | "r";
  loading: GiphyLoadingState;
  error: string | null;
  hasMore: boolean;

  // Actions
  search: (query: string) => Promise<void>;
  loadTrending: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleFavorite: (gif: GiphyImage) => void;
  isFavorited: (url: string) => boolean;
  setSearchQuery: (query: string) => void;
  setCurrentTab: (tab: "search" | "trending" | "favorites") => void;
  setRating: (rating: "g" | "pg" | "pg-13" | "r") => void;
  clearError: () => void;
}

// Gallery action types for reducer
export type GiphyAction =
  | { type: "SET_LOADING"; payload: GiphyLoadingState }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SEARCH_RESULTS"; payload: GiphyImage[] }
  | { type: "APPEND_SEARCH_RESULTS"; payload: GiphyImage[] }
  | { type: "SET_TRENDING_GIFS"; payload: GiphyImage[] }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_CURRENT_TAB"; payload: "search" | "trending" | "favorites" }
  | { type: "SET_RATING"; payload: "g" | "pg" | "pg-13" | "r" }
  | { type: "SET_HAS_MORE"; payload: boolean }
  | { type: "TOGGLE_FAVORITE"; payload: GiphyImage }
  | { type: "SET_FAVORITES"; payload: GiphyImage[] }
  | { type: "CLEAR_ERROR" };

// Gallery state
export interface GiphyState {
  searchResults: GiphyImage[];
  trendingGifs: GiphyImage[];
  favorites: GiphyImage[];
  searchQuery: string;
  currentTab: "search" | "trending" | "favorites";
  rating: "g" | "pg" | "pg-13" | "r";
  loading: GiphyLoadingState;
  error: string | null;
  hasMore: boolean;
  offset: number;
}

// Service response types
export interface GiphyServiceError {
  message: string;
  status?: number;
  code?: string;
}
