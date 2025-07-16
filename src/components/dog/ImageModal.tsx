import { memo, useEffect, useCallback, useState } from 'react'
import type { ImageModalProps } from '../../types'
import { stopEvent, downloadImage, copyImageToClipboard } from './utils/imageUtils'

export const ImageModal = memo(function ImageModal({ 
  dogs, 
  currentIndex,
  isFavorited,
  onClose, 
  onNavigate,
  onFavoriteToggle
}: ImageModalProps) {
  const hasPrevious = currentIndex !== null && currentIndex > 0
  const hasNext = currentIndex !== null && currentIndex < dogs.length - 1
  const currentDog = currentIndex !== null ? dogs[currentIndex] : null

  const handlePrevious = useCallback((e: React.MouseEvent) => {
    stopEvent(e)
    if (hasPrevious && currentIndex !== null) {
      onNavigate(currentIndex - 1)
    }
  }, [hasPrevious, currentIndex, onNavigate])

  const handleNext = useCallback((e: React.MouseEvent) => {
    stopEvent(e)
    if (hasNext && currentIndex !== null) {
      onNavigate(currentIndex + 1)
    }
  }, [hasNext, currentIndex, onNavigate])

  const [showCopied, setShowCopied] = useState(false)
  const [showDownloaded, setShowDownloaded] = useState(false)

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e)
    if (!currentDog) return
    
    try {
      await downloadImage(currentDog.url, currentDog.breed)
      setShowDownloaded(true)
      setTimeout(() => setShowDownloaded(false), 2000)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [currentDog])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    stopEvent(e)
    if (!currentDog) return
    
    try {
      await copyImageToClipboard(currentDog.url)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy image:', error)
    }
  }, [currentDog])

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    stopEvent(e)
    if (currentDog) {
      onFavoriteToggle(currentDog)
    }
  }, [currentDog, onFavoriteToggle])

  // Handle keyboard navigation
  useEffect(() => {
    if (currentIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrevious && currentIndex !== null) {
            onNavigate(currentIndex - 1)
          }
          break
        case 'ArrowRight':
          if (hasNext && currentIndex !== null) {
            onNavigate(currentIndex + 1)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, onClose, onNavigate, hasPrevious, hasNext])

  if (currentIndex === null || !currentDog) return null

  return (
    <div 
      className="doggo-image-modal" 
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div className="doggo-modal-content">
        <img
          src={currentDog.url}
          alt={`${currentDog.breed} dog`}
          className="doggo-modal-image"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="doggo-modal-actions">
          <button
            className={`doggo-modal-action ${isFavorited(currentDog.url) ? 'favorited' : ''}`}
            onClick={handleFavoriteToggle}
            aria-label={isFavorited(currentDog.url) ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited(currentDog.url) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorited(currentDog.url) ? '❤️' : '🤍'}
          </button>
          <button
            className="doggo-modal-action"
            onClick={handleDownload}
            aria-label="Download image"
            title="Download"
          >
            {showDownloaded ? '✓' : '⬇️'}
          </button>
          <button
            className="doggo-modal-action"
            onClick={handleCopy}
            aria-label="Copy image"
            title="Copy image"
          >
            {showCopied ? '✓' : '📋'}
          </button>
        </div>
      </div>
      
      <button
        className="doggo-modal-close"
        onClick={onClose}
        aria-label="Close image"
      >
        ×
      </button>

      {hasPrevious && (
        <button
          className="doggo-modal-nav doggo-modal-prev"
          onClick={handlePrevious}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          className="doggo-modal-nav doggo-modal-next"
          onClick={handleNext}
          aria-label="Next image"
        >
          ›
        </button>
      )}

      <div className="doggo-modal-counter">
        {currentIndex + 1} / {dogs.length}
      </div>
    </div>
  )
})