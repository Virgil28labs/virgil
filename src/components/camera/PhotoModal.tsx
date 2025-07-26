import React, { useState, useCallback, useEffect , memo } from 'react';
import type { PhotoModalProps } from '../../types/camera.types';
import { PhotoActions } from './PhotoActions';
import { timeService } from '../../services/TimeService';

export const PhotoModal = memo(function PhotoModal({
  photo,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onFavoriteToggle,
  onDelete,
  onShare,
}: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Reset image state when photo changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [photo?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious?.();
          break;
        case 'ArrowRight':
          onNext?.();
          break;
        case ' ':
          e.preventDefault();
          setShowActions(prev => !prev);
          break;
        case 'f':
          if (photo && onFavoriteToggle) {
            onFavoriteToggle(photo.id);
          }
          break;
        case 'Delete':
          if (photo && onDelete) {
            onDelete(photo.id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, photo, onClose, onNext, onPrevious, onFavoriteToggle, onDelete]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleFavoriteToggle = useCallback(() => {
    if (photo && onFavoriteToggle) {
      onFavoriteToggle(photo.id);
    }
  }, [photo, onFavoriteToggle]);

  const handleDelete = useCallback(() => {
    if (photo && onDelete) {
      onDelete(photo.id);
    }
  }, [photo, onDelete]);

  const handleShare = useCallback(() => {
    if (photo && onShare) {
      onShare(photo.id);
    }
  }, [photo, onShare]);

  if (!isOpen || !photo) {
    return null;
  }

  return (
    <div className="photo-modal-backdrop" onClick={handleBackdropClick}>
      <div className="photo-modal" role="dialog" aria-modal="true" aria-label="Photo viewer">
        {/* Close Button */}
        <button
          className="photo-modal-close"
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          ×
        </button>

        {/* Navigation Buttons */}
        {onPrevious && (
          <button
            className="photo-modal-nav photo-modal-prev"
            onClick={() => onPrevious()}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        {onNext && (
          <button
            className="photo-modal-nav photo-modal-next"
            onClick={() => onNext()}
            aria-label="Next photo"
          >
            ›
          </button>
        )}

        {/* Photo Container */}
        <div className="photo-modal-content">
          <div className="photo-modal-image-container">
            {!imageLoaded && !imageError && (
              <div className="photo-modal-loading">
                <div className="loading-spinner" />
                <p>Loading photo...</p>
              </div>
            )}

            {imageError ? (
              <div className="photo-modal-error">
                <div className="error-icon">🖼️</div>
                <h3>Error Loading Photo</h3>
                <p>The photo could not be displayed</p>
              </div>
            ) : (
              <img
                src={photo.dataUrl}
                alt={photo.name || 'Photo'}
                className="photo-modal-image"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="photo-modal-quick-actions">
            <button
              className={`quick-action-btn favorite ${photo.isFavorite ? 'favorited' : ''}`}
              onClick={handleFavoriteToggle}
              title={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className="action-icon">
                {photo.isFavorite ? '❤️' : '🤍'}
              </span>
            </button>

            <button
              className="quick-action-btn share"
              onClick={handleShare}
              title="Share photo"
            >
              <span className="action-icon">📤</span>
            </button>

            <button
              className="quick-action-btn delete"
              onClick={handleDelete}
              title="Delete photo"
            >
              <span className="action-icon">🗑️</span>
            </button>

            <button
              className={`quick-action-btn actions ${showActions ? 'active' : ''}`}
              onClick={() => setShowActions(prev => !prev)}
              title="More actions"
            >
              <span className="action-icon">⋯</span>
            </button>
          </div>
        </div>

        {/* Actions Panel */}
        {showActions && (
          <div className="photo-modal-actions-panel">
            <PhotoActions
              photo={photo}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDelete}
              onClose={() => setShowActions(false)}
              className="modal-actions"
            />
          </div>
        )}

        {/* Photo Info */}
        <div className="photo-modal-info">
          <div className="photo-modal-title">
            {photo.name || `Photo ${timeService.formatDateToLocal(timeService.fromTimestamp(photo.timestamp))}`}
          </div>
          
          <div className="photo-modal-metadata">
            <span className="photo-timestamp">
              {timeService.formatDateTimeToLocal(timeService.fromTimestamp(photo.timestamp))}
            </span>
            
            {photo.size && (
              <span className="photo-size">
                {(photo.size / 1024).toFixed(1)} KB
              </span>
            )}
            
            {photo.width && photo.height && (
              <span className="photo-dimensions">
                {photo.width} × {photo.height}
              </span>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="photo-modal-shortcuts">
          <div className="shortcuts-info">
            <span className="shortcut">
              <kbd>←</kbd> <kbd>→</kbd> Navigate
            </span>
            <span className="shortcut">
              <kbd>F</kbd> Favorite
            </span>
            <span className="shortcut">
              <kbd>Space</kbd> Actions
            </span>
            <span className="shortcut">
              <kbd>Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});