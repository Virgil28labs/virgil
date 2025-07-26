import React, { memo, useState, useCallback } from 'react';
import type { DogImage } from '../../types';
import { stopEvent, downloadImage, copyImageToClipboard } from './utils/imageUtils';
import { logger } from '../../lib/logger';

interface DogCardActionsProps {
  dog: DogImage
}

export const DogCardActions = memo(function DogCardActions({ dog }: DogCardActionsProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      await downloadImage(dog.url, dog.breed);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to download image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'DogCardActions',
          action: 'handleDownload',
          metadata: { imageUrl: dog.url, breed: dog.breed },
        },
      );
    }
  }, [dog.url, dog.breed]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      await copyImageToClipboard(dog.url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logger.error(
        'Failed to copy image',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'DogCardActions',
          action: 'handleCopy',
          metadata: { imageUrl: dog.url },
        },
      );
    }
  }, [dog.url]);

  return (
    <div className="doggo-action-buttons">
      <button
        className="doggo-action-btn"
        onClick={handleDownload}
        aria-label="Download image"
        title="Download"
      >
        {showDownloaded ? '✓' : '⬇️'}
      </button>
      <button
        className="doggo-action-btn"
        onClick={handleCopy}
        aria-label="Copy image"
        title="Copy image"
      >
        {showCopied ? '✓' : '📋'}
      </button>
    </div>
  );
});