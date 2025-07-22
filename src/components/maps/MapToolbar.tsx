import React, { useState, useCallback } from 'react'
import './MapToolbar.css'

interface MapToolbarProps {
  onToggleTraffic: (show: boolean) => void
  onToggleMeasure: (active: boolean) => void
  onLayerChange?: (layer: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => void
  initialTrafficState?: boolean
  measureActive?: boolean
  currentLayer?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ 
  onToggleTraffic,
  onToggleMeasure,
  onLayerChange,
  initialTrafficState = false,
  measureActive = false,
  currentLayer = 'roadmap'
}) => {
  const [showTraffic, setShowTraffic] = useState(initialTrafficState)
  const [showLayerMenu, setShowLayerMenu] = useState(false)

  const handleToggleTraffic = useCallback(() => {
    const newState = !showTraffic
    setShowTraffic(newState)
    onToggleTraffic(newState)
  }, [showTraffic, onToggleTraffic])

  const handleToggleMeasure = useCallback(() => {
    onToggleMeasure(!measureActive)
  }, [measureActive, onToggleMeasure])

  const handleLayerChange = useCallback((layer: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    if (onLayerChange) {
      onLayerChange(layer)
    }
    setShowLayerMenu(false)
  }, [onLayerChange])

  return (
    <div className="map-toolbar">
      {/* Measure Distance Tool */}
      <button
        className={`toolbar-button ${measureActive ? 'active' : ''}`}
        onClick={handleToggleMeasure}
        title="Measure distance"
        aria-label="Toggle distance measurement"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M1 10h18M10 1v18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="5" cy="10" r="2" fill="currentColor" />
          <circle cx="15" cy="10" r="2" fill="currentColor" />
        </svg>
      </button>

      {/* Traffic Toggle */}
      <button
        className={`toolbar-button ${showTraffic ? 'active' : ''}`}
        onClick={handleToggleTraffic}
        title={showTraffic ? 'Hide traffic' : 'Show traffic'}
        aria-label={showTraffic ? 'Hide traffic layer' : 'Show traffic layer'}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="8" y="2" width="4" height="6" rx="1" fill="currentColor" />
          <rect x="8" y="9" width="4" height="3" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="8" y="13" width="4" height="5" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
      </button>

      {/* Layer Selector */}
      {onLayerChange && (
        <div className="layer-selector">
          <button
            className="toolbar-button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Map layers"
            aria-label="Change map layer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L2 7l8 5 8-5-8-5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M2 13l8 5 8-5M2 10l8 5 8-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
            </svg>
          </button>
          
          {showLayerMenu && (
            <div className="layer-menu">
              <button
                className={`layer-option ${currentLayer === 'roadmap' ? 'active' : ''}`}
                onClick={() => handleLayerChange('roadmap')}
              >
                <span className="layer-icon">🗺️</span>
                <span className="layer-label">Map</span>
              </button>
              <button
                className={`layer-option ${currentLayer === 'satellite' ? 'active' : ''}`}
                onClick={() => handleLayerChange('satellite')}
              >
                <span className="layer-icon">🛰️</span>
                <span className="layer-label">Satellite</span>
              </button>
              <button
                className={`layer-option ${currentLayer === 'hybrid' ? 'active' : ''}`}
                onClick={() => handleLayerChange('hybrid')}
              >
                <span className="layer-icon">🏙️</span>
                <span className="layer-label">Hybrid</span>
              </button>
              <button
                className={`layer-option ${currentLayer === 'terrain' ? 'active' : ''}`}
                onClick={() => handleLayerChange('terrain')}
              >
                <span className="layer-icon">⛰️</span>
                <span className="layer-label">Terrain</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}