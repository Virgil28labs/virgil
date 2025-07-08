import { memo } from 'react';
import { useWeather } from '../contexts/WeatherContext';
import { weatherService } from '../lib/weatherService';
import { SkeletonLoader } from './SkeletonLoader';

/**
 * Weather Component
 * Displays current weather conditions in a minimalist style
 */
export const Weather = memo(function Weather() {
  const { data, loading, error, unit, toggleUnit, hasWeather } = useWeather();

  // Always render the widget container to prevent mount/unmount flashing
  return (
    <div 
      className="weather-widget" 
      role="region" 
      aria-label="Weather information"
    >
      {loading && !hasWeather ? (
        // Initial loading state
        <div className="weather-content">
          <SkeletonLoader width="120px" height="24px" />
        </div>
      ) : data ? (
        // Weather data available
        <div onClick={toggleUnit} title={`${data.condition.description} - Click to toggle unit`}>
          <div className="weather-content">
            <span className="weather-emoji" aria-hidden="true">
              {weatherService.getWeatherEmoji(data.condition.id)}
            </span>
            <span className="weather-temp">
              {data.temperature}{unit === 'fahrenheit' ? '°F' : '°C'}
            </span>
            <span className="weather-condition">
              {data.condition.main}
            </span>
          </div>
          <div className="weather-details" aria-label="Additional weather details">
            <span className="weather-location">{data.cityName}</span>
            <span className="weather-feels-like">
              Feels like {data.feelsLike}{unit === 'fahrenheit' ? '°F' : '°C'}
            </span>
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
      ) : null}
    </div>
  );
});

