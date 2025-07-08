import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { weatherService } from '../lib/weatherService';
import { useLocation } from './LocationContext';
import type { 
  WeatherContextType, 
  WeatherState, 
  WeatherAction,
  WeatherData 
} from '../types/weather.types';

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

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

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
        lastUpdated: Date.now()
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'TOGGLE_UNIT':
      return { 
        ...state, 
        unit: state.unit === 'fahrenheit' ? 'celsius' : 'fahrenheit' 
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: WeatherState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,
  unit: 'fahrenheit'
};

interface WeatherProviderProps {
  children: ReactNode;
}

export function WeatherProvider({ children }: WeatherProviderProps) {
  const [state, dispatch] = useReducer(weatherReducer, initialState);
  const { coordinates, ipLocation } = useLocation();

  // Environment validation in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = import.meta.env.VITE_LLM_API_URL;
      if (!apiUrl) {
        console.warn('🌤️ [WeatherContext] VITE_LLM_API_URL not configured');
      } else {
        console.log('🌤️ [WeatherContext] Backend API URL:', apiUrl);
      }
    }
  }, []);

  const fetchWeather = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🌤️ [WeatherContext] fetchWeather called', { 
        forceRefresh, 
        loading: state.loading,
        coordinates: !!coordinates,
        ipLocation: !!ipLocation?.city,
        lastUpdated: state.lastUpdated 
      });
    }

    if (state.loading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🌤️ [WeatherContext] Already loading, skipping');
      }
      return;
    }

    // Check cache validity (10 minutes)
    const cacheExpiry = 10 * 60 * 1000;
    const isCacheValid = state.lastUpdated && (Date.now() - state.lastUpdated) < cacheExpiry;

    if (!forceRefresh && isCacheValid) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🌤️ [WeatherContext] Using cached data');
      }
      return;
    }

    // Need either coordinates or city to fetch weather
    if (!coordinates && !ipLocation?.city) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🌤️ [WeatherContext] No location data available, using fallback location');
      }
      // Use San Francisco as fallback location
      try {
        const fallbackWeatherData = await weatherService.getWeatherByCoordinates(37.7749, -122.4194);
        if (process.env.NODE_ENV === 'development') {
          console.log('🌤️ [WeatherContext] Using fallback location (San Francisco)');
        }
        dispatch({ type: 'SET_WEATHER_DATA', payload: fallbackWeatherData });
        return;
      } catch (fallbackError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('🌤️ [WeatherContext] Fallback location also failed:', fallbackError);
        }
        dispatch({ type: 'SET_ERROR', payload: 'Weather service unavailable' });
        return;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🌤️ [WeatherContext] Starting weather fetch');
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      let weatherData: WeatherData;

      // Prefer GPS coordinates over IP location
      if (coordinates) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🌤️ [WeatherContext] Using GPS coordinates', { 
            lat: coordinates.latitude, 
            lon: coordinates.longitude 
          });
        }
        weatherData = await weatherService.getWeatherByCoordinates(
          coordinates.latitude,
          coordinates.longitude
        );
      } else if (ipLocation?.city) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🌤️ [WeatherContext] Using IP location', { 
            city: ipLocation.city, 
            country: ipLocation.country 
          });
        }
        weatherData = await weatherService.getWeatherByCity(
          ipLocation.city,
          ipLocation.country
        );
      } else {
        throw new Error('No location available');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🌤️ [WeatherContext] Weather data received', weatherData);
      }
      dispatch({ type: 'SET_WEATHER_DATA', payload: weatherData });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🌤️ [WeatherContext] Weather fetch error:', error);
        console.error('🌤️ [WeatherContext] Error details:', {
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
      }
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch weather' });
    }
  }, [state.loading, state.lastUpdated, coordinates, ipLocation]);

  const toggleUnit = useCallback((): void => {
    dispatch({ type: 'TOGGLE_UNIT' });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Fetch weather when location becomes available (optimized to prevent duplicate calls)
  useEffect(() => {
    if (coordinates || ipLocation?.city) {
      // Only fetch if we don't have recent data (within 5 minutes)
      const timeSinceLastUpdate = Date.now() - (state.lastUpdated || 0);
      if (timeSinceLastUpdate > 5 * 60 * 1000) {
        fetchWeather();
      }
    }
  }, [coordinates, ipLocation?.city]); // More specific dependency

  // Set up auto-refresh every 10 minutes (optimized with single interval)
  useEffect(() => {
    if (!coordinates && !ipLocation?.city) return;

    const interval = setInterval(() => {
      if (coordinates || ipLocation?.city) {
        fetchWeather(true);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [!!coordinates, !!ipLocation?.city]); // Boolean dependencies to prevent unnecessary effect runs

  // Convert temperature based on unit preference - memoized to prevent re-calculation
  const displayData = useMemo((): WeatherData | null => {
    if (!state.data) return null;

    if (state.unit === 'celsius') {
      return {
        ...state.data,
        temperature: weatherService.convertTemperature(state.data.temperature, true),
        feelsLike: weatherService.convertTemperature(state.data.feelsLike, true),
        tempMin: weatherService.convertTemperature(state.data.tempMin, true),
        tempMax: weatherService.convertTemperature(state.data.tempMax, true)
      };
    }

    return state.data;
  }, [state.data, state.unit]);

  // Memoized context value to prevent unnecessary re-renders (performance optimization)
  const value: WeatherContextType = useMemo(() => ({
    ...state,
    data: displayData,
    fetchWeather,
    toggleUnit,
    clearError,
    hasWeather: !!state.data
  }), [state, displayData, fetchWeather, toggleUnit, clearError]);

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather(): WeatherContextType {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}