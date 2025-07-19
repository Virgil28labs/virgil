// NASA APOD API TypeScript definitions

// NASA APOD Response from API
export interface NasaApodResponse {
  date: string; // YYYY-MM-DD format
  explanation: string; // Detailed explanation of the image
  hdurl?: string; // High-resolution image URL (optional)
  media_type: "image" | "video"; // Type of media returned
  service_version: string; // API service version (typically "v1")
  title: string; // Title of the image
  url: string; // Regular resolution image/video URL
  copyright?: string; // Copyright information (optional)
  concepts?: string[]; // Concept tags (optional, when concept_tags=true)
}

// Simplified APOD interface for app usage
export interface ApodImage {
  id: string; // Generated from date for consistency
  date: string; // YYYY-MM-DD format
  title: string;
  explanation: string;
  imageUrl: string; // Regular resolution image URL
  hdImageUrl?: string; // High-resolution image URL
  mediaType: "image" | "video";
  copyright?: string;
  concepts?: string[];
  isHD: boolean; // Whether HD version is available
  aspectRatio?: number; // Width/height ratio for layout
}

// API Request Parameters
export interface NasaApodParams {
  date?: string; // YYYY-MM-DD format, defaults to today
  hd?: boolean; // Return HD URLs, defaults to false
  concept_tags?: boolean; // Return concept tags, defaults to false
  api_key?: string; // API key, defaults to DEMO_KEY
}

// Date range parameters for batch requests
export interface ApodDateRangeParams {
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  hd?: boolean;
  api_key?: string;
}

// Loading states
export type ApodLoadingState = "idle" | "loading" | "success" | "error";

// Component Props
export interface NasaApodViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // Optional initial date to display
}

export interface ApodImageProps {
  apod: ApodImage;
  isZoomed: boolean;
  showHD: boolean;
  onZoomToggle: () => void;
  onHDToggle: () => void;
  onLoad?: () => void;
  onError?: () => void;
}

export interface ApodMetadataProps {
  apod: ApodImage;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onCopyLink?: () => void;
}

export interface ApodDatePickerProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  loading: boolean;
  minDate?: string; // Earliest available date (1995-06-16)
  maxDate?: string; // Latest available date (today)
}

export interface ApodNavigationProps {
  currentDate: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onRandom: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  loading: boolean;
}

// Context types for state management
export interface ApodContextType {
  // Current state
  currentApod: ApodImage | null;
  currentDate: string;
  loading: ApodLoadingState;
  error: string | null;
  showHD: boolean;
  isZoomed: boolean;

  // Navigation state
  history: string[]; // Date history for back navigation
  favorites: ApodImage[]; // Favorited APODs

  // Actions
  loadApod: (date?: string) => Promise<void>;
  loadTodaysApod: () => Promise<void>;
  loadRandomApod: () => Promise<void>;
  goToNextDay: () => Promise<void>;
  goToPreviousDay: () => Promise<void>;
  toggleHD: () => void;
  toggleZoom: () => void;
  toggleFavorite: (apod: ApodImage) => void;
  isFavorited: (date: string) => boolean;
  clearError: () => void;
}

// Action types for reducer
export type ApodAction =
  | { type: "SET_LOADING"; payload: ApodLoadingState }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CURRENT_APOD"; payload: ApodImage }
  | { type: "SET_CURRENT_DATE"; payload: string }
  | { type: "SET_SHOW_HD"; payload: boolean }
  | { type: "SET_IS_ZOOMED"; payload: boolean }
  | { type: "ADD_TO_HISTORY"; payload: string }
  | { type: "TOGGLE_FAVORITE"; payload: ApodImage }
  | { type: "SET_FAVORITES"; payload: ApodImage[] }
  | { type: "CLEAR_ERROR" };

// State interface for reducer
export interface ApodState {
  currentApod: ApodImage | null;
  currentDate: string;
  loading: ApodLoadingState;
  error: string | null;
  showHD: boolean;
  isZoomed: boolean;
  history: string[];
  favorites: ApodImage[];
}

// Service response types
export interface ApodServiceError {
  message: string;
  status?: number;
  code?: string;
}

export interface ApodServiceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheTimeout: number; // Cache duration in milliseconds
}

// Utility types
export interface ApodDownloadOptions {
  quality: "regular" | "hd";
  filename?: string;
}

export interface ApodShareData {
  title: string;
  text: string;
  url: string;
}

// Preset date options for quick navigation
export interface ApodDatePreset {
  id: string;
  label: string;
  date: string;
  description?: string;
}

// Notable APOD dates for quick access
export const NOTABLE_APOD_DATES: ApodDatePreset[] = [
  {
    id: "first",
    label: "First APOD",
    date: "1995-06-16",
    description: "The very first Astronomy Picture of the Day",
  },
  {
    id: "hubble-deep-field",
    label: "Hubble Deep Field",
    date: "1996-01-15",
    description: "The famous Hubble Deep Field image",
  },
  {
    id: "pale-blue-dot",
    label: "Pale Blue Dot",
    date: "2020-02-14",
    description: "Voyager 1's iconic Earth photograph",
  },
  {
    id: "black-hole",
    label: "First Black Hole Image",
    date: "2019-04-10",
    description: "First image of a black hole from Event Horizon Telescope",
  },
];

// Constants
export const APOD_API_BASE_URL = "https://api.nasa.gov/planetary/apod";
export const APOD_FIRST_DATE = "1995-06-16"; // First APOD date
export const APOD_DEFAULT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
export const APOD_MAX_EXPLANATION_PREVIEW = 200; // Characters for preview
