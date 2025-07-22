import React, { useCallback } from 'react'
import { Place } from '../../types/maps.types'
import './PlaceDetailsCard.css'

interface PlaceDetailsCardProps {
  place: Place | null
  onClose: () => void
  onGetDirections: (place: Place) => void
  onSave?: (place: Place) => void
  userLocation?: google.maps.LatLngLiteral | null
}

// Format distance for display
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

// Format price level with $ symbols
const formatPriceLevel = (level?: number): string => {
  if (!level) return ''
  return '$'.repeat(level)
}

// Get rating stars display
const getRatingStars = (rating?: number): string => {
  if (!rating) return ''
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  let stars = '★'.repeat(fullStars)
  if (hasHalf) stars += '☆'
  return stars
}

export const PlaceDetailsCard: React.FC<PlaceDetailsCardProps> = ({
  place,
  onClose,
  onGetDirections,
  onSave,
  userLocation
}) => {
  const handleGetDirections = useCallback(() => {
    if (place) {
      onGetDirections(place)
    }
  }, [place, onGetDirections])

  const handleSave = useCallback(() => {
    if (place && onSave) {
      onSave(place)
    }
  }, [place, onSave])

  const handleCall = useCallback(() => {
    // In a real implementation, this would use the place's phone number
    console.log('Call functionality not implemented yet')
  }, [])

  if (!place) return null

  // Calculate walking time estimate (average walking speed: 5 km/h)
  const walkingTime = place.distance ? Math.round(place.distance / 83.33) : null // 83.33 m/min

  return (
    <div className="place-details-card">
      <button 
        className="card-close"
        onClick={onClose}
        aria-label="Close details"
      >
        ×
      </button>

      <div className="place-header">
        <h3 className="place-name">{place.name}</h3>
        {place.rating && (
          <div className="place-rating">
            <span className="rating-stars">{getRatingStars(place.rating)}</span>
            <span className="rating-value">{place.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="place-info">
        <p className="place-address">{place.address}</p>
        
        <div className="place-meta">
          {place.distance && (
            <span className="place-distance">
              {formatDistance(place.distance)}
              {walkingTime && ` • ${walkingTime} min walk`}
            </span>
          )}
          
          {place.priceLevel && (
            <span className="place-price">{formatPriceLevel(place.priceLevel)}</span>
          )}
          
          {place.openNow !== undefined && (
            <span className={`place-status ${place.openNow ? 'open' : 'closed'}`}>
              {place.openNow ? 'Open' : 'Closed'}
            </span>
          )}
        </div>
      </div>

      <div className="place-actions">
        <button 
          className="action-button primary"
          onClick={handleGetDirections}
        >
          <span className="action-icon">🧭</span>
          <span className="action-label">Directions</span>
        </button>
        
        <button 
          className="action-button"
          onClick={handleCall}
        >
          <span className="action-icon">📞</span>
          <span className="action-label">Call</span>
        </button>
        
        {onSave && (
          <button 
            className="action-button"
            onClick={handleSave}
          >
            <span className="action-icon">⭐</span>
            <span className="action-label">Save</span>
          </button>
        )}
      </div>
    </div>
  )
}