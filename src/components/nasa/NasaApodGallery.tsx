import React, { memo, useCallback, useState } from 'react';
import type { ApodImage } from '../../types/nasa.types';
import { 
  downloadApodImage, 
  copyApodToClipboard,
  shareApod,
  stopEvent, 
} from './utils/nasaImageUtils';
import { logger } from '../../lib/logger';
import { timeService } from '../../services/TimeService';

interface NasaApodGalleryProps {
  favorites: ApodImage[]
  onRemoveFavorite: (apodId: string) => void
  onOpenModal: (index: number) => void
}

export const NasaApodGallery = memo(function NasaApodGallery({
  favorites,
  onRemoveFavorite,
  onOpenModal,
}: NasaApodGalleryProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (e: React.MouseEvent, apod: ApodImage) => {
    stopEvent(e);
    setDownloadingId(apod.id);
    try {
      await downloadApodImage(apod, apod.hdImageUrl ? 'hd' : 'standard');
    } catch (error) {
      logger.error('Failed to download APOD', error as Error, {
        component: 'NasaApodGallery',
        action: 'handleDownload',
        metadata: { apodTitle: apod.title },
      });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleCopy = useCallback(async (e: React.MouseEvent, apod: ApodImage) => {
    stopEvent(e);
    setCopyingId(apod.id);
    try {
      await copyApodToClipboard(apod);
      setTimeout(() => setCopyingId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy APOD', error as Error, {
        component: 'NasaApodGallery',
        action: 'handleCopy',
        metadata: { apodTitle: apod.title },
      });
      setCopyingId(null);
    }
  }, []);

  const handleShare = useCallback(async (e: React.MouseEvent, apod: ApodImage) => {
    stopEvent(e);
    setSharingId(apod.id);
    try {
      await shareApod(apod);
      setTimeout(() => setSharingId(null), 2000);
    } catch (error) {
      logger.error('Failed to share APOD', error as Error, {
        component: 'NasaApodGallery',
        action: 'handleShare',
        metadata: { apodTitle: apod.title },
      });
      setSharingId(null);
    }
  }, []);

  const handleRemove = useCallback((e: React.MouseEvent, apodId: string) => {
    stopEvent(e);
    onRemoveFavorite(apodId);
  }, [onRemoveFavorite]);

  const handleImageClick = useCallback((index: number) => {
    onOpenModal(index);
  }, [onOpenModal]);

  if (favorites.length === 0) {
    return (
      <div className="nasa-apod-gallery-empty">
        <div className="nasa-apod-gallery-empty-icon">❤️</div>
        <h3>No favorites yet!</h3>
        <p>Browse the cosmos and save your favorite astronomy pictures</p>
      </div>
    );
  }

  return (
    <div className="nasa-apod-gallery">
      <div className="nasa-apod-gallery-header">
        <h3>My Cosmic Collection</h3>
        <p className="nasa-apod-gallery-count">{favorites.length} favorite{favorites.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="nasa-apod-gallery-grid">
        {favorites.map((apod, index) => (
          <div 
            key={apod.id}
            className="nasa-apod-gallery-item"
            onClick={() => handleImageClick(index)}
            role="button"
            tabIndex={0}
            aria-label={`View ${apod.title}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleImageClick(index);
              }
            }}
          >
            {/* Thumbnail */}
            <div className="nasa-apod-gallery-thumbnail">
              {apod.mediaType === 'video' ? (
                <div className="nasa-apod-gallery-video-placeholder">
                  <span className="nasa-apod-gallery-video-icon">▶️</span>
                  <span className="nasa-apod-gallery-video-label">Video</span>
                </div>
              ) : (
                <img 
                  src={apod.imageUrl} 
                  alt={apod.title}
                  loading="lazy"
                  className="nasa-apod-gallery-image"
                />
              )}
              
              {/* Favorite Overlay - Always Visible */}
              <button
                className="nasa-apod-gallery-favorite-overlay favorited"
                onClick={(e) => handleRemove(e, apod.id)}
                aria-label="Remove from favorites"
                title="Remove from favorites"
              >
                ❤️
              </button>
              
              {/* Action Overlay - Show on Hover */}
              <div className="nasa-apod-gallery-action-overlay">
                <button
                  className="nasa-apod-gallery-action-btn"
                  onClick={(e) => handleDownload(e, apod)}
                  aria-label="Download image"
                  title="Download image"
                  disabled={downloadingId === apod.id}
                >
                  {downloadingId === apod.id ? '⏳' : '⬇️'}
                </button>
                <button
                  className="nasa-apod-gallery-action-btn"
                  onClick={(e) => handleCopy(e, apod)}
                  aria-label="Copy image"
                  title="Copy image"
                  disabled={copyingId === apod.id}
                >
                  {copyingId === apod.id ? '✓' : '📋'}
                </button>
                <button
                  className="nasa-apod-gallery-action-btn"
                  onClick={(e) => handleShare(e, apod)}
                  aria-label="Share"
                  title="Share"
                  disabled={sharingId === apod.id}
                >
                  {sharingId === apod.id ? '✓' : '🔗'}
                </button>
              </div>
            </div>
            
            {/* Info */}
            <div className="nasa-apod-gallery-info">
              <h4 className="nasa-apod-gallery-title">{apod.title}</h4>
              <p className="nasa-apod-gallery-date">
                {timeService.formatDateToLocal(timeService.parseDate(apod.date) || timeService.getCurrentDateTime(), {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});