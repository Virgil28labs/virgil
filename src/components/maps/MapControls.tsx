import React, { useState, useCallback } from 'react'
import './MapControls.css'

interface MapControlsProps {
  onToggleTraffic: (show: boolean) => void
  initialTrafficState?: boolean
}

export const MapControls: React.FC<MapControlsProps> = ({ 
  onToggleTraffic,
  initialTrafficState = false
}) => {
  const [showTraffic, setShowTraffic] = useState(initialTrafficState)

  const handleToggleTraffic = useCallback(() => {
    const newState = !showTraffic
    setShowTraffic(newState)
    onToggleTraffic(newState)
  }, [showTraffic, onToggleTraffic])

  return (
    <div className="map-controls">
      <button
        className={`control-button traffic-toggle ${showTraffic ? 'active' : ''}`}
        onClick={handleToggleTraffic}
        title={showTraffic ? 'Hide traffic' : 'Show traffic'}
        aria-label={showTraffic ? 'Hide traffic layer' : 'Show traffic layer'}
      >
        <span className="control-icon">🚦</span>
        <span className="control-label">Traffic</span>
      </button>
    </div>
  )
}