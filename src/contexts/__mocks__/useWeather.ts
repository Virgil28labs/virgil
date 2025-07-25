import type { WeatherContextType } from '../../types/weather.types';

// Mock implementation of useWeather hook
const mockUseWeather = jest.fn<WeatherContextType, []>();

// Default mock return value
mockUseWeather.mockReturnValue({
  data: null,
  forecast: null,
  loading: false,
  error: null,
  unit: 'fahrenheit',
  toggleUnit: jest.fn(),
  hasWeather: false,
  fetchWeather: jest.fn(),
  clearError: jest.fn(),
  lastUpdated: null,
});

export const useWeather = mockUseWeather;