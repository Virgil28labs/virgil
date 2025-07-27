import { memo, useState, useRef, useEffect } from 'react';
import { useWeather } from '../hooks/useWeather';
import { weatherService } from '../lib/weatherService';
import { Skeleton } from './ui/skeleton';
import { WeatherForecast } from './WeatherForecast';

/**
 * Weather Component
 * Displays current weather conditions in a minimalist style
 * Shows forecast on hover
 */
export const Weather = memo(function Weather() {
  const { data, forecast, loading, error, unit, toggleUnit, hasWeather } = useWeather();
  const [showForecast, setShowForecast] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (forecast && !hoverTimeoutRef.current) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowForecast(true);
      }, 500); // 500ms delay to prevent accidental hovers
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowForecast(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Always render the widget container to prevent mount/unmount flashing
  return (
    <div
      ref={componentRef}
      className={`weather-widget ${showForecast ? 'weather-widget-expanded' : ''}`}
      role="region"
      aria-label="Weather information"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loading && !hasWeather ? (
        // Initial loading state
        <div className="weather-content">
          <Skeleton className="w-32 h-6" />
        </div>
      ) : data ? (
        // Weather data available
        <div onClick={toggleUnit} title={`${data.condition.description} - Click to toggle unit`}>
          <div className="weather-content">
            <div className="weather-icon-group">
              <span className="weather-emoji" aria-hidden="true">
                {weatherService.getWeatherEmoji(data.condition.id || 0)}
              </span>
              <span className="weather-condition">
                {data.condition.main}
              </span>
            </div>
            <span className="weather-temp">
              {data.temperature}{unit === 'fahrenheit' ? '°F' : '°C'}
            </span>
            {data.airQuality && (
              <div className="weather-aqi">
                <span className="aqi-text">AQI</span>
                <span 
                  className="aqi-dot" 
                  style={{ backgroundColor: weatherService.getAQIColor(data.airQuality.aqi) }}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
      ) : error && !hasWeather ? (
        // Error state - show error message in development
        <div className="weather-content" title={`Weather error: ${error}`}>
          <span className="weather-emoji" aria-hidden="true">🌡️</span>
          <span className="weather-temp" style={{ opacity: 0.5 }}>
            {process.env.NODE_ENV === 'development' ? 'ERR' : '--°'}
          </span>
        </div>
      ) : (
        // Default state - show loading skeleton
        <div className="weather-content">
          <Skeleton className="w-32 h-6" />
        </div>
      )}

      {/* Forecast panel */}
      {showForecast && forecast && (
        <div className="weather-forecast-container">
          <WeatherForecast forecast={forecast} unit={unit} />
        </div>
      )}
    </div>
  );
});
