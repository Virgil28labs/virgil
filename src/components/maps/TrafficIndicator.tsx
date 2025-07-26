import React, { useState, useEffect, useCallback, memo } from 'react';
import { timeService } from '../../services/TimeService';
import './maps.css';

interface TrafficIndicatorProps {
  map: google.maps.Map | null
  isTrafficEnabled: boolean
  onToggleTraffic: (enabled: boolean) => void
}

type TrafficLevel = 'light' | 'moderate' | 'heavy' | 'unknown'

export const TrafficIndicator = memo(function TrafficIndicator({
  map,
  isTrafficEnabled,
  onToggleTraffic,
}: TrafficIndicatorProps) {
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('unknown');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Simulate traffic level detection (in a real app, this would use actual traffic data)
  useEffect(() => {
    if (!map || !isTrafficEnabled) {
      setTrafficLevel('unknown');
      return;
    }
    
    // In a real implementation, you would analyze traffic data from the map
    // For now, we'll simulate it based on time of day
    const updateTrafficLevel = () => {
      const hour = timeService.getHours(timeService.getCurrentDateTime());
      
      // Rush hour patterns
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        setTrafficLevel('heavy');
      } else if ((hour >= 6 && hour <= 7) || (hour >= 9 && hour <= 10) || 
                 (hour >= 16 && hour <= 17) || (hour >= 19 && hour <= 20)) {
        setTrafficLevel('moderate');
      } else if (hour >= 22 || hour <= 5) {
        setTrafficLevel('light');
      } else {
        setTrafficLevel('moderate');
      }
    };
    
    updateTrafficLevel();
    const interval = setInterval(updateTrafficLevel, 300000); // Update every 5 minutes
    
    return () => clearInterval(interval);
  }, [map, isTrafficEnabled]);
  
  const handleToggle = useCallback(() => {
    setIsAnimating(true);
    onToggleTraffic(!isTrafficEnabled);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }, [isTrafficEnabled, onToggleTraffic]);
  
  const getTrafficColor = () => {
    if (!isTrafficEnabled) return '#999';
    
    switch (trafficLevel) {
      case 'light':
        return '#4CAF50';
      case 'moderate':
        return '#FFA726';
      case 'heavy':
        return '#F44336';
      default:
        return '#999';
    }
  };
  
  const getTrafficLabel = () => {
    if (!isTrafficEnabled) return 'Traffic Off';
    
    switch (trafficLevel) {
      case 'light':
        return 'Light Traffic';
      case 'moderate':
        return 'Moderate Traffic';
      case 'heavy':
        return 'Heavy Traffic';
      default:
        return 'Traffic';
    }
  };
  
  const getTrafficIcon = () => {
    if (isTrafficEnabled) {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path 
            d="M10 2C6 2 3 5 3 9c0 5.25 7 11 7 11s7-5.75 7-11c0-4-3-7-7-7z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle 
            cx="10" 
            cy="9" 
            r="2.5" 
            fill="currentColor"
            className="traffic-pulse"
          />
        </svg>
      );
    } else {
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path 
            d="M10 2C6 2 3 5 3 9c0 5.25 7 11 7 11s7-5.75 7-11c0-4-3-7-7-7z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M7 7l6 6M13 7l-6 6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      );
    }
  };

  return (
    <button
      className={`traffic-indicator ${isTrafficEnabled ? 'enabled' : 'disabled'} ${isAnimating ? 'animating' : ''}`}
      onClick={handleToggle}
      style={{ '--traffic-color': getTrafficColor() } as React.CSSProperties}
      title={getTrafficLabel()}
    >
      <div className="traffic-icon-wrapper">
        {getTrafficIcon()}
        {isTrafficEnabled && trafficLevel !== 'unknown' && (
          <div className="traffic-status-dot" />
        )}
      </div>
      <span className="traffic-label">{getTrafficLabel()}</span>
    </button>
  );
});