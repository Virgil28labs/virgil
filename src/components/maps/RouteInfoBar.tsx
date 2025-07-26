import React, { memo } from 'react';
import { DepartureTimeSelector } from './DepartureTimeSelector';
import './maps.css';

interface RouteInfoBarProps {
  route: google.maps.DirectionsRoute | null
  alternativeRoutes?: google.maps.DirectionsRoute[]
  onRouteSelect?: (routeIndex: number) => void
  selectedRouteIndex?: number
  isExpanded?: boolean
  onToggleExpand?: () => void
  onClose?: () => void
  departureTime?: Date | 'now'
  onDepartureTimeChange?: (time: Date | 'now') => void
}

export const RouteInfoBar = memo(function RouteInfoBar({
  route,
  alternativeRoutes = [],
  onRouteSelect,
  selectedRouteIndex = 0,
  isExpanded = true,
  onToggleExpand,
  onClose,
  departureTime = 'now',
  onDepartureTimeChange,
}: RouteInfoBarProps) {
  if (!route) return null;

  const leg = route.legs[0];
  if (!leg) return null;

  // Get traffic-aware duration if available
  const duration = leg.duration_in_traffic || leg.duration;
  const distance = leg.distance;

  // Calculate traffic severity (comparing normal duration to traffic duration)
  const getTrafficSeverity = () => {
    if (!leg.duration || !leg.duration_in_traffic) return 'normal';

    const normalTime = leg.duration.value;
    const trafficTime = leg.duration_in_traffic.value;
    const ratio = trafficTime / normalTime;

    if (ratio > 1.5) return 'heavy';
    if (ratio > 1.2) return 'moderate';
    return 'light';
  };

  const trafficSeverity = getTrafficSeverity();

  // Format duration for display
  const formatDuration = (dur: google.maps.Duration | undefined) => {
    if (!dur) return '--';

    const totalMinutes = Math.round(dur.value / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hr ${minutes} min`;
  };

  // Get traffic color based on severity
  const getTrafficColor = (severity: string) => {
    switch (severity) {
      case 'heavy': return '#EA4335';
      case 'moderate': return '#FBBC04';
      case 'light': return '#34A853';
      default: return '#4285F4';
    }
  };

  return (
    <div className={`route-info-bar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Main info row with grid layout */}
      <div className="route-info-grid">
        {/* Time and distance section */}
        <div className="route-metrics">
          <div className="route-time">
            <span className="time-value" style={{ color: getTrafficColor(trafficSeverity) }}>
              {formatDuration(duration)}
            </span>
            {leg.duration_in_traffic && leg.duration && isExpanded && (
              <span className="time-comparison">
                (typically {formatDuration(leg.duration)})
              </span>
            )}
          </div>
          <div className="route-distance">
            <span className="distance-value">{distance?.text || '--'}</span>
          </div>
        </div>

        {/* Departure time selector - moved after metrics */}
        {onDepartureTimeChange && (
          <div className="departure-section">
            <DepartureTimeSelector
              selectedTime={departureTime}
              onTimeChange={onDepartureTimeChange}
              isCompact={!isExpanded}
            />
          </div>
        )}

        {/* Traffic status - pushed to right */}
        <div className="traffic-section">
          <div className={`traffic-icon ${trafficSeverity}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="8" y="2" width="4" height="5" rx="1" fill={trafficSeverity === 'light' ? 'currentColor' : '#ccc'} />
              <rect x="8" y="8" width="4" height="4" rx="1" fill={trafficSeverity === 'moderate' ? 'currentColor' : '#ccc'} />
              <rect x="8" y="13" width="4" height="5" rx="1" fill={trafficSeverity === 'heavy' ? 'currentColor' : '#ccc'} />
            </svg>
          </div>
          {isExpanded && (
            <span className="traffic-label">
              {trafficSeverity === 'heavy' ? 'Heavy traffic' :
                trafficSeverity === 'moderate' ? 'Moderate traffic' :
                  'Light traffic'}
            </span>
          )}
        </div>

        {/* Control buttons */}
        <div className="route-controls">
          {onToggleExpand && alternativeRoutes.length > 0 && (
            <button
              className="expand-toggle-btn"
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d={isExpanded ? 'M4 6L8 10L12 6' : 'M4 10L8 6L12 10'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              className="close-btn"
              onClick={onClose}
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M4 12L12 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isExpanded && alternativeRoutes.length > 0 && (
        <div className="alternative-routes">
          <div className="routes-header">Routes</div>
          <div className="routes-list">
            {[route, ...alternativeRoutes].slice(0, 3).map((r, index) => {
              const routeLeg = r.legs[0];
              const routeDuration = routeLeg.duration_in_traffic || routeLeg.duration;

              return (
                <button
                  key={index}
                  className={`route-option ${index === selectedRouteIndex ? 'selected' : ''}`}
                  onClick={() => onRouteSelect?.(index)}
                >
                  <div className="route-name">{r.summary}</div>
                  <div className="route-time">{formatDuration(routeDuration)}</div>
                  {index === 0 && <span className="fastest-badge">Fastest</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="route-summary">
        via {route.summary}
      </div>
    </div>
  );
});
