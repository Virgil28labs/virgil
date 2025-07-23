import { memo, useState, useCallback } from 'react';
import type { ApodImage } from '../../types/nasa.types';
import { 
  stopEvent, 
  downloadApodImage, 
  copyApodToClipboard, 
  shareApod, 
} from './utils/nasaImageUtils';
import { logger } from '../../lib/logger';

interface NasaApodActionOverlayProps {
  apod: ApodImage
}

export const NasaApodActionOverlay = memo(function NasaApodActionOverlay({ 
  apod, 
}: NasaApodActionOverlayProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent, quality: 'standard' | 'hd') => {
    stopEvent(e);
    setShowDownloadMenu(false);
    try {
      await downloadApodImage(apod, quality);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error('Failed to download APOD', error as Error, {
        component: 'NasaApodActionOverlay',
        action: 'handleDownload',
        metadata: { apodTitle: apod.title }
      });
    }
  }, [apod]);

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (apod.hdImageUrl) {
      setShowDownloadMenu(!showDownloadMenu);
    } else {
      handleDownload(e, 'standard');
    }
  }, [apod.hdImageUrl, showDownloadMenu, handleDownload]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      await copyApodToClipboard(apod);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy APOD', error as Error, {
        component: 'NasaApodActionOverlay',
        action: 'handleCopy',
        metadata: { apodTitle: apod.title }
      });
    }
  }, [apod]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e);
    try {
      const sharedNatively = await shareApod(apod);
      if (!sharedNatively) {
        // Fallback was used (copied to clipboard)
        setShowShared(true);
        setTimeout(() => setShowShared(false), 2000);
      }
    } catch (error) {
      logger.error('Failed to share APOD', error as Error, {
        component: 'NasaApodActionOverlay',
        action: 'handleShare',
        metadata: { apodTitle: apod.title }
      });
    }
  }, [apod]);

  return (
    <div className="nasa-apod-action-overlay">
      <div className="nasa-apod-action-group">
        <button
          className="nasa-apod-action-btn"
          onClick={handleDownloadClick}
          aria-label="Download image"
          title="Download"
        >
          {showDownloaded ? '✓' : '⬇️'}
        </button>
        
        {showDownloadMenu && apod.hdImageUrl && (
          <div className="nasa-apod-download-popup">
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
        className="nasa-apod-action-btn"
        onClick={handleCopy}
        aria-label="Copy image"
        title="Copy image"
      >
        {showCopied ? '✓' : '📋'}
      </button>

      <button
        className="nasa-apod-action-btn"
        onClick={handleShare}
        aria-label="Share"
        title="Share"
      >
        {showShared ? '✓' : '🔗'}
      </button>
    </div>
  );
});