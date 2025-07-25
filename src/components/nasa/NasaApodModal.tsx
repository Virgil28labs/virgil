import React, { memo, useEffect, useCallback, useState } from 'react';
import type { ApodImage } from '../../types/nasa.types';
import { 
  stopEvent, 
  downloadApodImage, 
  copyApodToClipboard, 
  shareApod, 
} from './utils/nasaImageUtils';
import { logger } from '../../lib/logger';

interface NasaApodModalProps {
  favorites: ApodImage[]
  currentIndex: number | null
  isFavorited: (apodId: string) => boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onFavoriteToggle: (apod: ApodImage) => void
}

export const NasaApodModal = memo(function NasaApodModal({
  favorites,
  currentIndex,
  isFavorited,
  onClose,
  onNavigate,
  onFavoriteToggle,
}: NasaApodModalProps) {
  const hasPrevious = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < favorites.length - 1;
  const currentApod = currentIndex !== null ? favorites[currentIndex] : null;

  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (hasPrevious && currentIndex !== null) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrevious, currentIndex, onNavigate]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (hasNext && currentIndex !== null) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onNavigate]);

  const handleDownload = useCallback(async (e: React.MouseEvent, quality: 'standard' | 'hd') => {
    stopEvent(e);
    if (!currentApod) return;
    
    setShowDownloadMenu(false);
    try {
      await downloadApodImage(currentApod, quality);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error('Failed to download APOD', error as Error, {
        component: 'NasaApodModal',
        action: 'handleDownload',
        metadata: { apodTitle: currentApod?.title },
      });
    }
  }, [currentApod]);

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (!currentApod) return;
    
    if (currentApod.hdImageUrl) {
      setShowDownloadMenu(!showDownloadMenu);
    } else {
      handleDownload(e, 'standard');
    }
  }, [currentApod, showDownloadMenu, handleDownload]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    if (!currentApod) return;
    
    try {
      await copyApodToClipboard(currentApod);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy APOD', error as Error, {
        component: 'NasaApodModal',
        action: 'handleCopy',
        metadata: { apodTitle: currentApod?.title },
      });
    }
  }, [currentApod]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    if (!currentApod) return;
    
    try {
      const sharedNatively = await shareApod(currentApod);
      if (!sharedNatively) {
        setShowShared(true);
        setTimeout(() => setShowShared(false), 2000);
      }
    } catch (error) {
      logger.error('Failed to share APOD', error as Error, {
        component: 'NasaApodModal',
        action: 'handleShare',
        metadata: { apodTitle: currentApod?.title },
      });
    }
  }, [currentApod]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (currentApod) {
      onFavoriteToggle(currentApod);
    }
  }, [currentApod, onFavoriteToggle]);

  // Handle keyboard navigation
  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious && currentIndex !== null) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (hasNext && currentIndex !== null) {
            onNavigate(currentIndex + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose, onNavigate, hasPrevious, hasNext]);

  if (currentIndex === null || !currentApod) return null;

  return (
    <div 
      className="nasa-apod-modal" 
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="nasa-apod-modal-content">
        {currentApod.mediaType === 'image' ? (
          <img
            src={currentApod.hdImageUrl || currentApod.imageUrl}
            alt={currentApod.title}
            className="nasa-apod-modal-image"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <iframe
            src={currentApod.imageUrl}
            title={currentApod.title}
            className="nasa-apod-modal-video"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="nasa-apod-modal-info">
          <h3 className="nasa-apod-modal-title">{currentApod.title}</h3>
          <p className="nasa-apod-modal-date">
            {new Date(currentApod.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        
        <div className="nasa-apod-modal-actions">
          <button
            className={`nasa-apod-modal-action ${isFavorited(currentApod.id) ? 'favorited' : ''}`}
            onClick={handleFavoriteToggle}
            aria-label={isFavorited(currentApod.id) ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited(currentApod.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorited(currentApod.id) ? '❤️' : '🤍'}
          </button>
          
          <div className="nasa-apod-modal-action-group">
            <button
              className="nasa-apod-modal-action"
              onClick={handleDownloadClick}
              aria-label="Download image"
              title="Download"
            >
              {showDownloaded ? '✓' : '⬇️'}
            </button>
            
            {showDownloadMenu && currentApod.hdImageUrl && (
              <div className="nasa-apod-modal-download-popup">
                <button
                  className="nasa-apod-download-option"
                  onClick={(e) => handleDownload(e, 'standard')}
                >
                  Standard
                </button>
                <button
                  className="nasa-apod-download-option"
                  onClick={(e) => handleDownload(e, 'hd')}
                >
                  HD
                </button>
              </div>
            )}
          </div>
          
          <button
            className="nasa-apod-modal-action"
            onClick={handleCopy}
            aria-label="Copy image"
            title="Copy image"
          >
            {showCopied ? '✓' : '📋'}
          </button>
          
          <button
            className="nasa-apod-modal-action"
            onClick={handleShare}
            aria-label="Share"
            title="Share"
          >
            {showShared ? '✓' : '🔗'}
          </button>
          
          <button
            className={`nasa-apod-modal-action ${showDescription ? 'active' : ''}`}
            onClick={(e) => {
              stopEvent(e);
              setShowDescription(!showDescription);
            }}
            aria-label="Toggle description"
            title="Toggle description"
          >
            ℹ️
          </button>
        </div>
        
        {showDescription && currentApod.explanation && (
          <div className="nasa-apod-modal-description">
            <h4>About this image</h4>
            <p>{currentApod.explanation}</p>
            {currentApod.copyright && (
              <p className="nasa-apod-modal-copyright">© {currentApod.copyright}</p>
            )}
          </div>
        )}
      </div>
      
      <button
        className="nasa-apod-modal-close"
        onClick={onClose}
        aria-label="Close image"
      >
        ×
      </button>

      {hasPrevious && (
        <button
          className="nasa-apod-modal-nav nasa-apod-modal-prev"
          onClick={handlePrevious}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          className="nasa-apod-modal-nav nasa-apod-modal-next"
          onClick={handleNext}
          aria-label="Next image"
        >
          ›
        </button>
      )}

      <div className="nasa-apod-modal-counter">
        {currentIndex + 1} / {favorites.length}
      </div>
    </div>
  );
});