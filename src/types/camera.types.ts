export interface SavedPhoto {
  id: string
  dataUrl: string
  timestamp: number
  isFavorite: boolean
  name?: string
  tags?: string[]
  size?: number
  width?: number
  height?: number
}

export interface CameraState {
  isActive: boolean
  isCapturing: boolean
  hasPermission: boolean
  error: string | null
  facingMode: 'user' | 'environment'
  numberOfCameras: number
  showGrid: boolean
  timer: number | null
  flashMode: 'off' | 'on' | 'auto'
}

export interface PhotoGalleryState {
  photos: SavedPhoto[]
  favorites: SavedPhoto[]
  activeTab: 'camera' | 'gallery' | 'favorites'
  selectedPhoto: SavedPhoto | null
  selectedPhotos: Set<string>
  searchQuery: string
  sortBy: 'date' | 'name' | 'size'
  sortOrder: 'asc' | 'desc'
  isSelectionMode: boolean
  isLoading: boolean
  filter: 'all' | 'favorites' | 'recent'
}

export interface CameraSettings {
  resolution: 'low' | 'medium' | 'high'
  aspectRatio: 'cover' | number
  quality: number
  facingMode: 'user' | 'environment'
  enableFlash: boolean
  enableGrid: boolean
  enableTimer: boolean
  autoSave: boolean
  maxPhotos: number
}

export interface CameraError {
  type: 'permission' | 'hardware' | 'browser' | 'storage' | 'network'
  message: string
  code?: string
  details?: unknown
}

export interface PhotoAction {
  type: 'capture' | 'save' | 'delete' | 'favorite' | 'share' | 'edit' | 'export'
  photoId?: string
  photoIds?: string[]
  data?: unknown
}

export interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface PhotoModalProps {
  photo: SavedPhoto | null
  isOpen: boolean
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  onFavoriteToggle?: (photoId: string) => void
  onDelete?: (photoId: string) => void
  onShare?: (photoId: string) => void
}

export interface PhotoGridProps {
  photos: SavedPhoto[]
  selectedPhotos?: Set<string>
  onPhotoClick: (photo: SavedPhoto) => void
  onPhotoSelect?: (photoId: string) => void
  isSelectionMode?: boolean
  loading?: boolean
}

export interface CameraControlsProps {
  onCapture: () => void
  onSwitchCamera: () => void
  onToggleFlash: () => void
  onToggleGrid: () => void
  onSetTimer: (timer: number | null) => void
  cameraState: CameraState
  disabled?: boolean
}

export interface PhotoStorageOptions {
  maxStorage: number // in MB
  compressionQuality: number
  autoCleanup: boolean
  cleanupAfterDays: number
}

export interface ExportOptions {
  format: 'json' | 'zip'
  includeMetadata: boolean
  compressionLevel: 'none' | 'low' | 'medium' | 'high'
  filename?: string
}
