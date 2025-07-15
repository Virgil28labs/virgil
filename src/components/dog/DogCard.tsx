import { memo, useState, useCallback } from 'react'
import type { DogImage } from './hooks/useDogApi'

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
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await fetch(dog.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `doggo-${dog.breed}-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Show success feedback
      setShowDownloaded(true)
      setTimeout(() => setShowDownloaded(false), 2000)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [dog.url, dog.breed])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      // Create a canvas to draw the image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = dog.url
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
        
        // Show success feedback
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      } else {
        // Fallback: copy URL if image copy is not supported
        await navigator.clipboard.writeText(dog.url)
        console.log('Image copy not supported, copied URL instead')
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy image:', error)
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(dog.url)
      } catch (fallbackError) {
        console.error('Failed to copy URL as fallback:', fallbackError)
      }
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