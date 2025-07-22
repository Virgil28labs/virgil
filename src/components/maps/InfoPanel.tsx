import React, { useCallback } from 'react'
import { Place } from '../../types/maps.types'
import './InfoPanel.css'

interface InfoPanelProps {
  place: Place | null
  onClose: () => void
  onGetDirections: (place: Place) => void
  userLocation?: google.maps.LatLngLiteral | null
}

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

const getRatingStars = (rating?: number): string => {
  if (!rating) return ''
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  let stars = '★'.repeat(fullStars)
  if (hasHalf) stars += '☆'
  return stars
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  place,
  onClose,
  onGetDirections,
  userLocation
}) => {
  const handleGetDirections = useCallback(() => {
    if (place) {
      onGetDirections(place)
    }
  }, [place, onGetDirections])

  if (!place) return null

  // Calculate walking time estimate (average walking speed: 5 km/h)
  const walkingTime = place.distance ? Math.round(place.distance / 83.33) : null // 83.33 m/min

  return (
    <div className="info-panel">
      <div className="panel-handle" />
      
      <button 
        className="panel-close"
        onClick={onClose}
        aria-label="Close info panel"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="panel-content">
        <div className="place-header-minimal">
          <h3 className="place-name-minimal">{place.name}</h3>
          {place.rating && (
            <div className="place-rating-minimal">
              <span className="rating-text">{place.rating.toFixed(1)}</span>
              <span className="rating-stars-minimal">{getRatingStars(place.rating)}</span>
            </div>
          )}
        </div>

        <div className="place-meta-minimal">
          {place.distance && (
            <span className="meta-item">
              {formatDistance(place.distance)}
              {walkingTime && ` • ${walkingTime} min`}
            </span>
          )}
          
          {place.openNow !== undefined && (
            <span className={`meta-item status ${place.openNow ? 'open' : 'closed'}`}>
              {place.openNow ? 'Open' : 'Closed'}
            </span>
          )}
        </div>

        <button 
          className="directions-button"
          onClick={handleGetDirections}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M1 7l6-6v3.5C11 4.5 14 6 14 11c0 0-1-3-7-3v3.5L1 7z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span>Directions</span>
        </button>
      </div>
    </div>
  )
}