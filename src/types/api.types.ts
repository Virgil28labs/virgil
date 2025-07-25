/**
 * Common API response types
 */

export interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  status?: number;
  message?: string;
}

export interface WeatherAPIResponse {
  temperature: number;
  conditions: string;
  humidity: number;
  wind_speed: number;
  pressure: number;
  feels_like: number;
  uv_index: number;
  visibility: number;
  icon: string;
  description: string;
  city?: string;
  country?: string;
}

export interface ForecastAPIResponse {
  list: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    humidity: number;
    wind_speed: number;
    pop: number;
  }>;
  city: {
    name: string;
    country: string;
  };
}

export interface NasaAPODResponse {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
}

export interface GiphyGifResponse {
  id: string;
  title: string;
  url: string;
  images: {
    original: {
      url: string;
      width: string;
      height: string;
    };
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    preview_gif?: {
      url: string;
    };
  };
}

export interface LocationAPIResponse {
  lat: number;
  lon: number;
  display_name: string;
  city?: string;
  state?: string;
  country?: string;
}