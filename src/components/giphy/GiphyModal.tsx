import React, { memo, useEffect, useCallback, useState } from 'react';
import { giphyService } from '../../lib/giphyService';
import type { GiphyModalProps } from '../../types/giphy.types';
import { logger } from '../../lib/logger';
import styles from './GiphyGallery.module.css';

export const GiphyModal = memo(function GiphyModal({
  gifs,
  currentIndex,
  isFavorited,
  onClose,
  onNavigate,
  onFavoriteToggle,
}: GiphyModalProps) {
  const hasPrevious = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < gifs.length - 1;
  const currentGif = currentIndex !== null ? gifs[currentIndex] : null;

  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrevious && currentIndex !== null) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrevious, currentIndex, onNavigate]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext && currentIndex !== null) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onNavigate]);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentGif) return;

    try {
      await giphyService.downloadGif(currentGif, `${currentGif.title || 'gif'}-${currentGif.id}.gif`);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      logger.error('Failed to download GIF', error as Error, {
        component: 'GiphyModal',
        action: 'handleDownload',
        metadata: { gifTitle: currentGif.title },
      });
    }
  }, [currentGif]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentGif) return;

    try {
      const success = await giphyService.copyGifUrl(currentGif);
      if (success) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (error) {
      logger.error('Failed to copy GIF URL', error as Error, {
        component: 'GiphyModal',
        action: 'handleCopyLink',
        metadata: { gifTitle: currentGif.title },
      });
    }
  }, [currentGif]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentGif) return;

    const shareUrl = giphyService.getShareUrl(currentGif);

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentGif.title || 'Check out this GIF!',
          url: shareUrl,
        });
      } catch (_error) {
        // User cancelled or error occurred, fallback to copy
        await navigator.clipboard.writeText(shareUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } else {
      // Fallback to copy URL
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [currentGif]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentGif) {
      onFavoriteToggle(currentGif);
    }
  }, [currentGif, onFavoriteToggle]);

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
        case 'f':
        case 'F':
          // Toggle favorite with 'f' key
          if (currentGif) {
            onFavoriteToggle(currentGif);
          }
          break;
        case 'c':
        case 'C':
          // Copy URL with 'c' key
          if (currentGif) {
            handleCopy({ stopPropagation: () => {} } as React.MouseEvent);
          }
          break;
        case 'd':
        case 'D':
          // Download with 'd' key
          if (currentGif) {
            handleDownload({ stopPropagation: () => {} } as React.MouseEvent);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose, onNavigate, hasPrevious, hasNext, currentGif, onFavoriteToggle, handleCopy, handleDownload]);

  if (currentIndex === null || !currentGif) return null;

  return (
    <div
      className={styles.giphyImageModal}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease-out',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--giphy-spacing-lg)',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
      >
        {/* Main GIF */}
        <img
          src={currentGif.originalUrl}
          alt={currentGif.title || 'GIF'}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '85vw',
            maxHeight: '70vh',
            borderRadius: 'var(--giphy-radius-lg)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            animation: 'slideUpFade 0.3s ease-out',
            cursor: 'default',
          }}
        />

        {/* GIF Info */}
        {currentGif.title && (
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              maxWidth: '600px',
            }}
          >
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
            }}
            >
              {currentGif.title}
            </h3>
            {currentGif.username && (
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                opacity: 0.8,
              }}
              >
                by {currentGif.username}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--giphy-spacing-md)',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: 'var(--giphy-spacing-sm) var(--giphy-spacing-lg)',
            borderRadius: 'var(--giphy-radius-lg)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={handleFavoriteToggle}
            aria-label={isFavorited(currentGif.url) ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited(currentGif.url) ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
            style={{
              background: 'transparent',
              border: 'none',
              width: '3rem',
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1.75rem',
              padding: 0,
              borderRadius: 'var(--giphy-radius-sm)',
              animation: isFavorited(currentGif.url) ? 'heartPop 0.4s ease' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isFavorited(currentGif.url) ? '❤️' : '🤍'}
          </button>

          <button
            onClick={handleDownload}
            aria-label="Download GIF"
            title="Download GIF (D)"
            style={{
              background: 'transparent',
              border: 'none',
              width: '3rem',
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1.75rem',
              padding: 0,
              borderRadius: 'var(--giphy-radius-sm)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {showDownloaded ? '✓' : '⬇️'}
          </button>

          <button
            onClick={handleCopy}
            aria-label="Copy GIF URL"
            title="Copy URL (C)"
            style={{
              background: 'transparent',
              border: 'none',
              width: '3rem',
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1.75rem',
              padding: 0,
              borderRadius: 'var(--giphy-radius-sm)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {showCopied ? '✓' : '📋'}
          </button>

          <button
            onClick={handleShare}
            aria-label="Share GIF"
            title="Share GIF"
            style={{
              background: 'transparent',
              border: 'none',
              width: '3rem',
              height: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1.75rem',
              padding: 0,
              borderRadius: 'var(--giphy-radius-sm)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔗
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close modal"
        style={{
          position: 'absolute',
          top: 'var(--giphy-spacing-xl)',
          right: 'var(--giphy-spacing-xl)',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '1.5rem',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: 'var(--giphy-radius-full)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
          e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
          e.currentTarget.style.borderColor = 'var(--giphy-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        ×
      </button>

      {/* Navigation buttons */}
      {hasPrevious && (
        <button
          onClick={handlePrevious}
          aria-label="Previous GIF"
          style={{
            position: 'absolute',
            top: '50%',
            left: 'var(--giphy-spacing-xl)',
            transform: 'translateY(-50%)',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '3rem',
            fontWeight: '300',
            width: '4rem',
            height: '5rem',
            borderRadius: 'var(--giphy-radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
            e.currentTarget.style.borderColor = 'var(--giphy-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          onClick={handleNext}
          aria-label="Next GIF"
          style={{
            position: 'absolute',
            top: '50%',
            right: 'var(--giphy-spacing-xl)',
            transform: 'translateY(-50%)',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '3rem',
            fontWeight: '300',
            width: '4rem',
            height: '5rem',
            borderRadius: 'var(--giphy-radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
            e.currentTarget.style.borderColor = 'var(--giphy-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ›
        </button>
      )}

      {/* Counter */}
      <div
        style={{
          position: 'absolute',
          bottom: 'var(--giphy-spacing-xl)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          padding: 'var(--giphy-spacing-xs) var(--giphy-spacing-md)',
          borderRadius: 'var(--giphy-radius-sm)',
          fontSize: '0.95rem',
          fontWeight: '500',
        }}
      >
        {currentIndex + 1} / {gifs.length}
      </div>
    </div>
  );
});
