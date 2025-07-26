import { memo } from 'react';
import { weatherService } from '../lib/weatherService';
import type { ForecastData } from '../types/weather.types';
import { timeService } from '../services/TimeService';

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
    <div className="weather-forecast">
      <div className="forecast-header">
        <span className="forecast-title">5-Day Forecast</span>
        <span className="forecast-location">{forecast.cityName}</span>
      </div>

      <div className="forecast-days">
        {forecast.forecasts.map((day) => (
          <div key={day.date} className="forecast-day">
            <div className="forecast-day-name">{formatDate(day.date)}</div>
            <div className="forecast-icon">
              {getWeatherEmoji(day.condition.id)}
            </div>
            <div className="forecast-temps">
              <span className="forecast-temp-high">
                {day.tempMax}°
              </span>
              <span className="forecast-temp-low">
                {day.tempMin}°
              </span>
            </div>
            <div className="forecast-condition">
              {day.condition.main}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
