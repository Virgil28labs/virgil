import React from 'react'
import './DistanceOverlay.css'

interface DistanceOverlayProps {
  distance: number // in meters
  walkingTime?: number // in minutes
  drivingTime?: number // in minutes
  transitTime?: number // in minutes
  onClose?: () => void
}

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export const DistanceOverlay: React.FC<DistanceOverlayProps> = ({
  distance,
  walkingTime,
  drivingTime,
  transitTime,
  onClose
}) => {
  return (
    <div className="distance-overlay">
      <div className="distance-header">
        <h3 className="distance-value">{formatDistance(distance)}</h3>
        {onClose && (
          <button 
            className="overlay-close"
            onClick={onClose}
            aria-label="Close distance overlay"
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
        )}
      </div>
      
      <div className="travel-times">
        {walkingTime && (
          <div className="travel-mode">
            <div className="mode-icon walking">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM6 6l1 3 2-1v6M6 6L5 9l2 1M10 7l1 2-2 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="mode-time">{formatTime(walkingTime)}</span>
          </div>
        )}
        
        {drivingTime && (
          <div className="travel-mode">
            <div className="mode-icon driving">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 10h10M4 13h8M5 7h6l1 3H4l1-3zM5 7L6 4h4l1 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="mode-time">{formatTime(drivingTime)}</span>
          </div>
        )}
        
        {transitTime && (
          <div className="travel-mode">
            <div className="mode-icon transit">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect 
                  x="3" 
                  y="2" 
                  width="10" 
                  height="10" 
                  rx="1" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                />
                <path
                  d="M3 8h10M6 12v2M10 12v2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="mode-time">{formatTime(transitTime)}</span>
          </div>
        )}
      </div>
    </div>
  )
}