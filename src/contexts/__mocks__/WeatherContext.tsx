import React, { createContext, useContext } from 'react';
import type { WeatherContextType } from '../WeatherContext';

// Mock implementation of useWeather hook
const mockUseWeather = jest.fn<WeatherContextType, []>();

// Default mock return value
mockUseWeather.mockReturnValue({
  data: null,
  loading: false,
  error: null,
  unit: 'fahrenheit',
  toggleUnit: jest.fn(),
  hasWeather: false
});

export const useWeather = mockUseWeather;

// Mock WeatherProvider component
export const WeatherProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Mock WeatherContext
export const WeatherContext = createContext<WeatherContextType | undefined>(undefined);