import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { PhotoGridProps, SavedPhoto } from '../../types/camera.types'
import { CameraUtils } from './utils/cameraUtils'

interface PhotoCardProps {
  photo: SavedPhoto
  isSelected: boolean
  isSelectionMode: boolean
  onPhotoClick: (photo: SavedPhoto) => void
  onPhotoSelect: (photoId: string) => void
  onFavoriteToggle: (photoId: string) => void
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  isSelectionMode,
  onPhotoClick,
  onPhotoSelect,
  onFavoriteToggle
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const handleCardClick = useCallback(() => {
    if (isSelectionMode) {
      onPhotoSelect(photo.id)
    } else {
      onPhotoClick(photo)
    }
  }, [isSelectionMode, onPhotoSelect, onPhotoClick, photo])

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onFavoriteToggle(photo.id)
  }, [onFavoriteToggle, photo.id])

  const handleSelectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPhotoSelect(photo.id)
  }, [onPhotoSelect, photo.id])

  return (
    <div 
      className={`photo-card ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
      onClick={handleCardClick}
    >
      <div className="photo-card-image">
        {!imageLoaded && !imageError && (
          <div className="photo-loading">
            <div className="photo-loading-spinner" />
          </div>
        )}
        
        {imageError ? (
          <div className="photo-error">
            <span className="photo-error-icon">🖼️</span>
            <span className="photo-error-text">Error loading image</span>
          </div>
        ) : (
          <img
            src={photo.dataUrl}
            alt={photo.name || 'Photo'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        )}
        
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="photo-selection-checkbox">
            <button
              className={`selection-checkbox ${isSelected ? 'checked' : ''}`}
              onClick={handleSelectClick}
              aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
            >
              {isSelected && <span className="checkbox-check">✓</span>}
            </button>
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          className={`photo-favorite-btn ${photo.isFavorite ? 'favorited' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="favorite-icon">
            {photo.isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>
      
      <div className="photo-card-info">
        <div className="photo-metadata">
          <span className="photo-date">
            {CameraUtils.formatTimestamp(photo.timestamp)}
          </span>
          {photo.size && (
            <span className="photo-size">
              {CameraUtils.formatFileSize(photo.size)}
            </span>
          )}
        </div>
        
        {photo.name && (
          <div className="photo-name">
            {photo.name}
          </div>
        )}
      </div>
    </div>
  )
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  selectedPhotos = new Set(),
  onPhotoClick,
  onPhotoSelect,
  isSelectionMode = false,
  loading = false
}) => {
  const gridRef = useRef<HTMLDivElement>(null)

  const handleFavoriteToggle = useCallback((photoId: string) => {
    // This would be handled by the parent component
    console.log('Toggle favorite for photo:', photoId)
  }, [])

  if (loading) {
    return (
      <div className="photo-grid loading">
        <div className="photo-grid-loading">
          <div className="loading-spinner" />
          <p>Loading photos...</p>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="photo-grid empty">
        <div className="photo-grid-empty">
          <div className="empty-icon">📸</div>
          <h3>No Photos Yet</h3>
          <p>Start taking photos to build your gallery!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="photo-grid" ref={gridRef}>
      <div className="photo-grid-container">
        {photos.map(photo => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            isSelectionMode={isSelectionMode}
            onPhotoClick={onPhotoClick}
            onPhotoSelect={onPhotoSelect || (() => {})}
            onFavoriteToggle={handleFavoriteToggle}
          />
        ))}
      </div>
      
      {/* Grid Footer */}
      <div className="photo-grid-footer">
        <div className="photo-count">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </div>
        
        {isSelectionMode && selectedPhotos.size > 0 && (
          <div className="selection-count">
            {selectedPhotos.size} selected
          </div>
        )}
      </div>
    </div>
  )
}