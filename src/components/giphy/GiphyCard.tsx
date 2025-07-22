import { memo, useState, useCallback } from 'react';
import { giphyService } from '../../lib/giphyService';
import type { GiphyCardProps } from '../../types';

export const GiphyCard = memo(function GiphyCard({ 
  gif, 
  index, 
  isFavorited, 
  onImageClick, 
  onFavoriteToggle, 
}: GiphyCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Handle copy URL
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const success = await giphyService.copyGifUrl(gif);
      if (success) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy GIF URL:', error);
    }
  }, [gif]);

  // Handle download
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await giphyService.downloadGif(gif, `${gif.title || 'gif'}-${gif.id}.gif`);
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (error) {
      console.error('Failed to download GIF:', error);
    }
  }, [gif]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle();
  }, [onFavoriteToggle]);

  return (
    <div
      className="giphy-grid-item"
      onClick={onImageClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ '--index': index } as React.CSSProperties}
      data-loaded={imageLoaded}
      data-title={gif.title}
    >
      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="giphy-image-skeleton">
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(178, 165, 193, 0.1) 0%, rgba(178, 165, 193, 0.2) 50%, rgba(178, 165, 193, 0.1) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
      )}
      
      {/* Error state */}
      {imageError ? (
        <div className="giphy-image-error">
          <div style={{ fontSize: '3rem', opacity: 0.5 }}>🖼️</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--lavender)', opacity: 0.7, marginTop: '0.5rem' }}>
            Failed to load
          </div>
        </div>
      ) : (
        <img
          src={isHovered ? gif.url : gif.previewUrl}
          alt={gif.title || 'GIF'}
          className="giphy-grid-image"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      )}
      
      {/* Favorite overlay */}
      <button
        className={`giphy-favorite-overlay ${isFavorited ? 'favorited' : ''}`}
        onClick={handleFavoriteToggle}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorited ? '❤️' : '🤍'}
      </button>
      
      {/* Action buttons */}
      <div className="giphy-action-buttons">
        <button
          className="giphy-action-btn"
          onClick={handleDownload}
          aria-label="Download GIF"
          title="Download GIF"
        >
          {showDownloaded ? '✓' : '⬇️'}
        </button>
        <button
          className="giphy-action-btn"
          onClick={handleCopy}
          aria-label="Copy GIF URL"
          title="Copy URL"
        >
          {showCopied ? '✓' : '📋'}
        </button>
      </div>

      {/* GIF info overlay (shows on hover) */}
      {gif.title && imageLoaded && (
        <div 
          className="giphy-info-overlay"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            color: 'white',
            padding: '1rem 0.75rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: '500',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          >
            {gif.title}
          </div>
          {gif.username && (
            <div style={{ 
              fontSize: '0.7rem',
              opacity: 0.8,
              marginTop: '0.25rem',
            }}
            >
              by {gif.username}
            </div>
          )}
        </div>
      )}
    </div>
  );
});