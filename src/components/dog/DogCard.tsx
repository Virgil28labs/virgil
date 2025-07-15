import { memo, useState, useCallback } from 'react'
import type { DogImage } from './hooks/useDogApi'
import { stopEvent, downloadImage, copyImageToClipboard } from './utils/imageUtils'

interface DogCardProps {
  dog: DogImage
  index: number
  isFavorited: boolean
  onImageClick: () => void
  onFavoriteToggle: (e: React.MouseEvent) => void
}

export const DogCard = memo(function DogCard({ 
  dog, 
  index, 
  isFavorited, 
  onImageClick, 
  onFavoriteToggle 
}: DogCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [showDownloaded, setShowDownloaded] = useState(false)

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e)
    try {
      await downloadImage(dog.url, dog.breed)
      setShowDownloaded(true)
      setTimeout(() => setShowDownloaded(false), 2000)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [dog.url, dog.breed])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e)
    try {
      await copyImageToClipboard(dog.url)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy image:', error)
    }
  }, [dog.url])

  return (
    <div
      className="doggo-grid-item"
      onClick={onImageClick}
      style={{ '--index': index } as React.CSSProperties}
      data-loaded={imageLoaded}
    >
      {!imageLoaded && !imageError && (
        <div className="doggo-image-skeleton" />
      )}
      
      {imageError ? (
        <div className="doggo-image-error">🐕‍🦺</div>
      ) : (
        <img
          src={dog.url}
          alt={`${dog.breed} dog`}
          className="doggo-grid-image"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      )}
      
      <button
        className={`doggo-favorite-overlay ${isFavorited ? 'favorited' : ''}`}
        onClick={onFavoriteToggle}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorited ? '❤️' : '🤍'}
      </button>
      
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
    </div>
  )
})