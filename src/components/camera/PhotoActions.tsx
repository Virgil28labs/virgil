import React, { useState, useCallback } from 'react';
import type { SavedPhoto } from '../../types/camera.types';
import { CameraUtils } from './utils/cameraUtils';
import { PhotoExport } from './utils/photoExport';
import { timeService } from '../../services/TimeService';
import { logger } from '../../lib/logger';

interface PhotoActionsProps {
  photo: SavedPhoto
  onFavoriteToggle: (photoId: string) => void
  onDelete: (photoId: string) => void
  onClose?: () => void
  className?: string
}

export const PhotoActions: React.FC<PhotoActionsProps> = ({
  photo,
  onFavoriteToggle,
  onDelete,
  onClose,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      <div className={`photo-actions delete-confirm ${className}`}>
        <div className="delete-confirm-content">
          <div className="delete-confirm-icon">🗑️</div>
          <h3>Delete Photo?</h3>
          <p>This action cannot be undone.</p>
          <div className="delete-confirm-actions">
            <button
              className="delete-confirm-btn cancel"
              onClick={handleDeleteCancel}
            >
              Cancel
            </button>
            <button
              className="delete-confirm-btn confirm"
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
    <div className={`photo-actions ${className}`}>
      <div className="photo-actions-grid">
        {/* Favorite Action */}
        <button
          className={`photo-action-btn favorite-action ${photo.isFavorite ? 'favorited' : ''}`}
          onClick={handleFavoriteToggle}
          disabled={isProcessing}
          title={photo.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="action-icon">
            {photo.isFavorite ? '❤️' : '🤍'}
          </span>
          <span className="action-label">
            {photo.isFavorite ? 'Favorited' : 'Favorite'}
          </span>
        </button>

        {/* Download Action */}
        <button
          className="photo-action-btn download-action"
          onClick={handleDownload}
          disabled={isProcessing}
          title="Download photo"
        >
          <span className="action-icon">📥</span>
          <span className="action-label">Download</span>
        </button>

        {/* Share Action */}
        <button
          className="photo-action-btn share-action"
          onClick={handleShare}
          disabled={isProcessing}
          title="Share photo"
        >
          <span className="action-icon">📤</span>
          <span className="action-label">Share</span>
        </button>

        {/* Delete Action */}
        <button
          className="photo-action-btn delete-action"
          onClick={handleDeleteClick}
          disabled={isProcessing}
          title="Delete photo"
        >
          <span className="action-icon">🗑️</span>
          <span className="action-label">Delete</span>
        </button>
      </div>

      {/* Photo Info */}
      <div className="photo-info">
        <div className="photo-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Date:</span>
            <span className="metadata-value">
              {timeService.formatDateToLocal(timeService.fromTimestamp(photo.timestamp))}
            </span>
          </div>
          
          <div className="metadata-item">
            <span className="metadata-label">Time:</span>
            <span className="metadata-value">
              {timeService.formatTimeToLocal(timeService.fromTimestamp(photo.timestamp))}
            </span>
          </div>
          
          {photo.size && (
            <div className="metadata-item">
              <span className="metadata-label">Size:</span>
              <span className="metadata-value">
                {CameraUtils.formatFileSize(photo.size)}
              </span>
            </div>
          )}
          
          {photo.width && photo.height && (
            <div className="metadata-item">
              <span className="metadata-label">Dimensions:</span>
              <span className="metadata-value">
                {photo.width} × {photo.height}
              </span>
            </div>
          )}
        </div>

        {photo.name && (
          <div className="photo-name">
            <span className="metadata-label">Name:</span>
            <span className="metadata-value">{photo.name}</span>
          </div>
        )}

        {photo.tags && photo.tags.length > 0 && (
          <div className="photo-tags">
            <span className="metadata-label">Tags:</span>
            <div className="tags-list">
              {photo.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};