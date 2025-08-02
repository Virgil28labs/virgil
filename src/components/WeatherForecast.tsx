import { memo } from 'react';
import { weatherService } from '../lib/weatherService';
import type { ForecastData } from '../types/weather.types';
import { timeService } from '../services/TimeService';
import styles from './Dashboard.module.css';

interface WeatherForecastProps {
  forecast: ForecastData;
  unit: 'celsius' | 'fahrenheit';
}

/**
 * WeatherForecast Component
 * Displays 5-day weather forecast in a minimal, elegant style
 */
export const WeatherForecast = memo(function WeatherForecast({
  forecast,
  unit,
}: WeatherForecastProps) {
  const formatDate = (dateString: string): string => {
    // Parse date string as local date (not UTC)
    // dateString format: "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-').map(Number);
    const date = timeService.createDate(year, month - 1, day); // month is 0-indexed
    // Always return 3-letter day abbreviation in uppercase
    return timeService.formatDateToLocal(date, { weekday: 'short' }).toUpperCase();
  };

  const getWeatherEmoji = (conditionId?: number): string => {
    if (!conditionId) {
      // Fallback based on condition main
      return '🌤️';
    }
    return weatherService.getWeatherEmoji(conditionId);
  };

  return (
    <div className={styles.weatherForecast}>
      <div className={styles.forecastHeader}>
        <span className={styles.forecastTitle}>5-Day Forecast</span>
        <span className={styles.forecastLocation}>{forecast.cityName}</span>
      </div>

      <div className={styles.forecastDays}>
        {forecast.forecasts.map((day) => (
          <div key={day.date} className={styles.forecastDay}>
            <div className={styles.forecastDayName}>{formatDate(day.date)}</div>
            <div className={styles.forecastIcon}>
              {getWeatherEmoji(day.condition.id)}
            </div>
            <div className={styles.forecastTemps}>
              <span className={styles.forecastTempHigh}>
                {day.tempMax}°{unit === 'fahrenheit' ? 'F' : 'C'}
              </span>
              <span className={styles.forecastTempLow}>
                {day.tempMin}°{unit === 'fahrenheit' ? 'F' : 'C'}
              </span>
            </div>
            <div className={styles.forecastCondition}>
              {day.condition.main}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
