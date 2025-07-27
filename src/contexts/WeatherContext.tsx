import type { ReactNode } from 'react';
import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { weatherService } from '../lib/weatherService';
import { useLocation } from '../hooks/useLocation';
import { logger } from '../lib/logger';
import { timeService } from '../services/TimeService';
import { WEATHER_CACHE_DURATION, FALLBACK_LOCATION } from '../constants/weather.constants';
import type {
  WeatherContextType,
  WeatherState,
  WeatherAction,
  WeatherData,
  ForecastData,
} from '../types/weather.types';
import { WeatherContext } from './WeatherContextInstance';

/**
 * WeatherContext - Weather Data State Management
 *
 * Provides real-time weather information based on user location
 * with automatic updates and caching.
 *
 * Features:
 * - Weather data from OpenWeatherMap API
 * - Automatic updates every 10 minutes
 * - Temperature unit conversion (F/C)
 * - Fallback to IP location if GPS unavailable
 * - Error handling and retry logic
 */

const weatherReducer = (state: WeatherState, action: WeatherAction): WeatherState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_WEATHER_DATA':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
        lastUpdated: timeService.getTimestamp(),
      };
    case 'SET_FORECAST_DATA':
      return {
        ...state,
        forecast: action.payload,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'TOGGLE_UNIT':
      return {
        ...state,
        unit: state.unit === 'fahrenheit' ? 'celsius' : 'fahrenheit',
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: WeatherState = {
  data: null,
  forecast: null,
  loading: false,  // Start with loading false to allow initial fetch
  error: null,
  lastUpdated: null,
  unit: 'fahrenheit',
};

interface WeatherProviderProps {
  children: ReactNode;
}

// Helper function to fetch fallback weather data
const fetchFallbackWeather = async (
  dispatch: React.Dispatch<WeatherAction>,
): Promise<void> => {
  try {
    const [weatherData, forecastData] = await Promise.all([
      weatherService.getWeatherByCoordinates(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lon),
      weatherService.getForecastByCoordinates(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lon)
        .catch(() => null), // Don't fail if forecast fails
    ]);
    
    dispatch({ type: 'SET_WEATHER_DATA', payload: weatherData });
    
    if (forecastData) {
      dispatch({ type: 'SET_FORECAST_DATA', payload: forecastData });
    }
  } catch (error) {
    logger.error('Failed to fetch fallback weather', error as Error, {
      component: 'WeatherContext',
      action: 'fetchFallbackWeather',
    });
    dispatch({ type: 'SET_ERROR', payload: 'Weather service unavailable' });
  }
};

export function WeatherProvider({ children }: WeatherProviderProps) {
  const [state, dispatch] = useReducer(weatherReducer, initialState);
  const { coordinates, ipLocation } = useLocation();

  const fetchWeather = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // Skip if already loading and not forcing refresh
    if (state.loading && !forceRefresh) {
      return;
    }

    // Check cache validity
    const isCacheValid = state.lastUpdated && 
      (timeService.getTimestamp() - state.lastUpdated) < WEATHER_CACHE_DURATION;

    if (!forceRefresh && isCacheValid) {
      return;
    }

    // Need either coordinates or city to fetch weather
    if (!coordinates && !ipLocation?.city) {
      await fetchFallbackWeather(dispatch);
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      let weatherData: WeatherData;

      // Prefer GPS coordinates over IP location
      if (coordinates) {
        weatherData = await weatherService.getWeatherByCoordinates(
          coordinates.latitude,
          coordinates.longitude,
        );

        // Fetch forecast data
        try {
          const forecastData = await weatherService.getForecastByCoordinates(
            coordinates.latitude,
            coordinates.longitude,
          );
          dispatch({ type: 'SET_FORECAST_DATA', payload: forecastData });
        } catch (forecastError) {
          // Log but don't fail if forecast fails
          logger.error('Failed to fetch forecast', forecastError as Error, {
            component: 'WeatherContext',
            action: 'fetchWeatherAndForecast',
            metadata: { locationSource: 'coordinates' },
          });
        }
      } else if (ipLocation?.city) {
        weatherData = await weatherService.getWeatherByCity(
          ipLocation.city,
          ipLocation.country,
        );

        // Fetch forecast data in parallel
        try {
          const forecastData = await weatherService.getForecastByCity(
            ipLocation.city,
            ipLocation.country,
          );
          dispatch({ type: 'SET_FORECAST_DATA', payload: forecastData });
        } catch (forecastError) {
          // Log but don't fail if forecast fails
          logger.error('Failed to fetch forecast', forecastError as Error, {
            component: 'WeatherContext',
            action: 'fetchWeatherAndForecast',
            metadata: { locationSource: 'ipLocation' },
          });
        }
      } else {
        throw new Error('No location available');
      }

      dispatch({ type: 'SET_WEATHER_DATA', payload: weatherData });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [coordinates, ipLocation, state.loading, state.lastUpdated]);

  const toggleUnit = useCallback((): void => {
    dispatch({ type: 'TOGGLE_UNIT' });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Fetch weather when location becomes available and set up auto-refresh
  useEffect(() => {
    const hasGpsCoordinates = !!coordinates;
    const hasIpCity = !!ipLocation?.city;

    if (!hasGpsCoordinates && !hasIpCity) return;

    // Initial fetch if we don't have recent data
    const timeSinceLastUpdate = timeService.getTimestamp() - (state.lastUpdated || 0);
    if (!state.loading && timeSinceLastUpdate > WEATHER_CACHE_DURATION) {
      fetchWeather();
    }

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchWeather(true);
    }, WEATHER_CACHE_DURATION);

    return () => clearInterval(interval);
  }, [coordinates, ipLocation?.city, state.loading, state.lastUpdated, fetchWeather]);

  // Convert temperature based on unit preference - memoized to prevent re-calculation
  const displayData = useMemo((): WeatherData | null => {
    if (!state.data) return null;

    if (state.unit === 'celsius') {
      return {
        ...state.data,
        temperature: weatherService.convertTemperature(state.data.temperature, true),
        feelsLike: weatherService.convertTemperature(state.data.feelsLike, true),
        tempMin: weatherService.convertTemperature(state.data.tempMin, true),
        tempMax: weatherService.convertTemperature(state.data.tempMax, true),
      };
    }

    return state.data;
  }, [state.data, state.unit]);

  // Convert forecast temperatures based on unit preference
  const displayForecast = useMemo((): ForecastData | null => {
    if (!state.forecast) return null;

    if (state.unit === 'celsius') {
      return {
        ...state.forecast,
        forecasts: state.forecast.forecasts.map(day => ({
          ...day,
          tempMin: weatherService.convertTemperature(day.tempMin, true),
          tempMax: weatherService.convertTemperature(day.tempMax, true),
        })),
      };
    }

    return state.forecast;
  }, [state.forecast, state.unit]);

  // Memoized context value to prevent unnecessary re-renders (performance optimization)
  const value: WeatherContextType = useMemo(() => ({
    ...state,
    data: displayData,
    forecast: displayForecast,
    fetchWeather,
    toggleUnit,
    clearError,
    hasWeather: !!state.data,
  }), [state, displayData, displayForecast, fetchWeather, toggleUnit, clearError]);

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}
