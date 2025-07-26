import { useContext } from 'react';
import { WeatherContext } from '../contexts/WeatherContextInstance';
import type { WeatherContextType } from '../types/weather.types';

export function useWeather(): WeatherContextType {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}
