import React, { memo, useEffect, useCallback, useState } from 'react';
import type { ImageModalProps } from '../../types';
import { stopEvent, downloadImage, copyImageToClipboard } from './utils/imageUtils';
import { logger } from '../../lib/logger';
import styles from './DogGallery.module.css';

export const ImageModal = memo(function ImageModal({
  dogs,
  currentIndex,
  isFavorited,
  onClose,
  onNavigate,
  onFavoriteToggle,
}: ImageModalProps) {
  const hasPrevious = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < dogs.length - 1;
  const currentDog = currentIndex !== null ? dogs[currentIndex] : null;

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

  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    if (!currentDog) return;

    try {
      await downloadImage(currentDog.url, currentDog.breed);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to download image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ImageModal',
          action: 'handleDownload',
          metadata: { imageUrl: currentDog?.url },
        },
      );
    }
  }, [currentDog]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    if (!currentDog) return;

    try {
      await copyImageToClipboard(currentDog.url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to copy image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ImageModal',
          action: 'handleCopy',
          metadata: { imageUrl: currentDog?.url },
        },
      );
    }
  }, [currentDog]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (currentDog) {
      onFavoriteToggle(currentDog);
    }
  }, [currentDog, onFavoriteToggle]);

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

  if (currentIndex === null || !currentDog) return null;

  return (
    <div
      className={styles.doggoImageModal}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className={styles.doggoModalContent}>
        <img
          src={currentDog.url}
          alt={`${currentDog.breed} dog`}
          className={styles.doggoModalImage}
          onClick={(e) => e.stopPropagation()}
        />

        <div className={styles.doggoModalActions}>
          <button
            className={`${styles.doggoModalAction} ${isFavorited(currentDog.url) ? styles.favorited : ''}`}
            onClick={handleFavoriteToggle}
            aria-label={isFavorited(currentDog.url) ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited(currentDog.url) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorited(currentDog.url) ? '❤️' : '🤍'}
          </button>
          <button
            className={styles.doggoModalAction}
            onClick={handleDownload}
            aria-label="Download image"
            title="Download"
          >
            {showDownloaded ? '✓' : '⬇️'}
          </button>
          <button
            className={styles.doggoModalAction}
            onClick={handleCopy}
            aria-label="Copy image"
            title="Copy image"
          >
            {showCopied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      <button
        className={styles.doggoModalClose}
        onClick={onClose}
        aria-label="Close image"
      >
        ×
      </button>

      {hasPrevious && (
        <button
          className={`${styles.doggoModalNav} ${styles.doggoModalPrev}`}
          onClick={handlePrevious}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          className={`${styles.doggoModalNav} ${styles.doggoModalNext}`}
          onClick={handleNext}
          aria-label="Next image"
        >
          ›
        </button>
      )}

      <div className={styles.doggoModalCounter}>
        {currentIndex + 1} / {dogs.length}
      </div>
    </div>
  );
});
