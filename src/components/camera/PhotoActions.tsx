import { useState, useCallback, memo, useEffect } from 'react';
import type { SavedPhoto } from '../../types/camera.types';
import { CameraUtils } from './utils/cameraUtils';
import { PhotoExport } from './utils/photoExport';
import { timeService } from '../../services/TimeService';
import { logger } from '../../lib/logger';
import styles from './Camera.module.css';

interface PhotoActionsProps {
  photo: SavedPhoto
  onFavoriteToggle: (photoId: string) => void
  onDelete: (photoId: string) => void
  onClose?: () => void
  className?: string
}

export const PhotoActions = memo(function PhotoActions({
  photo,
  onFavoriteToggle,
  onDelete,
  onClose,
  className = '',
}: PhotoActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          target.click();
        } else if (e.key === 'Tab') {
          // Allow default tab behavior for button navigation
          // Find next/previous button based on shift key
          const buttons = Array.from(document.querySelectorAll('.photo-action-btn')) as HTMLButtonElement[];
          const currentIndex = buttons.indexOf(target as HTMLButtonElement);
          
          if (currentIndex !== -1) {
            let nextIndex: number;
            if (e.shiftKey) {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
            } else {
              nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
            }
            
            if (buttons[nextIndex]) {
              e.preventDefault();
              buttons[nextIndex].focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    onFavoriteToggle(photo.id);
  }, [onFavoriteToggle, photo.id]);

  const handleDownload = useCallback(async () => {
    try {
      setIsProcessing(true);
      const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
      await CameraUtils.downloadPhoto(photo.dataUrl, filename);
    } catch (error) {
      logger.error(
        'Error downloading photo',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'PhotoActions',
          action: 'handleDownload',
          metadata: { photoId: photo.id },
        },
      );
    } finally {
      setIsProcessing(false);
    }
  }, [photo]);

  const handleShare = useCallback(async () => {
    try {
      setIsProcessing(true);
      await PhotoExport.shareSinglePhoto(photo);
    } catch (error) {
      logger.error(
        'Error sharing photo',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'PhotoActions',
          action: 'handleShare',
          metadata: { photoId: photo.id },
        },
      );
      // Fallback to download if share is not supported
      handleDownload();
    } finally {
      setIsProcessing(false);
    }
  }, [photo, handleDownload]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(photo.id);
    setShowDeleteConfirm(false);
    onClose?.();
  }, [onDelete, photo.id, onClose]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  if (showDeleteConfirm) {
    return (
      <div className={`${styles.photoActions} ${styles.deleteConfirm} ${className}`}>
        <div className={styles.deleteConfirmContent}>
          <div className={styles.deleteConfirmIcon}>🗑️</div>
          <h3>Delete Photo?</h3>
          <p>This action cannot be undone.</p>
          <div className={styles.deleteConfirmActions}>
            <button
              className={`${styles.deleteConfirmBtn} ${styles.cancel}`}
              onClick={handleDeleteCancel}
            >
              Cancel
            </button>
            <button
              className={`${styles.deleteConfirmBtn} ${styles.confirm}`}
              onClick={handleDeleteConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.photoActions} ${className}`}>
      {isProcessing && (
        <div className={styles.processingIndicator}>
          <span>Processing...</span>
        </div>
      )}
      <div className={styles.photoActionsGrid}>
        {/* Favorite Action */}
        <button
          className={`${styles.photoActionBtn} ${styles.favoriteAction} ${photo.isFavorite ? styles.favorited : ''}`}
          onClick={handleFavoriteToggle}
          disabled={isProcessing}
          title={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          tabIndex={0}
        >
          <span className={styles.actionIcon}>
            {photo.isFavorite ? '❤️' : '🤍'}
          </span>
          <span className={styles.actionLabel}>
            {photo.isFavorite ? 'Favorited' : 'Favorite'}
          </span>
        </button>

        {/* Download Action */}
        <button
          className={`${styles.photoActionBtn} ${styles.downloadAction}`}
          onClick={handleDownload}
          disabled={isProcessing}
          title="Download photo"
          tabIndex={0}
        >
          <span className={styles.actionIcon}>📥</span>
          <span className={styles.actionLabel}>Download</span>
        </button>

        {/* Share Action */}
        <button
          className={`${styles.photoActionBtn} ${styles.shareAction}`}
          onClick={handleShare}
          disabled={isProcessing}
          title="Share photo"
        >
          <span className={styles.actionIcon}>📤</span>
          <span className={styles.actionLabel}>Share</span>
        </button>

        {/* Delete Action */}
        <button
          className={`${styles.photoActionBtn} ${styles.deleteAction}`}
          onClick={handleDeleteClick}
          disabled={isProcessing}
          title="Delete photo"
        >
          <span className={styles.actionIcon}>🗑️</span>
          <span className={styles.actionLabel}>Delete</span>
        </button>
      </div>

      {/* Photo Info */}
      <div className={styles.photoInfo}>
        <div className={styles.photoMetadata}>
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Date:</span>
            <span className={styles.metadataValue}>
              {timeService.formatDateToLocal(timeService.fromTimestamp(photo.timestamp))}
            </span>
          </div>

          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Time:</span>
            <span className={styles.metadataValue}>
              {timeService.formatTimeToLocal(timeService.fromTimestamp(photo.timestamp))}
            </span>
          </div>

          {photo.size !== undefined && (
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Size:</span>
              <span className={styles.metadataValue}>
                {CameraUtils.formatFileSize(photo.size)}
              </span>
            </div>
          )}

          {photo.width && photo.height && (
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Dimensions:</span>
              <span className={styles.metadataValue}>
                {photo.width} × {photo.height}
              </span>
            </div>
          )}
        </div>

        {photo.name && (
          <div className={styles.photoName}>
            <span className={styles.metadataLabel}>Name:</span>
            <span className={styles.metadataValue}>{photo.name}</span>
          </div>
        )}

        {photo.tags && photo.tags.length > 0 && (
          <div className={styles.photoTags}>
            <span className={styles.metadataLabel}>Tags:</span>
            <div className={styles.tagsList}>
              {photo.tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
