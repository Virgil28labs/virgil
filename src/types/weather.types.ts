/**
 * Weather Service Types
 * Real-time weather data integration
 */

export interface WeatherCondition {
  id?: number;
  main: string;
  description: string;
  icon: string;
}

export interface AirQualityData {
  aqi: number; // Air Quality Index (1-5)
  pm2_5: number; // PM2.5 in μg/m³
  pm10: number; // PM10 in μg/m³
  co?: number; // Carbon Monoxide in μg/m³
  no2?: number; // Nitrogen Dioxide in μg/m³
  o3?: number; // Ozone in μg/m³
  so2?: number; // Sulfur Dioxide in μg/m³
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  clouds: number;
  visibility: number;
  condition: WeatherCondition;
  sunrise: number;
  sunset: number;
  timezone: number;
  cityName: string;
  country: string;
  timestamp: number;
  airQuality?: AirQualityData; // Optional air quality data
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
}

export interface ForecastData {
  cityName: string;
  country: string;
  forecasts: ForecastDay[];
}

export interface WeatherState {
  data: WeatherData | null;
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  unit: 'celsius' | 'fahrenheit';
}

export interface WeatherContextType extends WeatherState {
  fetchWeather: (forceRefresh?: boolean) => Promise<void>;
  toggleUnit: () => void;
  clearError: () => void;
  hasWeather: boolean;
}

export type WeatherActionType =
  | 'SET_LOADING'
  | 'SET_WEATHER_DATA'
  | 'SET_FORECAST_DATA'
  | 'SET_ERROR'
  | 'TOGGLE_UNIT'
  | 'CLEAR_ERROR';

export type WeatherAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WEATHER_DATA'; payload: WeatherData }
  | { type: 'SET_FORECAST_DATA'; payload: ForecastData }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_UNIT' }
  | { type: 'CLEAR_ERROR' };
