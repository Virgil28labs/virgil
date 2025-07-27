import type { WeatherData, ForecastData } from '../types/weather.types';
import { dedupeFetch } from './requestDeduplication';
import { retryWithBackoff } from './retryUtils';
import { timeService } from '../services/TimeService';
import { logger } from './logger';
import { 
  WEATHER_CACHE_DURATION, 
  API_RETRY_CONFIG,
  WEATHER_EMOJI_MAP,
  WEATHER_CONDITION_RANGES,
  AQI_COLORS,
  AQI_DESCRIPTIONS,
} from '../constants/weather.constants';

const BACKEND_API_BASE = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';

class WeatherService {
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private forecastCache: Map<string, { data: ForecastData; timestamp: number }> = new Map();

  constructor() {}

  /**
   * Get weather data by coordinates
   */
  async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `weather-${lat.toFixed(2)}-${lon.toFixed(2)}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && timeService.getTimestamp() - cached.timestamp < WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    const apiUrl = `${BACKEND_API_BASE}/weather?lat=${lat}&lon=${lon}`;

    try {
      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            let errorText = 'Unknown error';
            try {
              const errorData = await res.json();
              errorText = errorData.error || errorData.message || `HTTP ${res.status}`;
            } catch {
              errorText = await res.text().catch(() => `HTTP ${res.status}`);
            }
            throw new Error(errorText);
          }

          return res;
        },
        {
          ...API_RETRY_CONFIG,
          onRetry: () => {
            // Retry silently
          },
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid weather response');
      }

      const weatherData = result.data;

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: timeService.getTimestamp(),
      });

      return weatherData;
    } catch (error) {
      logger.error('Failed to fetch weather data by coordinates', error as Error, {
        component: 'WeatherService',
        action: 'getWeatherByCoordinates',
        metadata: { lat, lon },
      });
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get weather data by city name
   */
  async getWeatherByCity(city: string, country?: string): Promise<WeatherData> {
    const location = country ? `${city},${country}` : city;
    const cacheKey = `weather-city-${location.toLowerCase()}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && timeService.getTimestamp() - cached.timestamp < WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({ city });
      if (country) {
        params.append('country', country);
      }

      const url = `${BACKEND_API_BASE}/weather?${params.toString()}`;

      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            let errorText = 'Unknown error';
            try {
              const errorData = await res.json();
              errorText = errorData.error || errorData.message || `HTTP ${res.status}`;
            } catch {
              errorText = await res.text().catch(() => `HTTP ${res.status}`);
            }
            throw new Error(errorText);
          }

          return res;
        },
        {
          ...API_RETRY_CONFIG,
          onRetry: () => {
            // Retry silently
          },
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid weather response');
      }

      const weatherData = result.data;

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: timeService.getTimestamp(),
      });

      return weatherData;
    } catch (error) {
      logger.error('Failed to fetch weather data by city', error as Error, {
        component: 'WeatherService',
        action: 'getWeatherByCity',
        metadata: { city, country },
      });
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get weather forecast by coordinates
   */
  async getForecastByCoordinates(lat: number, lon: number): Promise<ForecastData> {
    const cacheKey = `forecast-${lat.toFixed(2)}-${lon.toFixed(2)}`;

    // Check cache first
    const cached = this.forecastCache.get(cacheKey);
    if (cached && timeService.getTimestamp() - cached.timestamp < WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    const apiUrl = `${BACKEND_API_BASE}/weather/forecast?lat=${lat}&lon=${lon}`;

    try {
      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            let errorText = 'Unknown error';
            try {
              const errorData = await res.json();
              errorText = errorData.error || errorData.message || `HTTP ${res.status}`;
            } catch {
              errorText = await res.text().catch(() => `HTTP ${res.status}`);
            }
            throw new Error(errorText);
          }

          return res;
        },
        {
          ...API_RETRY_CONFIG,
          onRetry: () => {
            // Retry silently
          },
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid forecast response');
      }

      const forecastData = result.data;

      // Cache the result
      this.forecastCache.set(cacheKey, {
        data: forecastData,
        timestamp: timeService.getTimestamp(),
      });

      return forecastData;
    } catch (error) {
      logger.error('Failed to fetch forecast data by coordinates', error as Error, {
        component: 'WeatherService',
        action: 'getForecastByCoordinates',
        metadata: { lat, lon },
      });
      throw new Error('Failed to fetch forecast data');
    }
  }

  /**
   * Get weather forecast by city name
   */
  async getForecastByCity(city: string, country?: string): Promise<ForecastData> {
    const location = country ? `${city},${country}` : city;
    const cacheKey = `forecast-city-${location.toLowerCase()}`;

    // Check cache first
    const cached = this.forecastCache.get(cacheKey);
    if (cached && timeService.getTimestamp() - cached.timestamp < WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({ city });
      if (country) {
        params.append('country', country);
      }

      const url = `${BACKEND_API_BASE}/weather/forecast?${params.toString()}`;

      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          if (!res.ok) {
            let errorText = 'Unknown error';
            try {
              const errorData = await res.json();
              errorText = errorData.error || errorData.message || `HTTP ${res.status}`;
            } catch {
              errorText = await res.text().catch(() => `HTTP ${res.status}`);
            }
            throw new Error(errorText);
          }

          return res;
        },
        {
          ...API_RETRY_CONFIG,
          onRetry: () => {
            // Retry silently
          },
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid forecast response');
      }

      const forecastData = result.data;

      // Cache the result
      this.forecastCache.set(cacheKey, {
        data: forecastData,
        timestamp: timeService.getTimestamp(),
      });

      return forecastData;
    } catch (error) {
      logger.error('Failed to fetch forecast data by city', error as Error, {
        component: 'WeatherService',
        action: 'getForecastByCity',
        metadata: { city, country },
      });
      throw new Error('Failed to fetch forecast data');
    }
  }

  /**
   * Convert temperature between Celsius and Fahrenheit
   */
  convertTemperature(temp: number, toCelsius: boolean): number {
    if (toCelsius) {
      return Math.round((temp - 32) * 5 / 9);
    } else {
      return Math.round(temp * 9 / 5 + 32);
    }
  }

  /**
   * Get weather icon URL
   */
  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * Get weather emoji based on condition
   */
  getWeatherEmoji(conditionId: number): string {
    // Check each weather condition range
    for (const [conditionType, range] of Object.entries(WEATHER_CONDITION_RANGES)) {
      if (conditionId >= range.min && conditionId <= range.max) {
        switch (conditionType) {
          case 'thunderstorm': return WEATHER_EMOJI_MAP.thunderstorm;
          case 'drizzle': return WEATHER_EMOJI_MAP.drizzle;
          case 'rain': return WEATHER_EMOJI_MAP.rain;
          case 'snow': return WEATHER_EMOJI_MAP.snow;
          case 'atmosphere': return WEATHER_EMOJI_MAP.atmosphere;
          case 'clear': return WEATHER_EMOJI_MAP.clear;
          case 'fewClouds': return WEATHER_EMOJI_MAP['few-clouds'];
          case 'scatteredClouds': return WEATHER_EMOJI_MAP['scattered-clouds'];
          case 'clouds': return WEATHER_EMOJI_MAP.clouds;
        }
      }
    }
    return WEATHER_EMOJI_MAP.default;
  }


  /**
   * Get AQI color based on level
   */
  getAQIColor(aqi: number): string {
    return AQI_COLORS[aqi] || '#6b7280'; // gray for unknown
  }

  /**
   * Get AQI description
   */
  getAQIDescription(aqi: number): string {
    return AQI_DESCRIPTIONS[aqi] || 'Unknown';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.forecastCache.clear();
  }
}

export const weatherService = new WeatherService();
