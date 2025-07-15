import type { WeatherData } from '../types/weather.types';
import { dedupeFetch } from './requestDeduplication';
import { retryWithBackoff } from './retryUtils';

const BACKEND_API_BASE = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class WeatherService {
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();

  constructor() {}

  /**
   * Get weather data by coordinates
   */
  async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `weather-${lat.toFixed(2)}-${lon.toFixed(2)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const apiUrl = `${BACKEND_API_BASE}/weather/coordinates/${lat}/${lon}`;

    try {
      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000
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
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (_attempt, _error) => {
            // Retry silently
          }
        }
      );

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid weather response');
      }

      const weatherData = result.data;

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (_error: any) {
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
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const url = country 
        ? `${BACKEND_API_BASE}/weather/city/${encodeURIComponent(city)}?country=${encodeURIComponent(country)}`
        : `${BACKEND_API_BASE}/weather/city/${encodeURIComponent(city)}`;
        
      const response = await dedupeFetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid weather response');
      }

      const weatherData = result.data;

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (_error: any) {
      throw new Error('Failed to fetch weather data');
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
    if (conditionId >= 200 && conditionId < 300) return '⛈️'; // Thunderstorm
    if (conditionId >= 300 && conditionId < 400) return '🌦️'; // Drizzle
    if (conditionId >= 500 && conditionId < 600) return '🌧️'; // Rain
    if (conditionId >= 600 && conditionId < 700) return '❄️'; // Snow
    if (conditionId >= 700 && conditionId < 800) return '🌫️'; // Atmosphere
    if (conditionId === 800) return '☀️'; // Clear
    if (conditionId === 801) return '🌤️'; // Few clouds
    if (conditionId === 802) return '⛅'; // Scattered clouds
    if (conditionId === 803 || conditionId === 804) return '☁️'; // Broken/Overcast clouds
    return '🌡️'; // Default
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const weatherService = new WeatherService();