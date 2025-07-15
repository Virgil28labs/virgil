import { memo, useEffect, useCallback } from 'react'
import type { DogImage } from './hooks/useDogApi'

interface ImageModalProps {
  dogs: DogImage[]
  currentIndex: number | null
  isFavorited: (url: string) => boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onFavoriteToggle: (dog: DogImage) => void
}

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

  const handlePrevious = useCallback(() => {
    if (hasPrevious && currentIndex !== null) {
      onNavigate(currentIndex - 1)
    }
  }, [hasPrevious, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext && currentIndex !== null) {
      onNavigate(currentIndex + 1)
    }
  }, [hasNext, currentIndex, onNavigate])

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentDog) return
    
    try {
      const response = await fetch(currentDog.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `doggo-${currentDog.breed}-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [currentDog])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentDog) return
    
    try {
      // Create a canvas to draw the image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = currentDog.url
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      ctx.drawImage(img, 0, 0)
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/png')
      })
      
      // Try to copy image to clipboard
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
      } else {
        // Fallback: copy URL if image copy is not supported
        await navigator.clipboard.writeText(currentDog.url)
        console.log('Image copy not supported, copied URL instead')
      }
    } catch (error) {
      console.error('Failed to copy image:', error)
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(currentDog.url)
      } catch (fallbackError) {
        console.error('Failed to copy URL as fallback:', fallbackError)
      }
    }
  }, [currentDog])

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
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
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, onClose, handlePrevious, handleNext])

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
            ⬇️
          </button>
          <button
            className="doggo-modal-action"
            onClick={handleCopy}
            aria-label="Copy image URL"
            title="Copy URL"
          >
            📋
          </button>
        </div>
      </div>
      
      <button
        className="doggo-modal-close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close image"
      >
        ×
      </button>

      {hasPrevious && (
        <button
          className="doggo-modal-nav doggo-modal-prev"
          onClick={(e) => {
            e.stopPropagation()
            handlePrevious()
          }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          className="doggo-modal-nav doggo-modal-next"
          onClick={(e) => {
            e.stopPropagation()
            handleNext()
          }}
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