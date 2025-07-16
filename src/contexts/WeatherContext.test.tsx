import React from 'react';
import { render } from '@testing-library/react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WeatherProvider, useWeather } from './WeatherContext';
import { LocationContext } from './LocationContext';
import { weatherService } from '../lib/weatherService';
import type { LocationContextType } from '../types/location.types';
import type { WeatherData } from '../types/weather.types';

// Mock the weather service completely
jest.mock('../lib/weatherService', () => ({
  weatherService: {
    getWeatherByCoordinates: jest.fn(),
    getWeatherByCity: jest.fn(),
    convertTemperature: jest.fn((temp: number, toCelsius: boolean) => {
      return toCelsius ? Math.round((temp - 32) * 5/9) : temp;
    })
  }
}));

const mockWeatherService = weatherService as jest.Mocked<typeof weatherService>;

// Mock weather data
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

const mockLocationContext: LocationContextType = {
  coordinates: { latitude: 40.7128, longitude: -74.0060 },
  address: null,
  ipLocation: { city: 'New York', region: 'NY', country: 'US', timezone: 'America/New_York' },
  loading: false,
  error: null,
  permissionStatus: 'granted',
  lastUpdated: Date.now(),
  hasLocation: true,
  refresh: jest.fn(),
  clearError: jest.fn()
};

// Wrapper component for the hook
const wrapper = ({ children, locationValue = mockLocationContext }: { 
  children: React.ReactNode;
  locationValue?: LocationContextType;
}) => (
  <LocationContext.Provider value={locationValue}>
    <WeatherProvider>{children}</WeatherProvider>
  </LocationContext.Provider>
);

describe('WeatherContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('throws error when useWeather is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const TestComponent = () => {
      useWeather();
      return null;
    };
    
    expect(() => render(<TestComponent />)).toThrow(
      'useWeather must be used within a WeatherProvider'
    );
    
    consoleSpy.mockRestore();
  });

  it('provides initial state', async () => {
    const noLocationContext: LocationContextType = {
      ...mockLocationContext,
      coordinates: null,
      ipLocation: null,
      hasLocation: false
    };
    
    const { result } = renderHook(() => useWeather(), {
      wrapper: ({ children }) => wrapper({ children, locationValue: noLocationContext })
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.unit).toBe('fahrenheit');
    expect(result.current.hasWeather).toBe(false);
  });

  it('fetches weather when location is available', async () => {
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockWeatherData);
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasWeather).toBe(true);
    expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(40.7128, -74.0060);
  });

  it('does not fetch weather when location is not available', async () => {
    const noLocationContext: LocationContextType = {
      ...mockLocationContext,
      coordinates: null,
      ipLocation: null,
      hasLocation: false
    };
    
    const { result } = renderHook(() => useWeather(), {
      wrapper: ({ children }) => wrapper({ children, locationValue: noLocationContext })
    });
    
    // Advance timers to ensure no fetch happens
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(mockWeatherService.getWeatherByCoordinates).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('handles weather fetch errors', async () => {
    mockWeatherService.getWeatherByCoordinates.mockRejectedValue(
      new Error('Weather API error')
    );
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    // Manually trigger fetchWeather to ensure error is caught
    await act(async () => {
      await result.current.fetchWeather();
    });
    
    await waitFor(() => {
      expect(result.current.error).toBe('Weather API error');
    }, { timeout: 5000 });
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('toggles temperature unit', () => {
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    expect(result.current.unit).toBe('fahrenheit');
    
    act(() => {
      result.current.toggleUnit();
    });
    
    expect(result.current.unit).toBe('celsius');
    
    act(() => {
      result.current.toggleUnit();
    });
    
    expect(result.current.unit).toBe('fahrenheit');
  });

  it('clears error when clearError is called', async () => {
    mockWeatherService.getWeatherByCoordinates.mockRejectedValue(
      new Error('Weather API error')
    );
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    // Manually trigger fetchWeather to ensure error is caught
    await act(async () => {
      await result.current.fetchWeather();
    });
    
    await waitFor(() => {
      expect(result.current.error).toBe('Weather API error');
    }, { timeout: 5000 });
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('refreshes weather data when fetchWeather is called', async () => {
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockWeatherData);
    });
    
    // Clear mock to verify it's called again
    mockWeatherService.getWeatherByCoordinates.mockClear();
    
    await act(async () => {
      await result.current.fetchWeather(true);
    });
    
    expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledTimes(1);
  });

  it('implements caching to prevent frequent API calls', async () => {
    // Mock Date.now to control time
    const mockDateNow = jest.spyOn(Date, 'now');
    const startTime = 1640000000000; // Fixed timestamp
    mockDateNow.mockReturnValue(startTime);
    
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockWeatherData);
    });
    
    // Clear the mock call count but keep the resolved value for caching
    mockWeatherService.getWeatherByCoordinates.mockClear();
    
    // Advance time by only 5 minutes (less than 10 minute cache expiry)
    mockDateNow.mockReturnValue(startTime + 5 * 60 * 1000);
    
    // Try to fetch again without force flag - should not call API due to caching
    await act(async () => {
      await result.current.fetchWeather();
    });
    
    expect(mockWeatherService.getWeatherByCoordinates).not.toHaveBeenCalled();
    
    mockDateNow.mockRestore();
  });

  it('sets up auto-refresh interval', async () => {
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockWeatherData);
    });
    
    mockWeatherService.getWeatherByCoordinates.mockClear();
    
    // Fast-forward 10 minutes
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    
    await waitFor(() => {
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalled();
    });
  });

  it('cleans up interval on unmount', async () => {
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    const { unmount } = renderHook(() => useWeather(), { wrapper });
    
    await waitFor(() => {
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalled();
    });
    
    unmount();
    
    mockWeatherService.getWeatherByCoordinates.mockClear();
    
    // Fast-forward time - should not call API after unmount
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    
    expect(mockWeatherService.getWeatherByCoordinates).not.toHaveBeenCalled();
  });

  it('updates weather when location changes', async () => {
    // Start with no location first
    const noLocationContext: LocationContextType = {
      ...mockLocationContext,
      coordinates: null,
      ipLocation: null,
      hasLocation: false
    };
    
    const { result, rerender } = renderHook(() => useWeather(), { 
      wrapper: ({ children }) => wrapper({ children, locationValue: noLocationContext })
    });
    
    expect(result.current.data).toBeNull();
    
    mockWeatherService.getWeatherByCoordinates.mockResolvedValue(mockWeatherData);
    
    // Update to have location - this should trigger a fetch
    const newLocationContext: LocationContextType = {
      ...mockLocationContext,
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      hasLocation: true,
      lastUpdated: 0 // Ensure cache is expired
    };
    
    rerender({
      wrapper: ({ children }) => wrapper({ children, locationValue: newLocationContext })
    });
    
    // Wait for the effect to run and fetch weather
    await waitFor(() => {
      expect(mockWeatherService.getWeatherByCoordinates).toHaveBeenCalledWith(34.0522, -118.2437);
    }, { timeout: 5000 });
  });

  it('handles loading state correctly', async () => {
    let resolveWeather: (value: WeatherData) => void;
    const weatherPromise = new Promise<WeatherData>(resolve => {
      resolveWeather = resolve;
    });
    
    mockWeatherService.getWeatherByCoordinates.mockReturnValue(weatherPromise);
    
    const { result } = renderHook(() => useWeather(), { wrapper });
    
    // Should start loading
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    
    // Resolve the promise
    await act(async () => {
      resolveWeather!(mockWeatherData);
    });
    
    // Should stop loading
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockWeatherData);
  });
});