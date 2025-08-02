/**
 * Context Store - Public API
 * 
 * Central export for all store functionality including store, hooks,
 * types, and utilities.
 */

// ========== Core Store ==========
export { 
  useContextStore as default,
  useContextStore,
  getStoreState,
  subscribeToStore,
  getTimestamp,
  syncWithLegacyContext,
  cleanupContextStore,
} from './ContextStore';

// ========== Cache Stores ==========
export {
  useWeatherCacheStore,
  type WeatherCacheStore,
  type WeatherCacheState,
  type WeatherCacheActions,
} from './WeatherCacheStore';

export {
  useLocationCacheStore,
  type LocationCacheStore,
  type LocationCacheState,
  type LocationCacheActions,
} from './LocationCacheStore';

// ========== Preferences Store ==========
export {
  usePreferencesStore,
  type PreferencesStore,
  type PreferencesState,
  type PreferencesActions,
} from './PreferencesStore';

// ========== Store Provider ==========
export {
  ContextStoreProvider,
  ContextStoreDebugger,
  useActivityLogger,
  useEnvironmentUtils,
} from './ContextStoreProvider';

// ========== Hooks ==========
export {
  // Core
  useContext,
  
  // Time hooks (primary)
  useCurrentTime,
  useCurrentDate,
  useTimeOfDay,
  useDayOfWeek,
  useTimestamp,
  useDateObject,
  useIsTimeValid,
  useTimeState,
  useTimeActions,
  
  // Location hooks
  useLocationState,
  useCoordinates,
  useAddress,
  useIpLocation,
  useLocationStatus,
  useLocationActions,
  
  // Weather hooks
  useWeatherState,
  useWeatherData,
  useWeatherForecast,
  useWeatherStatus,
  useWeatherActions,
  
  // User hooks
  useUserState,
  useCurrentUser,
  useUserProfile,
  useAuthStatus,
  useUserActions,
  
  // New user field hooks
  useUserName,
  useUserDob,
  useUsername,
  useUserFields,
  
  // Environment context hooks
  useUserEnvironment,
  useUserLocation,
  useUserWeather,
  useUserDevice,
  useEnvironmentField,
  
  // Device hooks
  useDeviceState,
  useDeviceInfo,
  useDeviceActions,
  
  // Activity hooks
  useActivityState,
  useSessionInfo,
  useActivityActions,
  
  // Environment hooks
  useEnvironmentState,
  useConnectivity,
  useEnvironmentActions,
  
  // Apps hooks
  useAppsState,
  useAppsData,
  useAppsActions,
  
  // Utility hooks
  useCompleteState,
  useStoreSubscription,
  useTimeRelative,
  useStoreDebug,
} from './hooks/useContextStore';

// ========== Types ==========
export type {
  // Core store types
  ContextStore,
  ContextStoreWithActions,
  ContextSelector,
  StoreOptions,
  
  // State types
  TimeState,
  LocationSliceState,
  WeatherSliceState,
  UserSliceState,
  DeviceSliceState,
  ActivitySliceState,
  EnvironmentSliceState,
  AppsSliceState,
  
  // Action types
  TimeActions,
  LocationActions,
  WeatherActions,
  UserActions,
  DeviceActions,
  ActivityActions,
  EnvironmentActions,
  AppsActions,
  
  // Selector types
  TimeSelectors,
} from './types/store.types';

// ========== Time Slice Utilities ==========
export {
  timeSelectors,
  getFormattedTime,
  getFormattedDate,
  isTimeDataFresh,
  getRelativeTime,
  initializeTimeSlice,
} from './slices/timeSlice';

// ========== Store Selectors (Optimized) ==========

// Common selector patterns for optimized re-renders
export const selectors = {
  // Time selectors
  time: {
    current: (state: any) => state.time.currentTime,
    date: (state: any) => state.time.currentDate,
    timeOfDay: (state: any) => state.time.timeOfDay,
    dayOfWeek: (state: any) => state.time.dayOfWeek,
    timestamp: (state: any) => state.time.timestamp,
    isValid: (state: any) => state.time.isValid,
  },
  
  // Location selectors
  location: {
    coordinates: (state: any) => state.location.coordinates,
    hasGPS: (state: any) => state.location.hasGPSLocation,
    city: (state: any) => state.location.address?.city || state.location.ipLocation?.city,
    loading: (state: any) => state.location.loading,
    error: (state: any) => state.location.error,
  },
  
  // Weather selectors
  weather: {
    temperature: (state: any) => state.weather.data?.temperature,
    condition: (state: any) => state.weather.data?.condition?.main,
    hasData: (state: any) => state.weather.hasWeather,
    loading: (state: any) => state.weather.loading,
    unit: (state: any) => state.weather.unit,
  },
  
  // User selectors
  user: {
    isAuthenticated: (state: any) => state.user.isAuthenticated,
    email: (state: any) => state.user.user?.email,
    name: (state: any) => state.user.profile?.nickname || state.user.profile?.fullName,
    loading: (state: any) => state.user.loading,
  },
  
  // Environment selectors
  environment: {
    isOnline: (state: any) => state.environment.isOnline,
    deviceType: (state: any) => state.environment.deviceType,
    isDarkMode: (state: any) => state.environment.prefersDarkMode,
  },
  
  // Activity selectors
  activity: {
    recentActions: (state: any) => state.activity.recentActions,
    activeComponents: (state: any) => state.activity.activeComponents,
    sessionTime: (state: any) => state.activity.timeSpentInSession,
  },
} as const;

// ========== Migration Utilities ==========

/**
 * Utilities for migrating from existing context providers
 */
export const storeMigration = {
  /**
   * Create a wrapper component for gradual migration
   */
  createMigrationWrapper: <T,>(
    legacyHook: () => T,
    storeSelector: (state: any) => T,
    fallbackToLegacy = true,
  ) => {
    return () => {
      try {
        const { useContextStore: useStore } = require('./ContextStore');
        const storeValue = useStore(storeSelector);
        return storeValue;
      } catch (error) {
        if (fallbackToLegacy) {
          console.warn('Store not available, falling back to legacy hook:', error);
          return legacyHook();
        }
        throw error;
      }
    };
  },
  
  /**
   * Sync legacy context data to store
   */
  syncLegacyData: () => {
    const { syncWithLegacyContext: syncFn } = require('./ContextStore');
    return syncFn;
  },
};

// ========== Development Utilities ==========

export const dev = {
  /**
   * Log current store state (development only)
   */
  logState: () => {
    if (process.env.NODE_ENV === 'development') {
      const { getStoreState: getState } = require('./ContextStore');
      console.log('Context Store State:', getState());
    }
  },
  
  /**
   * Get store state for debugging
   */
  getState: () => {
    const { getStoreState } = require('./ContextStore');
    return getStoreState();
  },
  
  /**
   * Subscribe to store changes for debugging
   */
  subscribe: () => {
    const { subscribeToStore } = require('./ContextStore');
    return subscribeToStore;
  },
};

// ========== New Utilities ==========

// Weather formatting utilities
export {
  formatWeatherString,
  formatDetailedWeatherString,
  getSimpleWeatherCondition,
  getTemperatureString,
  isValidWeatherData,
} from './utils/weatherFormatter';

// Environment sync utilities
export {
  useEnvironmentSync,
  useProfileSync,
  useAutoSync,
  syncEnvironmentContext,
  syncAll,
  validateEnvironmentSync,
} from './utils/environmentSync';

// Profile sync utilities
export {
  syncProfileToUserFields,
  syncUserFieldsToProfile,
  updateUserFieldsFromSource,
  generateUsername,
  autoGenerateUserId,
  validateUserFields,
  setupUserFromProfile,
  clearUserData,
  getConsolidatedUserData,
} from './utils/profileSync';

// Persistence utilities
export {
  STORAGE_CONFIG,
  createTTLData,
  isTTLExpired,
  getTTLData,
  storage,
  storageDebug,
  migration as persistenceMigration,
  type TTLData,
} from './utils/persistence';