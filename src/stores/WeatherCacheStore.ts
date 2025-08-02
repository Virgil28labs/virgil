/**
 * Weather Cache Store
 * 
 * Separate store for weather data caching with TTL support.
 * Persists weather data for 30 minutes to reduce API calls.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_CONFIG, createTTLData, getTTLData, type TTLData } from './utils/persistence';
import type { WeatherSliceState } from './types/store.types';

export interface WeatherCacheState {
  weatherCache: TTLData<WeatherSliceState['data']> | null;
  forecastCache: TTLData<WeatherSliceState['forecast']> | null;
  lastLocation: { lat: number; lon: number } | null;
}

export interface WeatherCacheActions {
  setCachedWeather: (data: WeatherSliceState['data'], location?: { lat: number; lon: number }) => void;
  setCachedForecast: (forecast: WeatherSliceState['forecast']) => void;
  getCachedWeather: () => WeatherSliceState['data'] | null;
  getCachedForecast: () => WeatherSliceState['forecast'] | null;
  clearWeatherCache: () => void;
  isWeatherCacheValid: (location?: { lat: number; lon: number }) => boolean;
}

export interface WeatherCacheStore extends WeatherCacheState, WeatherCacheActions {}

export const useWeatherCacheStore = create<WeatherCacheStore>()(
  persist(
    (set, get) => ({
      // State
      weatherCache: null,
      forecastCache: null,
      lastLocation: null,

      // Actions
      setCachedWeather: (data, location) => {
        const ttlData = createTTLData(data, STORAGE_CONFIG.ttl.weather);
        set({
          weatherCache: ttlData,
          lastLocation: location || get().lastLocation,
        });
      },

      setCachedForecast: (forecast) => {
        const ttlData = createTTLData(forecast, STORAGE_CONFIG.ttl.weather);
        set({ forecastCache: ttlData });
      },

      getCachedWeather: () => {
        const state = get();
        return getTTLData(state.weatherCache);
      },

      getCachedForecast: () => {
        const state = get();
        return getTTLData(state.forecastCache);
      },

      clearWeatherCache: () => {
        set({
          weatherCache: null,
          forecastCache: null,
          lastLocation: null,
        });
      },

      isWeatherCacheValid: (location) => {
        const state = get();
        const cachedWeather = getTTLData(state.weatherCache);
        
        if (!cachedWeather) return false;
        
        // Check if location has changed significantly (more than ~1km)
        if (location && state.lastLocation) {
          const latDiff = Math.abs(location.lat - state.lastLocation.lat);
          const lonDiff = Math.abs(location.lon - state.lastLocation.lon);
          const significantMove = latDiff > 0.01 || lonDiff > 0.01; // ~1km threshold
          
          if (significantMove) return false;
        }
        
        return true;
      },
    }),
    {
      name: STORAGE_CONFIG.keys.weatherCache,
      // Only persist the cached data, not the computed values
      partialize: (state) => ({
        weatherCache: state.weatherCache,
        forecastCache: state.forecastCache,
        lastLocation: state.lastLocation,
      }),
    },
  ),
);