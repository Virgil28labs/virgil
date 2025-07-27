/**
 * Weather Service Constants
 * Shared configuration values for weather functionality
 */

// Cache duration for weather data (10 minutes)
export const WEATHER_CACHE_DURATION = 10 * 60 * 1000;

// Fallback location when GPS/IP location unavailable
export const FALLBACK_LOCATION = {
  lat: 37.7749,
  lon: -122.4194,
  city: 'San Francisco',
  country: 'US',
} as const;

// UI interaction delays
export const HOVER_DELAY_MS = 500;

// API retry configuration
export const API_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
} as const;

// Responsive breakpoints
export const WEATHER_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
} as const;

// Weather emoji mapping
export const WEATHER_EMOJI_MAP: Record<string, string> = {
  'thunderstorm': '⛈️',
  'drizzle': '🌦️',
  'rain': '🌧️',
  'snow': '❄️',
  'atmosphere': '🌫️',
  'clear': '☀️',
  'few-clouds': '🌤️',
  'scattered-clouds': '⛅',
  'clouds': '☁️',
  'default': '🌡️',
} as const;

// Weather condition ID ranges
export const WEATHER_CONDITION_RANGES = {
  thunderstorm: { min: 200, max: 299 },
  drizzle: { min: 300, max: 399 },
  rain: { min: 500, max: 599 },
  snow: { min: 600, max: 699 },
  atmosphere: { min: 700, max: 799 },
  clear: { min: 800, max: 800 },
  fewClouds: { min: 801, max: 801 },
  scatteredClouds: { min: 802, max: 802 },
  clouds: { min: 803, max: 804 },
} as const;

// AQI color mapping
export const AQI_COLORS: Record<number, string> = {
  1: '#22c55e', // green - Good
  2: '#eab308', // yellow - Fair
  3: '#f97316', // orange - Moderate
  4: '#ef4444', // red - Poor
  5: '#a855f7', // purple - Very Poor
} as const;

// AQI descriptions
export const AQI_DESCRIPTIONS: Record<number, string> = {
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor',
} as const;