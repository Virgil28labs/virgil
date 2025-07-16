import { memo } from 'react'
import { stopEvent } from './utils/nasaImageUtils'

interface NasaApodFavoriteOverlayProps {
  isFavorited: boolean
  onFavoriteToggle: () => void
}

export const NasaApodFavoriteOverlay = memo(function NasaApodFavoriteOverlay({
  isFavorited,
  onFavoriteToggle
}: NasaApodFavoriteOverlayProps) {
  const handleClick = (e: React.MouseEvent) => {
    stopEvent(e)
    onFavoriteToggle()
  }

  return (
    <button
      className={`nasa-apod-favorite-overlay ${isFavorited ? 'favorited' : ''}`}
      onClick={handleClick}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  )
})