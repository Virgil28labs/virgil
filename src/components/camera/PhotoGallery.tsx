import React, { useState, useCallback } from 'react'
import { PhotoGalleryTabs } from './PhotoGalleryTabs'
import { PhotoGrid } from './PhotoGrid'
import { CameraInterface } from './CameraInterface'
import { usePhotoGallery } from './hooks/usePhotoGallery'
import type { SavedPhoto } from '../../types/camera.types'

interface PhotoGalleryProps {
  onPhotoSelect: (photo: SavedPhoto) => void
  onError: (error: string) => void
}

interface GalleryToolbarProps {
  activeTab: 'camera' | 'gallery' | 'favorites'
  isSelectionMode: boolean
  selectedCount: number
  onToggleSelection: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete: () => void
  onBulkFavorite: (makeFavorite: boolean) => void
  onSearch: (query: string) => void
  searchQuery: string
}

const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  activeTab,
  isSelectionMode,
  selectedCount,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkFavorite,
  onSearch,
  searchQuery
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchQuery(value)
    onSearch(value)
  }, [onSearch])

  const handleSearchClear = useCallback(() => {
    setLocalSearchQuery('')
    onSearch('')
  }, [onSearch])

  // Don't show toolbar for camera tab
  if (activeTab === 'camera') {
    return null
  }

  return (
    <div className="gallery-toolbar">
      {/* Search Bar */}
      <div className="gallery-search">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search photos..."
            value={localSearchQuery}
            onChange={handleSearchChange}
          />
          {localSearchQuery && (
            <button
              className="search-clear"
              onClick={handleSearchClear}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Selection Actions */}
      <div className="gallery-actions">
        {!isSelectionMode ? (
          <button
            className="gallery-action-btn select-btn"
            onClick={onToggleSelection}
          >
            <span className="btn-icon">☑️</span>
            Select
          </button>
        ) : (
          <div className="selection-actions">
            <button
              className="gallery-action-btn select-all-btn"
              onClick={onSelectAll}
            >
              Select All
            </button>
            
            <button
              className="gallery-action-btn clear-selection-btn"
              onClick={onClearSelection}
            >
              Clear ({selectedCount})
            </button>
            
            {selectedCount > 0 && (
              <>
                <button
                  className="gallery-action-btn favorite-btn"
                  onClick={() => onBulkFavorite(true)}
                >
                  <span className="btn-icon">❤️</span>
                  Favorite
                </button>
                
                <button
                  className="gallery-action-btn unfavorite-btn"
                  onClick={() => onBulkFavorite(false)}
                >
                  <span className="btn-icon">🤍</span>
                  Unfavorite
                </button>
                
                <button
                  className="gallery-action-btn delete-btn"
                  onClick={onBulkDelete}
                >
                  <span className="btn-icon">🗑️</span>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  onPhotoSelect,
  onError
}) => {
  const {
    galleryState,
    loading,
    error,
    getCurrentPhotos,
    setActiveTab,
    togglePhotoSelection,
    selectAllPhotos,
    clearSelection,
    setSearchQuery,
    handlePhotoCapture,
    handleBulkDelete,
    handleBulkFavorite,
    getPhotoStats
  } = usePhotoGallery()

  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const currentPhotos = getCurrentPhotos()
  const stats = getPhotoStats()

  const handleTabChange = useCallback((tab: 'camera' | 'gallery' | 'favorites') => {
    setActiveTab(tab)
    setIsSelectionMode(false)
    clearSelection()
  }, [setActiveTab, clearSelection])

  const handlePhotoClick = useCallback((photo: SavedPhoto) => {
    onPhotoSelect(photo)
  }, [onPhotoSelect])

  const handlePhotoSelectToggle = useCallback((photoId: string) => {
    togglePhotoSelection(photoId)
  }, [togglePhotoSelection])

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        clearSelection()
      }
      return !prev
    })
  }, [clearSelection])

  const handleSelectAll = useCallback(() => {
    selectAllPhotos()
  }, [selectAllPhotos])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    setIsSelectionMode(false)
  }, [clearSelection])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (galleryState.selectedPhotos.size === 0) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${galleryState.selectedPhotos.size} photo${galleryState.selectedPhotos.size > 1 ? 's' : ''}?`
    )
    
    if (confirmed) {
      const deletedCount = await handleBulkDelete()
      if (deletedCount > 0) {
        setIsSelectionMode(false)
      }
    }
  }, [galleryState.selectedPhotos.size, handleBulkDelete])

  const handleBulkFavoriteAction = useCallback(async (makeFavorite: boolean) => {
    if (galleryState.selectedPhotos.size === 0) return
    
    await handleBulkFavorite(makeFavorite)
    setIsSelectionMode(false)
  }, [galleryState.selectedPhotos.size, handleBulkFavorite])

  const handleCameraCapture = useCallback(async (dataUrl: string) => {
    try {
      await handlePhotoCapture(dataUrl)
    } catch (err) {
      onError('Failed to save photo')
    }
  }, [handlePhotoCapture, onError])

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError(error)
    }
  }, [error, onError])

  return (
    <div className="photo-gallery">
      {/* Tabs */}
      <PhotoGalleryTabs
        activeTab={galleryState.activeTab}
        onTabChange={handleTabChange}
        photoCount={stats.totalPhotos}
        favoriteCount={stats.totalFavorites}
      />

      {/* Toolbar */}
      <GalleryToolbar
        activeTab={galleryState.activeTab}
        isSelectionMode={isSelectionMode}
        selectedCount={galleryState.selectedPhotos.size}
        onToggleSelection={handleToggleSelectionMode}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDeleteConfirm}
        onBulkFavorite={handleBulkFavoriteAction}
        onSearch={setSearchQuery}
        searchQuery={galleryState.searchQuery}
      />

      {/* Content */}
      <div className="gallery-content">
        {galleryState.activeTab === 'camera' ? (
          <CameraInterface
            onPhotoCapture={handleCameraCapture}
            onError={onError}
            className="gallery-camera"
          />
        ) : (
          <PhotoGrid
            photos={currentPhotos}
            selectedPhotos={galleryState.selectedPhotos}
            onPhotoClick={handlePhotoClick}
            onPhotoSelect={isSelectionMode ? handlePhotoSelectToggle : undefined}
            isSelectionMode={isSelectionMode}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}