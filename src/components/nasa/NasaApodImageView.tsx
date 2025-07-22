import { memo, useState, useCallback } from 'react';
import type { ApodImage } from '../../types/nasa.types';
import { NasaApodFavoriteOverlay } from './NasaApodFavoriteOverlay';
import { NasaApodActionOverlay } from './NasaApodActionOverlay';

interface NasaApodImageViewProps {
  apod: ApodImage
  isFavorited: boolean
  onFavoriteToggle: () => void
  imageLoading: boolean
  onImageLoad: () => void
  onImageError: () => void
}

export const NasaApodImageView = memo(function NasaApodImageView({
  apod,
  isFavorited,
  onFavoriteToggle,
  imageLoading,
  onImageLoad,
  onImageError,
}: NasaApodImageViewProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageClick = useCallback(() => {
    if (apod.mediaType === 'image') {
      setIsZoomed(!isZoomed);
    }
  }, [apod.mediaType, isZoomed]);

  return (
    <div className={`nasa-apod-image-wrapper ${isZoomed ? 'zoomed' : ''}`}>
      <div className="nasa-apod-image-container" onClick={handleImageClick}>
        {imageLoading && (
          <div className="nasa-apod-image-skeleton">
            <div className="nasa-apod-skeleton-shimmer" />
          </div>
        )}
        
        {apod.mediaType === 'image' ? (
          <img
            src={apod.hdImageUrl || apod.imageUrl}
            alt={apod.title}
            className="nasa-apod-image"
            onLoad={onImageLoad}
            onError={onImageError}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : (
          <iframe
            src={apod.imageUrl}
            title={apod.title}
            className="nasa-apod-video"
            onLoad={onImageLoad}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        )}
        
        {/* Overlays */}
        <NasaApodFavoriteOverlay
          isFavorited={isFavorited}
          onFavoriteToggle={onFavoriteToggle}
        />
        
        <NasaApodActionOverlay apod={apod} />
      </div>

      {/* Copyright only if present */}
      {apod.copyright && (
        <div className="nasa-apod-metadata">
          <p className="nasa-apod-copyright">© {apod.copyright}</p>
        </div>
      )}
    </div>
  );
});