/**
 * Context Store Type Definitions
 * 
 * Comprehensive TypeScript interfaces for the centralized Zustand store
 * with time as the single source of truth.
 */

import type { LocationContextValue } from '../../types/location.types';
import type { WeatherContextType } from '../../types/weather.types';
import type { AuthContextValue } from '../../types/auth.types';
import type { UserProfile } from '../../hooks/useUserProfile';
import type { DeviceInfo } from '../../hooks/useDeviceInfo';
import type { DashboardAppData } from '../../services/DashboardAppService';

// ========== Time State (Single Source of Truth) ==========

export interface TimeState {
  // Core time data (authoritative from TimeService)
  currentTime: string;        // "14:30"
  currentDate: string;        // "January 20, 2024"
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;         // "monday"
  timestamp: number;         // Real timestamp
  dateObject: Date;          // Current Date object
  
  // Service status
  isValid: boolean;          // TimeService availability
  lastUpdated: number;       // When time was last updated
  
  // Update frequency control
  updateInterval: number;    // Update interval in ms (default: 1000)
  isActive: boolean;         // Whether time updates are active
}

// ========== Location State ==========

export interface LocationSliceState {
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    timestamp: number;
  } | null;
  address: {
    street: string;
    house_number: string;
    city: string;
    postcode: string;
    country: string;
    formatted: string;
  } | null;
  ipLocation: {
    ip: string;
    city: string;
    region: string;
    country: string;
    timezone?: string;
    isp?: string;
    org?: string;
    postal?: string;
    lat?: number;
    lon?: number;
  } | null;
  loading: boolean;
  error: string | null;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt';
  lastUpdated: number | null;
  initialized: boolean;
  locationSource: 'gps' | 'ip' | null;
  canRetryGPS: boolean;
  gpsRetrying: boolean;
  hasLocation: boolean;
  hasGPSLocation: boolean;
  hasIpLocation: boolean;
  isPreciseLocation: boolean;
}

// ========== Weather State ==========

export interface WeatherSliceState {
  data: {
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
    condition: {
      id: number;
      main: string;
      description: string;
      icon: string;
    };
    sunrise: number;
    sunset: number;
    timezone: number;
    cityName: string;
    country: string;
    timestamp: number;
  } | null;
  forecast: {
    cityName: string;
    country: string;
    forecasts: Array<{
      date: string;
      tempMin: number;
      tempMax: number;
      condition: {
        id: number;
        main: string;
        description: string;
        icon: string;
      };
      humidity: number;
      windSpeed: number;
    }>;
  } | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  unit: 'celsius' | 'fahrenheit';
  hasWeather: boolean;
}

// ========== User State ==========

export interface UserSliceState {
  user: {
    // Core Identity Fields
    id: string;
    email?: string;
    name?: string;          // "Ben"
    dob?: string;           // "28-11-1982"
    userId?: string;        // "Ben28"
    
    // Supabase User Fields (all optional except id)
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    aud?: string;
    created_at?: string;
    updated_at?: string;
    role?: string;
    last_sign_in_at?: string;
    confirmation_sent_at?: string;
    confirmed_at?: string;
    email_confirmed_at?: string;
    phone?: string;
    phone_confirmed_at?: string;
    recovery_sent_at?: string;
    new_email?: string;
    invited_at?: string;
    factors?: unknown;
    identities?: unknown[];
    is_anonymous?: boolean;
  } | null;
  
  // Environment Context (aggregated from other slices)
  env: {
    ip: string;            // "76.33.141.122"
    city: string;          // "Los Angeles"
    lat: number;           // 34.0451
    long: number;          // -118.4422
    weather: string;       // "Clear, 82°F"
    deviceType: string;    // "desktop"
    browser: string;       // "Chrome"
    os: string;            // "macOS"
  };
  
  // Existing Fields
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  memberSince?: string;
  preferences?: Record<string, unknown>;
}

// ========== Device State ==========

export interface DeviceSliceState {
  hasData: boolean;
  // Hardware & System
  location?: string;
  ip?: string;
  device?: string;
  os?: string;
  browser?: string;
  screen?: string;
  pixelRatio?: number;
  colorScheme?: string;
  windowSize?: string;
  cpu?: number | string;
  memory?: string;
  online?: boolean;
  // Network
  networkType?: string;
  downlink?: string;
  rtt?: string;
  // Battery
  batteryLevel?: number | null;
  batteryCharging?: boolean | null;
  // Time & Location
  localTime?: string;
  timezone?: string;
  language?: string;
  // Session
  tabVisible?: boolean;
  sessionDuration?: number;
  // Features
  cookiesEnabled?: boolean;
  doNotTrack?: string | null;
  storageQuota?: string;
}

// ========== Activity State ==========

export interface ActivitySliceState {
  activeComponents: string[];
  recentActions: Array<{
    action: string;
    timestamp: number;
    component?: string;
  }>;
  timeSpentInSession: number;
  lastInteraction: number;
  sessionStartTime: number;
}

// ========== Environment State ==========

export interface EnvironmentSliceState {
  isOnline: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  prefersDarkMode: boolean;
  language: string;
  viewport: {
    width: number;
    height: number;
  };
  capabilities: {
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    notifications: boolean;
  };
}

// ========== Apps State ==========

export interface AppsSliceState {
  data: DashboardAppData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// ========== Complete Store State ==========

export interface ContextStore {
  // Time (Single Source of Truth)
  time: TimeState;
  
  // Other contexts
  location: LocationSliceState;
  weather: WeatherSliceState;
  user: UserSliceState;
  device: DeviceSliceState;
  activity: ActivitySliceState;
  environment: EnvironmentSliceState;
  apps: AppsSliceState;
}

// ========== Store Actions ==========

export interface TimeActions {
  // Core time updates
  updateTime: (timeData: Partial<TimeState>) => void;
  setTimeValid: (isValid: boolean) => void;
  setUpdateInterval: (interval: number) => void;
  setActive: (isActive: boolean) => void;
  
  // TimeService integration
  syncWithTimeService: () => void;
  subscribeToTimeService: () => void;
  unsubscribeFromTimeService: () => void;
}

export interface LocationActions {
  updateLocation: (locationData: Partial<LocationSliceState>) => void;
  setCoordinates: (coordinates: LocationSliceState['coordinates']) => void;
  setAddress: (address: LocationSliceState['address']) => void;
  setIpLocation: (ipLocation: LocationSliceState['ipLocation']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPermissionStatus: (status: LocationSliceState['permissionStatus']) => void;
  clearError: () => void;
  retryGPS: () => void;
}

export interface WeatherActions {
  updateWeather: (weatherData: Partial<WeatherSliceState>) => void;
  setWeatherData: (data: WeatherSliceState['data']) => void;
  setForecast: (forecast: WeatherSliceState['forecast']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUnit: (unit: 'celsius' | 'fahrenheit') => void;
  toggleUnit: () => void;
  clearError: () => void;
}

export interface UserActions {
  // Existing actions
  updateUser: (userData: Partial<UserSliceState>) => void;
  setUser: (user: (Partial<UserSliceState['user']> & { id: string }) | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
  refreshUser: () => void;
  
  // New user field actions
  setUserName: (name: string) => void;
  setUserDob: (dob: string) => void;
  setUserId: (userId: string) => void;
  updateUserFields: (fields: { name?: string; dob?: string; userId?: string }) => void;
  
  // Environment context actions
  updateEnvironmentContext: () => void;
  setEnvironmentField: (field: keyof UserSliceState['env'], value: string | number) => void;
}

export interface DeviceActions {
  updateDevice: (deviceData: Partial<DeviceSliceState>) => void;
  setDeviceInfo: (deviceInfo: DeviceInfo) => void;
  updateNetworkStatus: (online: boolean) => void;
  updateBattery: (level: number | null, charging: boolean | null) => void;
  updateSession: (duration: number, tabVisible: boolean) => void;
}

export interface ActivityActions {
  logActivity: (action: string, component?: string) => void;
  updateSession: (timeSpent: number) => void;
  setLastInteraction: (timestamp: number) => void;
  addActiveComponent: (component: string) => void;
  removeActiveComponent: (component: string) => void;
  clearOldActivities: () => void;
}

export interface EnvironmentActions {
  updateEnvironment: (envData: Partial<EnvironmentSliceState>) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setDeviceType: (deviceType: EnvironmentSliceState['deviceType']) => void;
  setDarkMode: (prefersDarkMode: boolean) => void;
  updateViewport: (width: number, height: number) => void;
  updateCapabilities: (capabilities: Partial<EnvironmentSliceState['capabilities']>) => void;
}

export interface AppsActions {
  updateApps: (appsData: Partial<AppsSliceState>) => void;
  setAppsData: (data: DashboardAppData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ========== Combined Store with Actions ==========

export interface ContextStoreWithActions extends ContextStore {
  // Time actions (primary)
  time: TimeState & TimeActions;
  
  // Other slice actions
  location: LocationSliceState & LocationActions;
  weather: WeatherSliceState & WeatherActions;
  user: UserSliceState & UserActions;
  device: DeviceSliceState & DeviceActions;
  activity: ActivitySliceState & ActivityActions;
  environment: EnvironmentSliceState & EnvironmentActions;
  apps: AppsSliceState & AppsActions;
}

// ========== Selector Types ==========

export type ContextSelector<T> = (state: ContextStoreWithActions) => T;

export interface TimeSelectors {
  getCurrentTime: ContextSelector<string>;
  getCurrentDate: ContextSelector<string>;
  getTimeOfDay: ContextSelector<string>;
  getDayOfWeek: ContextSelector<string>;
  getTimestamp: ContextSelector<number>;
  getDateObject: ContextSelector<Date>;
  isTimeValid: ContextSelector<boolean>;
  getFormattedTime: ContextSelector<string>;
  getRelativeTime: ContextSelector<(date: Date) => string>;
}

// ========== Store Options ==========

export interface StoreOptions {
  // Time service configuration
  timeUpdateInterval?: number;
  enableTimeUpdates?: boolean;
  
  // Development options
  enableDevTools?: boolean;
  storeName?: string;
  
  // Persistence options
  enablePersistence?: boolean;
  persistenceKey?: string;
  
  // Performance options
  enableImmer?: boolean;
  enableSubscriptionOptimization?: boolean;
}