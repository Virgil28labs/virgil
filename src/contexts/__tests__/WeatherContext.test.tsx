/**
 * WeatherContext Tests
 * 
 * Tests the weather context provider including:
 * - Weather data fetching and caching
 * - Location-based weather requests (GPS vs IP)
 * - Forecast data handling
 * - Temperature unit conversion (F/C)
 * - Auto-refresh and cache validation
 * - Fallback weather handling
 * - Error handling and logging
 * - State management via reducer
 * - Context value memoization
 * - Cleanup and lifecycle management
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { WeatherProvider } from '../WeatherContext';
import { WeatherContext } from '../WeatherContextInstance';
import { weatherService } from '../../lib/weatherService';
import { logger } from '../../lib/logger';
import { timeService } from '../../services/TimeService';
import { useLocation } from '../../hooks/useLocation';
import { useContext } from 'react';
import type { WeatherContextType, WeatherData } from '../../types/weather.types';
import { createMockLocationContextValue } from '../../test-utils/mockTypes';

// Mock dependencies
jest.mock('../../lib/weatherService', () => ({
  weatherService: {
    getWeatherByCoordinates: jest.fn(),
    getForecastByCoordinates: jest.fn(),
    getWeatherByCity: jest.fn(),
    getForecastByCity: jest.fn(),
    convertTemperature: jest.fn(),
  },
}));
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));
jest.mock('../../hooks/useLocation');

const mockWeatherService = weatherService as jest.Mocked<typeof weatherService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

// Test component to access context
const TestComponent = () => {
  const context = useContext(WeatherContext);
  
  if (!context) {
    return <div>No context</div>;
  }

  const {
    data,
    forecast,
    loading,
    error,
    lastUpdated,
    unit,
    hasWeather,
    fetchWeather,
    toggleUnit,
    clearError,
  } = context;

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="has-weather">{hasWeather ? 'has-weather' : 'no-weather'}</div>
      <div data-testid="temperature">{data?.temperature || 'no-temperature'}</div>
      <div data-testid="location">{data?.cityName || 'no-location'}</div>
      <div data-testid="condition">{data?.condition?.main || 'no-condition'}</div>
      <div data-testid="forecast-count">{forecast?.forecasts?.length || 0}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="unit">{unit}</div>
      <div data-testid="last-updated">{lastUpdated || 'never'}</div>
      <button data-testid="fetch-weather" onClick={() => fetchWeather()}>
        Fetch Weather
      </button>
      <button data-testid="force-refresh" onClick={() => fetchWeather(true)}>
        Force Refresh
      </button>
      <button data-testid="toggle-unit" onClick={toggleUnit}>
        Toggle Unit
      </button>
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

// Mock data
const mockCoordinates = { 
  latitude: 40.7128, 
  longitude: -74.0060,
  accuracy: 10,
  timestamp: Date.now(),
};
const mockIpLocation = { 
  ip: '192.168.1.1',
  city: 'New York', 
  country: 'USA',
  lat: 40.7128,
  lon: -74.0060,
};

const mockWeatherData = {
  temperature: 72,
  feelsLike: 75,
  tempMin: 68,
  tempMax: 78,
  humidity: 65,
  pressure: 1013,
  windSpeed: 8.5,
  windDeg: 315,
  clouds: 0,
  visibility: 10000,
  condition: {
    id: 800,
    main: 'Clear',
    description: 'Clear sky',
    icon: '01d',
  },
  cityName: 'New York',
  country: 'US',
  timezone: -18000,
  sunrise: 1640995200000,
  sunset: 1641026800000,
  timestamp: Date.now(),
};

const mockForecastData = {
  cityName: 'New York',
  country: 'US',
  forecasts: [
    {
      date: '2024-01-01',
      tempMin: 65,
      tempMax: 75,
      condition: {
        id: 800,
        main: 'Clear',
        description: 'Sunny day',
        icon: '01d',
      },
      humidity: 60,
      windSpeed: 5.2,
    },
    {
      date: '2024-01-02',
      tempMin: 68,
      tempMax: 78,
      condition: {
        id: 802,
        main: 'Clouds',
        description: 'Partly cloudy',
        icon: '02d',
      },
      humidity: 65,
      windSpeed: 6.1,
    },
  ],
};

describe('WeatherContext', () => {
  const mockTimestamp = 1640995200000; // Fixed timestamp
  const mockCacheDuration = 600000; // 10 minutes

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockTimeService.getTimestamp.mockReturnValue(mockTimestamp);
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    mockWeatherService.getForecastByCoordinates.mockResolvedValue(mockForecastData);
    mockWeatherService.getWeatherByCity.mockResolvedValue(mockWeatherData);
    mockWeatherService.getForecastByCity.mockResolvedValue(mockForecastData);
    mockWeatherService.convertTemperature.mockImplementation((temp, toCelsius) => 
      toCelsius ? Math.round((temp - 32) * 5/9) : Math.round(temp * 9/5 + 32),
    );
    
    // Default location mock
    mockUseLocation.mockReturnValue(createMockLocationContextValue({
      coordinates: null,
      ipLocation: null,
      loading: false,
      error: null,
      hasLocation: false,
      hasGPSLocation: false,
      hasIpLocation: false,
      initialized: true,
      permissionStatus: 'prompt',
      address: null,
      lastUpdated: null,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should render children and provide context', () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('has-weather')).toHaveTextContent('no-weather');
      expect(screen.getByTestId('unit')).toHaveTextContent('fahrenheit');
      expect(screen.getByTestId('last-updated')).toHaveTextContent('never');
    });

    it('should initialize with correct default state', () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      expect(screen.getByTestId('temperature')).toHaveTextContent('no-temperature');
      expect(screen.getByTestId('location')).toHaveTextContent('no-location');
      expect(screen.getByTestId('forecast-count')).toHaveTextContent('0');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Weather fetching with GPS coordinates', () => {
    it('should fetch weather when GPS coordinates are available', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
          mockCoordinates.latitude,
          mockCoordinates.longitude,
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
        expect(screen.getByTestId('location')).toHaveTextContent('New York, NY');
        expect(screen.getByTestId('has-weather')).toHaveTextContent('has-weather');
      });
    });

    it('should fetch forecast data with GPS coordinates', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getForecastByCoordinates).toHaveBeenCalledWith(
          mockCoordinates.latitude,
          mockCoordinates.longitude,
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('forecast-count')).toHaveTextContent('2');
      });
    });

    it('should handle forecast fetch errors gracefully with GPS', async () => {
      const forecastError = new Error('Forecast service unavailable');
      mockWeatherService.getForecastByCoordinates.mockRejectedValue(forecastError);
      
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
      });

      // Weather should still work, forecast should be empty
      expect(screen.getByTestId('forecast-count')).toHaveTextContent('0');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch forecast',
        forecastError,
        {
          component: 'WeatherContext',
          action: 'fetchWeatherAndForecast',
          metadata: { locationSource: 'coordinates' },
        },
      );
    });
  });

  describe('Weather fetching with IP location', () => {
    it('should fetch weather when IP location is available', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: false,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith(
          mockIpLocation.city,
          mockIpLocation.country,
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
        expect(screen.getByTestId('location')).toHaveTextContent('New York, NY');
      });
    });

    it('should fetch forecast data with IP location', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: false,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getForecastByCity).toHaveBeenCalledWith(
          mockIpLocation.city,
          mockIpLocation.country,
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('forecast-count')).toHaveTextContent('2');
      });
    });

    it('should handle forecast fetch errors gracefully with IP location', async () => {
      const forecastError = new Error('Forecast API error');
      mockWeatherService.getForecastByCity.mockRejectedValue(forecastError);
      
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: false,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
      });

      expect(screen.getByTestId('forecast-count')).toHaveTextContent('0');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch forecast',
        forecastError,
        {
          component: 'WeatherContext',
          action: 'fetchWeatherAndForecast',
          metadata: { locationSource: 'ipLocation' },
        },
      );
    });

    it('should prefer GPS coordinates over IP location', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
          mockCoordinates.latitude,
          mockCoordinates.longitude,
        );
      });

      // Should not call city-based API when coordinates are available
      expect(mockWeatherService.getWeatherByCity).not.toHaveBeenCalled();
    });
  });

  describe('Fallback weather handling', () => {
    it('should fetch fallback weather when no location is available', async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: false,
        hasGPSLocation: false,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Manually trigger fetch weather
      act(() => {
        screen.getByTestId('fetch-weather').click();
      });

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
          37.7749, // Fallback location (San Francisco)
          -122.4194,
        );
      });
    });

    it('should handle fallback weather errors', async () => {
      const fallbackError = new Error('Fallback weather failed');
      mockWeatherService.getWeatherByCoordinates.mockRejectedValue(fallbackError);
      
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: false,
        hasGPSLocation: false,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      act(() => {
        screen.getByTestId('fetch-weather').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Weather service unavailable');
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch fallback weather',
        fallbackError,
        {
          component: 'WeatherContext',
          action: 'fetchFallbackWeather',
        },
      );
    });
  });

  describe('Temperature unit conversion', () => {
    beforeEach(async () => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));
    });

    it('should toggle temperature unit from Fahrenheit to Celsius', async () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
        expect(screen.getByTestId('unit')).toHaveTextContent('fahrenheit');
      });

      act(() => {
        screen.getByTestId('toggle-unit').click();
      });

      expect(screen.getByTestId('unit')).toHaveTextContent('celsius');
      // Temperature should be converted to Celsius
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(72, true);
    });

    it('should convert all temperature values when unit changes', async () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-weather')).toHaveTextContent('has-weather');
      });

      act(() => {
        screen.getByTestId('toggle-unit').click();
      });

      // Should convert all temperature fields
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(72, true); // temperature
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(75, true); // feelsLike
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(68, true); // tempMin
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(78, true); // tempMax
    });

    it('should convert forecast temperatures when unit changes', async () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('forecast-count')).toHaveTextContent('2');
      });

      act(() => {
        screen.getByTestId('toggle-unit').click();
      });

      // Should convert forecast temperatures
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(65, true); // forecast day 1 min
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(75, true); // forecast day 1 max
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(68, true); // forecast day 2 min
      expect(mockWeatherService.convertTemperature).toHaveBeenCalledWith(78, true); // forecast day 2 max
    });
  });

  describe('Caching and auto-refresh', () => {
    beforeEach(() => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));
    });

    it('should respect cache validity', async () => {
      const cacheTime = mockTimestamp;
      mockTimeService.getTimestamp
        .mockReturnValueOnce(cacheTime) // Initial lastUpdated
        .mockReturnValueOnce(cacheTime + 300000); // 5 minutes later (within cache)

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
      });

      // Manual fetch should not trigger new request due to cache
      act(() => {
        screen.getByTestId('fetch-weather').click();
      });

      // Should still be called only once due to cache
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
    });

    it('should fetch new data when cache expires', async () => {
      const cacheTime = mockTimestamp;
      mockTimeService.getTimestamp
        .mockReturnValueOnce(cacheTime) // Initial lastUpdated
        .mockReturnValueOnce(cacheTime + mockCacheDuration + 1000); // Beyond cache expiry

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
      });

      // Manual fetch should trigger new request as cache expired
      act(() => {
        screen.getByTestId('fetch-weather').click();
      });

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(2);
      });
    });

    it('should force refresh when requested', async () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
      });

      // Force refresh should ignore cache
      act(() => {
        screen.getByTestId('force-refresh').click();
      });

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(2);
      });
    });

    it('should setup auto-refresh interval', async () => {
      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by cache duration
      act(() => {
        jest.advanceTimersByTime(mockCacheDuration);
      });

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup interval on unmount', async () => {
      const { unmount } = render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));
    });

    it('should handle weather fetch errors', async () => {
      const weatherError = new Error('Weather API error');
      mockWeatherService.getWeatherByCoordinates.mockRejectedValue(weatherError);

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Weather API error');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockWeatherService.getWeatherByCoordinates.mockRejectedValue('String error');

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch weather');
      });
    });

    it('should clear errors', async () => {
      const weatherError = new Error('Weather API error');
      mockWeatherService.getWeatherByCoordinates.mockRejectedValue(weatherError);

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Weather API error');
      });

      act(() => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    it('should not fetch concurrently when already loading', async () => {
      let resolveWeatherPromise: (value: WeatherData) => void;
      const weatherPromise = new Promise<WeatherData>(resolve => {
        resolveWeatherPromise = resolve;
      });
      
      mockWeatherService.getWeatherByCoordinates.mockReturnValue(weatherPromise);

      render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Multiple fetches while first is loading
      act(() => {
        screen.getByTestId('fetch-weather').click();
        screen.getByTestId('fetch-weather').click();
        screen.getByTestId('fetch-weather').click();
      });

      // Should only make one request
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);

      // Resolve the promise
      act(() => {
        resolveWeatherPromise!(mockWeatherData);
      });
    });
  });

  describe('Context value memoization', () => {
    it('should memoize context value to prevent unnecessary re-renders', async () => {
      let renderCount = 0;
      const TestMemoization = () => {
        renderCount++;
        useContext(WeatherContext);
        return <div data-testid="render-count">{renderCount}</div>;
      };

      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      const { rerender } = render(
        <WeatherProvider>
          <TestMemoization />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('2'); // Initial + after weather loads
      });

      const renderCountAfterLoad = parseInt(screen.getByTestId('render-count').textContent || '0');

      // Re-render with same props
      rerender(
        <WeatherProvider>
          <TestMemoization />
        </WeatherProvider>,
      );

      // Should not have additional renders due to memoization
      expect(screen.getByTestId('render-count')).toHaveTextContent(renderCountAfterLoad.toString());
    });

    it('should update memoized value when weather data changes', async () => {
      const contextValues: WeatherContextType[] = [];
      const TestMemoization = () => {
        const context = useContext(WeatherContext);
        if (context) {
          contextValues.push(context);
        }
        return <div data-testid="temperature">{context?.data?.temperature || 'no-temperature'}</div>;
      };

      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      render(
        <WeatherProvider>
          <TestMemoization />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('temperature')).toHaveTextContent('72');
      });

      // Context values should be different objects when state changes
      expect(contextValues.length).toBeGreaterThan(1);
      expect(contextValues[0]).not.toBe(contextValues[contextValues.length - 1]);
    });
  });

  describe('Location changes', () => {
    it('should refetch weather when location changes from none to GPS', async () => {
      const { rerender } = render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      // Initially no location, should not fetch
      expect(mockWeatherService.getWeatherByCoordinates).not.toHaveBeenCalled();

      // Update to have GPS coordinates
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: false,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      rerender(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
          mockCoordinates.latitude,
          mockCoordinates.longitude,
        );
      });
    });

    it('should refetch weather when location changes from IP to GPS', async () => {
      // Start with IP location
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: null,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: false,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'denied',
        address: null,
        lastUpdated: null,
      }));

      const { rerender } = render(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCity).toHaveBeenCalledWith(
          mockIpLocation.city,
          mockIpLocation.country,
        );
      });

      // Update to have GPS coordinates
      mockUseLocation.mockReturnValue(createMockLocationContextValue({
        coordinates: mockCoordinates,
        ipLocation: mockIpLocation,
        loading: false,
        error: null,
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
        initialized: true,
        fetchLocationData: jest.fn() as any,
        requestLocationPermission: jest.fn() as any,
        retryGPSLocation: jest.fn() as any,
        clearError: jest.fn() as any,
        permissionStatus: 'granted',
        address: null,
        lastUpdated: null,
        locationSource: null,
        canRetryGPS: false,
        gpsRetrying: false,
        isPreciseLocation: false,
      }));

      rerender(
        <WeatherProvider>
          <TestComponent />
        </WeatherProvider>,
      );

      await waitFor(() => {
        expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(
          mockCoordinates.latitude,
          mockCoordinates.longitude,
        );
      });
    });
  });
});