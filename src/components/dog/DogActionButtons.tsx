import React, { memo, useState, useCallback } from 'react';
import type { DogActionButtonsProps } from '../../types';
import { stopEvent, downloadImage, copyImageToClipboard } from './utils/imageUtils';
import { logger } from '../../lib/logger';

export const DogActionButtons = memo(function DogActionButtons({ 
  dog,
  isFavorited,
  onFavoriteToggle,
  onDownload,
  onCopy,
  showLabels = false,
  size = 'medium',
}: DogActionButtonsProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      if (onDownload) {
        onDownload(e);
      } else {
        await downloadImage(dog.url, dog.breed);
      }
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to download image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'DogActionButtons',
          action: 'handleDownload',
          metadata: { imageUrl: dog.url, breed: dog.breed },
        },
      );
    }
  }, [dog.url, dog.breed, onDownload]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      if (onCopy) {
        onCopy(e);
      } else {
        await copyImageToClipboard(dog.url);
      }
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to copy image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'DogActionButtons',
          action: 'handleCopy',
          metadata: { imageUrl: dog.url },
        },
      );
    }
  }, [dog.url, onCopy]);

  const sizeClasses = {
    small: 'doggo-action-btn--small',
    medium: 'doggo-action-btn--medium', 
    large: 'doggo-action-btn--large',
  };

  const buttonClass = `doggo-action-btn ${sizeClasses[size]}`;

  return (
    <div className={`doggo-action-buttons ${showLabels ? 'doggo-action-buttons--labeled' : ''}`}>
      <button
        className={`${buttonClass} doggo-favorite-btn ${isFavorited ? 'favorited' : ''}`}
        onClick={onFavoriteToggle}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorited ? '❤️' : '🤍'}
        {showLabels && (
          <span className="doggo-action-label">
            {isFavorited ? 'Favorited' : 'Favorite'}
          </span>
        )}
      </button>
      
      <button
        className={buttonClass}
        onClick={handleDownload}
        aria-label="Download image"
        title="Download"
      >
        {showDownloaded ? '✓' : '⬇️'}
        {showLabels && (
          <span className="doggo-action-label">
            {showDownloaded ? 'Downloaded' : 'Download'}
          </span>
        )}
      </button>
      
      <button
        className={buttonClass}
        onClick={handleCopy}
        aria-label="Copy image"
        title="Copy image"
      >
        {showCopied ? '✓' : '📋'}
        {showLabels && (
          <span className="doggo-action-label">
            {showCopied ? 'Copied' : 'Copy'}
          </span>
        )}
      </button>
    </div>
  );
});