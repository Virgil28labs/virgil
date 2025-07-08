import type { WeatherData } from '../types/weather.types';
import { dedupeFetch } from './requestDeduplication';

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
    
    console.log('🌡️ [WeatherService] getWeatherByCoordinates called', { lat, lon, cacheKey });
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🌡️ [WeatherService] Using cached data');
      return cached.data;
    }

    const apiUrl = `${BACKEND_API_BASE}/weather/coordinates/${lat}/${lon}`;
    console.log('🌡️ [WeatherService] Making API request to:', apiUrl);

    try {
      const response = await dedupeFetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('🌡️ [WeatherService] API response status:', response.status);

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorText = await response.text().catch(() => `HTTP ${response.status}`);
        }
        console.error('🌡️ [WeatherService] API error response:', errorText);
        throw new Error(`Weather API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('🌡️ [WeatherService] API response data:', result);
      
      if (!result.success || !result.data) {
        console.error('🌡️ [WeatherService] Invalid response structure:', result);
        throw new Error('Invalid weather response');
      }

      const weatherData = result.data;
      console.log('🌡️ [WeatherService] Parsed weather data:', weatherData);

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error: any) {
      console.error('Weather fetch error:', error);
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
    } catch (error: any) {
      console.error('Weather fetch error:', error);
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