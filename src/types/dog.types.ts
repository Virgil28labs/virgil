import type { MouseEvent } from 'react';

// Core Dog Data Types
export interface DogImage {
  url: string
  breed: string
  id: string
}

// API Response Types
export interface DogApiResponse {
  message: string | string[]
  status: string
}

export interface BreedsApiResponse {
  message: Record<string, string[]>
  status: string
}

// State Management Types
export type DogLoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface ApiState<T> {
  data: T
  state: DogLoadingState
  error: string | null
}

export type TabType = 'fetch' | 'gallery'

// Component Props Types
export interface DogCardProps {
  dog: DogImage
  index: number
  isFavorited: boolean
  onImageClick: () => void
  onFavoriteToggle: (e: MouseEvent) => void
}

export interface DogGridProps {
  dogs: DogImage[]
  isFavorited: (url: string) => boolean
  onImageClick: (url: string) => void
  onFavoriteToggle: (dog: DogImage) => void
}

export interface ImageModalProps {
  dogs: DogImage[]
  currentIndex: number | null
  isFavorited: (url: string) => boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onFavoriteToggle: (dog: DogImage) => void
}

export interface FetchControlsProps {
  selectedBreed: string
  fetchCount: number
  breeds: string[]
  loading: boolean
  onBreedChange: (breed: string) => void
  onCountChange: (count: number) => void
  onFetch: () => void
}

export interface DogGalleryProps {
  isOpen: boolean
  onClose: () => void
}

// Action Types
export interface DogActionButtonsProps {
  dog: DogImage
  isFavorited: boolean
  onFavoriteToggle: (e: MouseEvent) => void
  onDownload?: (e: MouseEvent) => void
  onCopy?: (e: MouseEvent) => void
  showLabels?: boolean
  size?: 'small' | 'medium' | 'large'
}

// Keyboard Shortcuts Types
export interface KeyboardShortcuts {
  'Escape'?: () => void
  'ArrowLeft'?: () => void
  'ArrowRight'?: () => void
  'f'?: () => void // Fetch shortcut
  'g'?: () => void // Gallery shortcut
  [key: string]: (() => void) | undefined
}

// Gallery State Types
export interface DogGalleryState {
  activeTab: TabType
  selectedBreed: string
  fetchCount: number
  selectedImageIndex: number | null
}

export interface DogGalleryContextType {
  // State
  state: DogGalleryState
  dogs: DogImage[]
  breeds: string[]
  loading: boolean
  error: string | null
  favorites: DogImage[]

  // Actions
  setActiveTab: (tab: TabType) => void
  setSelectedBreed: (breed: string) => void
  setFetchCount: (count: number) => void
  setSelectedImageIndex: (index: number | null) => void
  fetchDogs: (breed?: string, count?: number) => void
  fetchBreeds: () => void
  isFavorited: (url: string) => boolean
  toggleFavorite: (dog: DogImage) => void
}

// Utility Types
export interface ImageUtilsResult {
  success: boolean
  message?: string
}

export interface NotificationState {
  show: boolean
  message: string
  type: 'success' | 'error' | 'info'
}
