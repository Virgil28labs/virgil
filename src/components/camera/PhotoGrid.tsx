import React, { useState, useCallback, useRef } from 'react';
import type { PhotoGridProps, SavedPhoto } from '../../types/camera.types';
import { CameraUtils } from './utils/cameraUtils';
import styles from './Camera.module.css';

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
  onFavoriteToggle,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleCardClick = useCallback(() => {
    if (isSelectionMode) {
      onPhotoSelect(photo.id);
    } else {
      onPhotoClick(photo);
    }
  }, [isSelectionMode, onPhotoSelect, onPhotoClick, photo]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(photo.id);
  }, [onFavoriteToggle, photo.id]);

  const handleSelectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPhotoSelect(photo.id);
  }, [onPhotoSelect, photo.id]);

  return (
    <div
      className={`${styles.photoCard} ${isSelected ? styles.selected : ''} ${isSelectionMode ? styles.selectionMode : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.photoCardImage}>
        {!imageLoaded && !imageError && (
          <div className={styles.photoLoading}>
            <div className={styles.photoLoadingSpinner} />
          </div>
        )}

        {imageError ? (
          <div className={styles.photoError}>
            <span className={styles.photoErrorIcon}>🖼️</span>
            <span className={styles.photoErrorText}>Error loading image</span>
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
          <div className={styles.photoSelectionCheckbox}>
            <button
              className={`${styles.selectionCheckbox} ${isSelected ? styles.checked : ''}`}
              onClick={handleSelectClick}
              aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
            >
              {isSelected && <span className={styles.checkboxCheck}>✓</span>}
            </button>
          </div>
        )}

        {/* Favorite Button */}
        <button
          className={`${styles.photoFavoriteBtn} ${photo.isFavorite ? styles.favorited : ''}`}
          onClick={handleFavoriteClick}
          aria-label={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className={styles.favoriteIcon}>
            {photo.isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      <div className={styles.photoCardInfo}>
        <div className={styles.photoMetadata}>
          <span className={styles.photoDate}>
            {CameraUtils.formatTimestamp(photo.timestamp)}
          </span>
          {photo.size && (
            <span className={styles.photoSize}>
              {CameraUtils.formatFileSize(photo.size)}
            </span>
          )}
        </div>

        {photo.name && (
          <div className={styles.photoName}>
            {photo.name}
          </div>
        )}
      </div>
    </div>
  );
};

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  selectedPhotos = new Set(),
  onPhotoClick,
  onPhotoSelect,
  isSelectionMode = false,
  loading = false,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleFavoriteToggle = useCallback((_photoId: string) => {
    // This would be handled by the parent component
  }, []);

  if (loading) {
    return (
      <div className={`${styles.photoGrid} ${styles.loading}`}>
        <div className={styles.photoGridLoading}>
          <div className={styles.loadingSpinner} />
          <p>Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={`${styles.photoGrid} ${styles.empty}`}>
        <div className={styles.photoGridEmpty}>
          <div className={styles.emptyIcon}>📸</div>
          <h3>No Photos Yet</h3>
          <p>Start taking photos to build your gallery!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.photoGrid} ref={gridRef}>
      <div className={styles.photoGridContainer}>
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
      <div className={styles.photoGridFooter}>
        <div className={styles.photoCount}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </div>

        {isSelectionMode && selectedPhotos.size > 0 && (
          <div className={styles.selectionCount}>
            {selectedPhotos.size} selected
          </div>
        )}
      </div>
    </div>
  );
};
