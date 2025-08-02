import { memo, useState, useRef, useEffect } from 'react';
import { useWeather } from '../hooks/useWeather';
import { weatherService } from '../lib/weatherService';
import { Skeleton } from './ui/skeleton';
import { WeatherForecast } from './WeatherForecast';
import { HOVER_DELAY_MS } from '../constants/weather.constants';
import styles from './Dashboard.module.css';

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
      }, HOVER_DELAY_MS);
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
      className={styles.weatherWidget}
      data-raccoon-collision="weather-widget"
      style={showForecast ? { zIndex: 1000 } : undefined}
      role="region"
      aria-label="Weather information"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loading && !hasWeather ? (
        // Initial loading state
        <div className={styles.weatherContent}>
          <Skeleton className="w-32 h-6" />
        </div>
      ) : data ? (
        // Weather data available
        <div onClick={toggleUnit} title={`${data.condition.description} - Click to toggle unit`}>
          <div className={styles.weatherContent}>
            <div className={styles.weatherIconGroup}>
              <span className={styles.weatherEmoji} aria-hidden="true">
                {weatherService.getWeatherEmoji(data.condition.id || 0)}
              </span>
              <span className={styles.weatherCondition}>
                {data.condition.main}
              </span>
            </div>
            <span className={styles.weatherTemp}>
              {data.temperature}{unit === 'fahrenheit' ? '°F' : '°C'}
            </span>
            {data.airQuality && (
              <div className={styles.weatherAqi}>
                <span className={styles.aqiText}>AQI</span>
                <span 
                  className={styles.aqiDot} 
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
          <span className={styles.weatherEmoji} aria-hidden="true">🌡️</span>
          <span className="weather-temp" style={{ opacity: 0.5 }}>
            {process.env.NODE_ENV === 'development' ? 'ERR' : '--°'}
          </span>
        </div>
      ) : (
        // Default state - show loading skeleton
        <div className={styles.weatherContent}>
          <Skeleton className="w-32 h-6" />
        </div>
      )}

      {/* Forecast panel */}
      {showForecast && forecast && (
        <div className={styles.weatherForecastContainer}>
          <WeatherForecast forecast={forecast} unit={unit} />
        </div>
      )}
    </div>
  );
});
