/**
 * Weather Formatting Utilities
 * 
 * Utilities for creating clean, formatted weather strings for the 
 * environment context in the user slice.
 */

import type { WeatherSliceState } from '../types/store.types';

export interface WeatherData {
  temperature: number;
  condition: {
    main: string;
    description: string;
  };
}

/**
 * Formats weather data into a clean string for environment context
 * @param weatherData - Weather data from the weather slice
 * @param unit - Temperature unit ('celsius' | 'fahrenheit')
 * @returns Formatted weather string like "Clear, 82°F" or empty string if no data
 */
export const formatWeatherString = (
  weatherData: WeatherSliceState['data'],
  unit: 'celsius' | 'fahrenheit' = 'fahrenheit',
): string => {
  if (!weatherData) return '';

  const { condition, temperature } = weatherData;
  
  // Convert temperature if needed
  let temp: number;
  let unitSymbol: string;
  
  if (unit === 'celsius') {
    temp = Math.round((temperature - 32) * 5 / 9);
    unitSymbol = '°C';
  } else {
    temp = Math.round(temperature);
    unitSymbol = '°F';
  }

  // Format: "Clear, 82°F"
  return `${condition.main}, ${temp}${unitSymbol}`;
};

/**
 * Formats detailed weather string with description
 * @param weatherData - Weather data from the weather slice
 * @param unit - Temperature unit ('celsius' | 'fahrenheit')
 * @returns Detailed weather string like "Clear sky, 82°F"
 */
export const formatDetailedWeatherString = (
  weatherData: WeatherSliceState['data'],
  unit: 'celsius' | 'fahrenheit' = 'fahrenheit',
): string => {
  if (!weatherData) return '';

  const { condition, temperature } = weatherData;
  
  // Convert temperature if needed
  let temp: number;
  let unitSymbol: string;
  
  if (unit === 'celsius') {
    temp = Math.round((temperature - 32) * 5 / 9);
    unitSymbol = '°C';
  } else {
    temp = Math.round(temperature);
    unitSymbol = '°F';
  }

  // Format: "Clear sky, 82°F"
  return `${condition.description}, ${temp}${unitSymbol}`;
};

/**
 * Gets a simple weather condition (for compact displays)
 * @param weatherData - Weather data from the weather slice
 * @returns Simple condition like "Clear" or "Cloudy"
 */
export const getSimpleWeatherCondition = (
  weatherData: WeatherSliceState['data'],
): string => {
  if (!weatherData) return '';
  return weatherData.condition.main;
};

/**
 * Gets just the temperature with unit
 * @param weatherData - Weather data from the weather slice
 * @param unit - Temperature unit ('celsius' | 'fahrenheit')
 * @returns Temperature string like "82°F"
 */
export const getTemperatureString = (
  weatherData: WeatherSliceState['data'],
  unit: 'celsius' | 'fahrenheit' = 'fahrenheit',
): string => {
  if (!weatherData) return '';

  const { temperature } = weatherData;
  
  let temp: number;
  let unitSymbol: string;
  
  if (unit === 'celsius') {
    temp = Math.round((temperature - 32) * 5 / 9);
    unitSymbol = '°C';
  } else {
    temp = Math.round(temperature);
    unitSymbol = '°F';
  }

  return `${temp}${unitSymbol}`;
};

/**
 * Validates weather data before formatting
 * @param weatherData - Weather data to validate
 * @returns boolean indicating if data is valid for formatting
 */
export const isValidWeatherData = (
  weatherData: WeatherSliceState['data'],
): boolean => {
  return !!(
    weatherData &&
    typeof weatherData.temperature === 'number' &&
    weatherData.condition &&
    typeof weatherData.condition.main === 'string'
  );
};