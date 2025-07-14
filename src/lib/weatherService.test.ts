import { weatherService } from './weatherService';
import { dedupeFetch } from './requestDeduplication';
import type { WeatherData } from '../types/weather.types';

// Mock dedupeFetch
jest.mock('./requestDeduplication');
const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>;

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error
};

describe('weatherService', () => {
  const mockWeatherData: WeatherData = {
    temperature: 72,
    feelsLike: 70,
    tempMin: 68,
    tempMax: 76,
    humidity: 45,
    pressure: 1013,
    windSpeed: 8,
    windDeg: 180,
    clouds: 20,
    visibility: 10000,
    condition: {
      id: 800,
      main: 'Clear',
      description: 'clear sky',
      icon: '01d'
    },
    sunrise: 1643000000,
    sunset: 1643040000,
    timezone: -28800,
    cityName: 'New York',
    country: 'US',
    timestamp: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    weatherService.clearCache();
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('getWeatherByCoordinates', () => {
    it('fetches weather data successfully', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      const result = await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      expect(result).toEqual(mockWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/weather/coordinates/40.7128/-74.006',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
    });

    it('uses cached data when available', async () => {
      // First call to populate cache
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      // Second call should use cache
      const result = await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      expect(result).toEqual(mockWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledTimes(1); // Only called once
      expect(console.log).toHaveBeenCalledWith('🌡️ [WeatherService] Using cached data');
    });

    it('refetches when cache expires', async () => {
      // First call
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      // Fast-forward time by 11 minutes
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);

      // Second call should refetch
      const updatedWeatherData = { ...mockWeatherData, temperature: 75 };
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: updatedWeatherData
        })
      } as Response);

      const result = await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      expect(result).toEqual(updatedWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledTimes(2);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('handles API errors with JSON response', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' })
      } as Response);

      await expect(weatherService.getWeatherByCoordinates(40.7128, -74.0060))
        .rejects.toThrow('Failed to fetch weather data');

      expect(console.error).toHaveBeenCalledWith(
        '🌡️ [WeatherService] API error response:',
        'Invalid API key'
      );
    });

    it('handles API errors with text response', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Internal Server Error'
      } as Response);

      await expect(weatherService.getWeatherByCoordinates(40.7128, -74.0060))
        .rejects.toThrow('Failed to fetch weather data');
    });

    it('handles API errors with no readable response', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON'); },
        text: async () => { throw new Error('Not text'); }
      } as Response);

      await expect(weatherService.getWeatherByCoordinates(40.7128, -74.0060))
        .rejects.toThrow('Failed to fetch weather data');
    });

    it('handles invalid response structure', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: false })
      } as Response);

      await expect(weatherService.getWeatherByCoordinates(40.7128, -74.0060))
        .rejects.toThrow('Failed to fetch weather data');
    });

    it('handles network errors', async () => {
      mockDedupeFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(weatherService.getWeatherByCoordinates(40.7128, -74.0060))
        .rejects.toThrow('Failed to fetch weather data');
    });
  });

  describe('getWeatherByCity', () => {
    it('fetches weather by city name', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      const result = await weatherService.getWeatherByCity('New York');

      expect(result).toEqual(mockWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/weather/city/New%20York',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('fetches weather by city and country', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      const result = await weatherService.getWeatherByCity('New York', 'US');

      expect(result).toEqual(mockWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/v1/weather/city/New%20York?country=US',
        expect.any(Object)
      );
    });

    it('uses city cache', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      await weatherService.getWeatherByCity('New York');
      
      // Second call should use cache
      const result = await weatherService.getWeatherByCity('New York');

      expect(result).toEqual(mockWeatherData);
      expect(mockDedupeFetch).toHaveBeenCalledTimes(1);
    });

    it('handles city API errors', async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      await expect(weatherService.getWeatherByCity('Unknown City'))
        .rejects.toThrow('Failed to fetch weather data');
    });
  });

  describe('convertTemperature', () => {
    it('converts Fahrenheit to Celsius', () => {
      expect(weatherService.convertTemperature(32, true)).toBe(0);
      expect(weatherService.convertTemperature(68, true)).toBe(20);
      expect(weatherService.convertTemperature(212, true)).toBe(100);
    });

    it('converts Celsius to Fahrenheit', () => {
      expect(weatherService.convertTemperature(0, false)).toBe(32);
      expect(weatherService.convertTemperature(20, false)).toBe(68);
      expect(weatherService.convertTemperature(100, false)).toBe(212);
    });

    it('rounds to nearest integer', () => {
      expect(weatherService.convertTemperature(70, true)).toBe(21); // 21.111... rounds to 21
      expect(weatherService.convertTemperature(22, false)).toBe(72); // 71.6 rounds to 72
    });
  });

  describe('getWeatherIconUrl', () => {
    it('returns correct icon URL', () => {
      expect(weatherService.getWeatherIconUrl('01d'))
        .toBe('https://openweathermap.org/img/wn/01d@2x.png');
      
      expect(weatherService.getWeatherIconUrl('10n'))
        .toBe('https://openweathermap.org/img/wn/10n@2x.png');
    });
  });

  describe('getWeatherEmoji', () => {
    it('returns correct emoji for weather conditions', () => {
      // Thunderstorm
      expect(weatherService.getWeatherEmoji(200)).toBe('⛈️');
      expect(weatherService.getWeatherEmoji(232)).toBe('⛈️');
      
      // Drizzle
      expect(weatherService.getWeatherEmoji(300)).toBe('🌦️');
      expect(weatherService.getWeatherEmoji(321)).toBe('🌦️');
      
      // Rain
      expect(weatherService.getWeatherEmoji(500)).toBe('🌧️');
      expect(weatherService.getWeatherEmoji(531)).toBe('🌧️');
      
      // Snow
      expect(weatherService.getWeatherEmoji(600)).toBe('❄️');
      expect(weatherService.getWeatherEmoji(622)).toBe('❄️');
      
      // Atmosphere
      expect(weatherService.getWeatherEmoji(701)).toBe('🌫️');
      expect(weatherService.getWeatherEmoji(781)).toBe('🌫️');
      
      // Clear
      expect(weatherService.getWeatherEmoji(800)).toBe('☀️');
      
      // Clouds
      expect(weatherService.getWeatherEmoji(801)).toBe('🌤️');
      expect(weatherService.getWeatherEmoji(802)).toBe('⛅');
      expect(weatherService.getWeatherEmoji(803)).toBe('☁️');
      expect(weatherService.getWeatherEmoji(804)).toBe('☁️');
      
      // Default
      expect(weatherService.getWeatherEmoji(900)).toBe('🌡️');
    });
  });

  describe('clearCache', () => {
    it('clears all cached data', async () => {
      // Populate cache
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      // Clear cache
      weatherService.clearCache();

      // Next call should fetch again
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockWeatherData
        })
      } as Response);

      await weatherService.getWeatherByCoordinates(40.7128, -74.0060);

      expect(mockDedupeFetch).toHaveBeenCalledTimes(2);
    });
  });
});