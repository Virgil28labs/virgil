/**
 * Weather Service Types
 * Real-time weather data integration
 */

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
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
}

export interface WeatherState {
  data: WeatherData | null;
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
  | 'SET_ERROR'
  | 'TOGGLE_UNIT'
  | 'CLEAR_ERROR';

export type WeatherAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WEATHER_DATA'; payload: WeatherData }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_UNIT' }
  | { type: 'CLEAR_ERROR' };

// OpenWeatherMap API Response Types
export interface OpenWeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}