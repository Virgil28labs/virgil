/**
 * Context Store - Centralized State Management with Time as Single Source of Truth
 * 
 * A Zustand-based store that integrates with TimeService and provides
 * unified state management for all application contexts.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools, persist } from 'zustand/middleware';
import { createTimeSlice, initializeTimeSlice } from './slices/timeSlice';
import { formatWeatherString } from './utils/weatherFormatter';
import { STORAGE_CONFIG } from './utils/persistence';
import type { 
  ContextStoreWithActions,
  StoreOptions, 
} from './types/store.types';
import type {
  LocationContextValue,
  WeatherContextType,
  AuthContextValue,
} from '../types';
import type { UserProfile } from '../hooks/useUserProfile';
import type { DeviceInfo } from '../hooks/useDeviceInfo';

// Default store options
const defaultStoreOptions: Required<StoreOptions> = {
  timeUpdateInterval: 1000,
  enableTimeUpdates: true,
  enableDevTools: true,
  storeName: 'ContextStore',
  enablePersistence: true,
  persistenceKey: 'virgil-context-store',
  enableImmer: false,
  enableSubscriptionOptimization: true,
};

/**
 * Create the main context store
 */
export const useContextStore = create<ContextStoreWithActions>()(
  subscribeWithSelector(
    persist(
      devtools(
        (set, get) => ({
        // ========== Time Slice (Primary) ==========
          ...createTimeSlice(set, get, {} as any),

          // ========== Location Slice ==========
          location: {
            coordinates: null,
            address: null,
            ipLocation: null,
            loading: false,
            error: null,
            permissionStatus: 'unknown',
            lastUpdated: null,
            initialized: false,
            locationSource: null,
            canRetryGPS: false,
            gpsRetrying: false,
            hasLocation: false,
            hasGPSLocation: false,
            hasIpLocation: false,
            isPreciseLocation: false,

            // Location actions
            updateLocation: (locationData) => {
              set((state) => ({
                location: {
                  ...state.location,
                  ...locationData,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setCoordinates: (coordinates) => {
              set((state) => ({
                location: {
                  ...state.location,
                  coordinates,
                  hasGPSLocation: !!coordinates,
                  hasLocation: !!(coordinates || state.location.ipLocation),
                  isPreciseLocation: !!coordinates,
                  locationSource: coordinates ? 'gps' : state.location.locationSource,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setAddress: (address) => {
              set((state) => ({
                location: {
                  ...state.location,
                  address,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setIpLocation: (ipLocation) => {
              set((state) => ({
                location: {
                  ...state.location,
                  ipLocation,
                  hasIpLocation: !!ipLocation,
                  hasLocation: !!(ipLocation || state.location.coordinates),
                  locationSource: !state.location.coordinates && ipLocation ? 'ip' : state.location.locationSource,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setLoading: (loading) => {
              set((state) => ({
                location: { ...state.location, loading },
              }));
            },

            setError: (error) => {
              set((state) => ({
                location: { 
                  ...state.location, 
                  error,
                  loading: false,
                  gpsRetrying: false,
                },
              }));
            },

            setPermissionStatus: (permissionStatus) => {
              set((state) => ({
                location: { ...state.location, permissionStatus },
              }));
            },

            clearError: () => {
              set((state) => ({
                location: { ...state.location, error: null },
              }));
            },

            retryGPS: () => {
              set((state) => ({
                location: { 
                  ...state.location, 
                  gpsRetrying: true,
                  error: null,
                },
              }));
            },
          },

          // ========== Weather Slice ==========
          weather: {
            data: null,
            forecast: null,
            loading: false,
            error: null,
            lastUpdated: null,
            unit: 'fahrenheit',
            hasWeather: false,

            // Weather actions
            updateWeather: (weatherData) => {
              set((state) => ({
                weather: {
                  ...state.weather,
                  ...weatherData,
                  hasWeather: !!weatherData.data || state.weather.hasWeather,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setWeatherData: (data) => {
              set((state) => ({
                weather: {
                  ...state.weather,
                  data,
                  hasWeather: !!data,
                  loading: false,
                  error: null,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setForecast: (forecast) => {
              set((state) => ({
                weather: {
                  ...state.weather,
                  forecast,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setLoading: (loading) => {
              set((state) => ({
                weather: { ...state.weather, loading },
              }));
            },

            setError: (error) => {
              set((state) => ({
                weather: { 
                  ...state.weather, 
                  error,
                  loading: false,
                },
              }));
            },

            setUnit: (unit) => {
              set((state) => ({
                weather: { ...state.weather, unit },
              }));
            },

            toggleUnit: () => {
              set((state) => ({
                weather: {
                  ...state.weather,
                  unit: state.weather.unit === 'celsius' ? 'fahrenheit' : 'celsius',
                },
              }));
            },

            clearError: () => {
              set((state) => ({
                weather: { ...state.weather, error: null },
              }));
            },
          },

          // ========== User Slice ==========
          user: {
            user: null,
            env: {
              ip: '',
              city: '',
              lat: 0,
              long: 0,
              weather: '',
              deviceType: 'desktop',
              browser: '',
              os: '',
            },
            profile: null,
            loading: false,
            isAuthenticated: false,
            memberSince: undefined,
            preferences: undefined,

            // User actions
            updateUser: (userData) => {
              set((state) => ({
                user: {
                  ...state.user,
                  ...userData,
                  isAuthenticated: !!(userData.user || state.user.user),
                },
              }));
            },

            setUser: (user) => {
              const memberSince = user?.created_at 
                ? get().time.dateObject.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
                : undefined;

              // Ensure new user fields have defaults if not provided
              const enhancedUser = user ? {
                name: user.name || '',
                dob: user.dob || '',
                username: user.username || '',
                ...user,
              } : null;

              set((state) => ({
                user: {
                  ...state.user,
                  user: enhancedUser,
                  isAuthenticated: !!user,
                  memberSince,
                },
              }));
            },

            setProfile: (profile) => {
              set((state) => ({
                user: { ...state.user, profile },
              }));
            },

            setLoading: (loading) => {
              set((state) => ({
                user: { ...state.user, loading },
              }));
            },

            signOut: () => {
              set((state) => ({
                user: {
                  ...state.user,
                  user: null,
                  env: {
                    ip: '',
                    city: '',
                    lat: 0,
                    long: 0,
                    weather: '',
                    deviceType: 'desktop',
                    browser: '',
                    os: '',
                  },
                  profile: null,
                  isAuthenticated: false,
                  memberSince: undefined,
                  preferences: undefined,
                  loading: false,
                },
              }));
            },

            refreshUser: () => {
            // This would trigger a refresh in the auth service
            // Implementation depends on how auth refresh is handled
              set((state) => ({
                user: { ...state.user, loading: true },
              }));
            },

            // New user field actions
            setUserName: (name) => {
              set((state) => ({
                user: {
                  ...state.user,
                  user: state.user.user ? { ...state.user.user, name } : null,
                },
              }));
            },

            setUserDob: (dob) => {
              set((state) => ({
                user: {
                  ...state.user,
                  user: state.user.user ? { ...state.user.user, dob } : null,
                },
              }));
            },

            setUsername: (username) => {
              set((state) => ({
                user: {
                  ...state.user,
                  user: state.user.user ? { ...state.user.user, username } : null,
                },
              }));
            },

            updateUserFields: (fields) => {
              set((state) => ({
                user: {
                  ...state.user,
                  user: state.user.user ? { ...state.user.user, ...fields } : null,
                },
              }));
            },

            // Environment context actions
            updateEnvironmentContext: () => {
              const state = get();
              const weatherString = formatWeatherString(
                state.weather.data,
                state.weather.unit,
              );

              set((currentState) => ({
                user: {
                  ...currentState.user,
                  env: {
                    ip: state.location.ipLocation?.ip || state.device.ip || '',
                    city: state.location.address?.city || state.location.ipLocation?.city || '',
                    lat: state.location.coordinates?.latitude || state.location.ipLocation?.lat || 0,
                    long: state.location.coordinates?.longitude || state.location.ipLocation?.lon || 0,
                    weather: weatherString,
                    deviceType: state.environment.deviceType,
                    browser: state.device.browser || '',
                    os: state.device.os || '',
                  },
                },
              }));
            },

            setEnvironmentField: (field, value) => {
              set((state) => ({
                user: {
                  ...state.user,
                  env: {
                    ...state.user.env,
                    [field]: value,
                  },
                },
              }));
            },
          },

          // ========== Device Slice ==========
          device: {
            hasData: false,

            // Device actions
            updateDevice: (deviceData) => {
              set((state) => ({
                device: {
                  ...state.device,
                  ...deviceData,
                  hasData: true,
                },
              }));
            },

            setDeviceInfo: (deviceInfo) => {
              set((state) => ({
                device: {
                  ...state.device,
                  ...deviceInfo,
                  hasData: true,
                },
              }));
            },

            updateNetworkStatus: (online) => {
              set((state) => ({
                device: { ...state.device, online },
              }));
            },

            updateBattery: (batteryLevel, batteryCharging) => {
              set((state) => ({
                device: { 
                  ...state.device, 
                  batteryLevel, 
                  batteryCharging,
                },
              }));
            },

            updateSession: (sessionDuration, tabVisible) => {
              set((state) => ({
                device: { 
                  ...state.device, 
                  sessionDuration,
                  tabVisible,
                },
              }));
            },
          },

          // ========== Activity Slice ==========
          activity: {
            activeComponents: [],
            recentActions: [],
            timeSpentInSession: 0,
            lastInteraction: Date.now(), // Use Date.now() for initialization
            sessionStartTime: Date.now(), // Use Date.now() for initialization

            // Activity actions
            logActivity: (action, component) => {
              const timestamp = get().time.timestamp;
            
              set((state) => {
                const newAction = { action, timestamp, component };
                const recentActions = [...state.activity.recentActions, newAction]
                  .filter(a => timestamp - a.timestamp < 10 * 60 * 1000) // Keep last 10 minutes
                  .slice(-50); // Keep max 50 recent actions

                const activeComponents = component && !state.activity.activeComponents.includes(component)
                  ? [...state.activity.activeComponents, component]
                  : state.activity.activeComponents;

                return {
                  activity: {
                    ...state.activity,
                    recentActions,
                    activeComponents,
                    lastInteraction: timestamp,
                    timeSpentInSession: timestamp - state.activity.sessionStartTime,
                  },
                };
              });
            },

            updateSession: (timeSpent) => {
              set((state) => ({
                activity: {
                  ...state.activity,
                  timeSpentInSession: timeSpent,
                },
              }));
            },

            setLastInteraction: (timestamp) => {
              set((state) => ({
                activity: {
                  ...state.activity,
                  lastInteraction: timestamp,
                },
              }));
            },

            addActiveComponent: (component) => {
              set((state) => ({
                activity: {
                  ...state.activity,
                  activeComponents: state.activity.activeComponents.includes(component)
                    ? state.activity.activeComponents
                    : [...state.activity.activeComponents, component],
                },
              }));
            },

            removeActiveComponent: (component) => {
              set((state) => ({
                activity: {
                  ...state.activity,
                  activeComponents: state.activity.activeComponents.filter(c => c !== component),
                },
              }));
            },

            clearOldActivities: () => {
              const timestamp = get().time.timestamp;
              set((state) => ({
                activity: {
                  ...state.activity,
                  recentActions: state.activity.recentActions.filter(
                    a => timestamp - a.timestamp < 10 * 60 * 1000,
                  ),
                },
              }));
            },
          },

          // ========== Environment Slice ==========
          environment: {
            isOnline: navigator.onLine,
            deviceType: 'desktop',
            prefersDarkMode: false,
            language: navigator.language || 'en-US',
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            capabilities: {
              geolocation: 'geolocation' in navigator,
              camera: false,
              microphone: false,
              notifications: 'Notification' in window,
            },

            // Environment actions
            updateEnvironment: (envData) => {
              set((state) => ({
                environment: {
                  ...state.environment,
                  ...envData,
                },
              }));
            },

            setOnlineStatus: (isOnline) => {
              set((state) => ({
                environment: { ...state.environment, isOnline },
              }));
            },

            setDeviceType: (deviceType) => {
              set((state) => ({
                environment: { ...state.environment, deviceType },
              }));
            },

            setDarkMode: (prefersDarkMode) => {
              set((state) => ({
                environment: { ...state.environment, prefersDarkMode },
              }));
            },

            updateViewport: (width, height) => {
              set((state) => ({
                environment: {
                  ...state.environment,
                  viewport: { width, height },
                },
              }));
            },

            updateCapabilities: (capabilities) => {
              set((state) => ({
                environment: {
                  ...state.environment,
                  capabilities: {
                    ...state.environment.capabilities,
                    ...capabilities,
                  },
                },
              }));
            },
          },

          // ========== Apps Slice ==========
          apps: {
            data: null,
            loading: false,
            error: null,
            lastUpdated: null,

            // Apps actions
            updateApps: (appsData) => {
              set((state) => ({
                apps: {
                  ...state.apps,
                  ...appsData,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setAppsData: (data) => {
              set((state) => ({
                apps: {
                  ...state.apps,
                  data,
                  loading: false,
                  error: null,
                  lastUpdated: get().time.timestamp,
                },
              }));
            },

            setLoading: (loading) => {
              set((state) => ({
                apps: { ...state.apps, loading },
              }));
            },

            setError: (error) => {
              set((state) => ({
                apps: { 
                  ...state.apps, 
                  error,
                  loading: false,
                },
              }));
            },
          },
        }),
        {
          name: defaultStoreOptions.storeName,
          enabled: defaultStoreOptions.enableDevTools,
        },
      ),
      {
        name: STORAGE_CONFIG.keys.user,
        partialize: (state) => ({
          user: {
            user: state.user.user ? {
              name: state.user.user.name || '',
              dob: state.user.user.dob || '',
              username: state.user.user.username || '',
              id: state.user.user.id,
              email: state.user.user.email,
              // Keep minimal Supabase fields for auth
              created_at: state.user.user.created_at,
              updated_at: state.user.user.updated_at,
              app_metadata: state.user.user.app_metadata || {},
              user_metadata: state.user.user.user_metadata || {},
              aud: state.user.user.aud,
              role: state.user.user.role,
              identities: state.user.user.identities || [],
              is_anonymous: state.user.user.is_anonymous || false,
            } : null,
            profile: state.user.profile,
            isAuthenticated: state.user.isAuthenticated,
            memberSince: state.user.memberSince,
            preferences: state.user.preferences,
          },
        }),
      },
    ),
  ),
);

// Initialize the store
let cleanupTimeSlice: (() => void) | null = null;

// Initialize time slice after store creation (but not in test environment)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  cleanupTimeSlice = initializeTimeSlice(useContextStore);
}

// Cleanup function for app shutdown
export const cleanupContextStore = () => {
  if (cleanupTimeSlice) {
    cleanupTimeSlice();
    cleanupTimeSlice = null;
  }
};

// ========== Store Utilities ==========

/**
 * Get current store state (useful for debugging)
 */
export const getStoreState = () => useContextStore.getState();

/**
 * Subscribe to specific store changes
 */
export const subscribeToStore = <T>(
  selector: (state: ContextStoreWithActions) => T,
  callback: (value: T) => void,
) => {
  return useContextStore.subscribe(selector, callback);
};

/**
 * Get time-aware timestamp for any operation
 */
export const getTimestamp = () => {
  const state = useContextStore.getState();
  return state.time.timestamp;
};

/**
 * Helper to sync with legacy context providers during migration
 */
export const syncWithLegacyContext = {
  location: (locationData: LocationContextValue) => {
    const store = useContextStore.getState();
    store.location.updateLocation({
      coordinates: locationData.coordinates,
      address: locationData.address,
      ipLocation: locationData.ipLocation,
      loading: locationData.loading,
      error: locationData.error,
      permissionStatus: locationData.permissionStatus,
      lastUpdated: locationData.lastUpdated,
      initialized: locationData.initialized,
      locationSource: locationData.locationSource,
      canRetryGPS: locationData.canRetryGPS,
      gpsRetrying: locationData.gpsRetrying,
      hasLocation: locationData.hasLocation,
      hasGPSLocation: locationData.hasGPSLocation,
      hasIpLocation: locationData.hasIpLocation,
      isPreciseLocation: locationData.isPreciseLocation,
    });
  },

  weather: (weatherData: WeatherContextType) => {
    const store = useContextStore.getState();
    store.weather.updateWeather({
      data: weatherData.data,
      forecast: weatherData.forecast,
      loading: weatherData.loading,
      error: weatherData.error,
      lastUpdated: weatherData.lastUpdated,
      unit: weatherData.unit,
      hasWeather: weatherData.hasWeather,
    });
  },

  user: (userData: AuthContextValue, userProfile?: UserProfile) => {
    const store = useContextStore.getState();
    store.user.setUser(userData.user);
    if (userProfile) {
      store.user.setProfile(userProfile);
    }
    store.user.setLoading(userData.loading);
  },

  device: (deviceInfo: DeviceInfo) => {
    const store = useContextStore.getState();
    store.device.setDeviceInfo(deviceInfo);
  },
};

export default useContextStore;