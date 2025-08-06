/**
 * Context Store - Public API
 * 
 * Central export for all store functionality including store, hooks,
 * types, and utilities.
 */

import type { ContextStoreWithActions } from './types/store.types';
import { logger } from '../lib/logger';

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
} from './ContextStoreProvider';

export {
  useActivityLogger,
  useEnvironmentUtils,
} from './hooks/useStoreUtils';

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
    current: (state: ContextStoreWithActions) => state.time.currentTime,
    date: (state: ContextStoreWithActions) => state.time.currentDate,
    timeOfDay: (state: ContextStoreWithActions) => state.time.timeOfDay,
    dayOfWeek: (state: ContextStoreWithActions) => state.time.dayOfWeek,
    timestamp: (state: ContextStoreWithActions) => state.time.timestamp,
    isValid: (state: ContextStoreWithActions) => state.time.isValid,
  },
  
  // Location selectors
  location: {
    coordinates: (state: ContextStoreWithActions) => state.location.coordinates,
    hasGPS: (state: ContextStoreWithActions) => state.location.hasGPSLocation,
    city: (state: ContextStoreWithActions) => state.location.address?.city || state.location.ipLocation?.city,
    loading: (state: ContextStoreWithActions) => state.location.loading,
    error: (state: ContextStoreWithActions) => state.location.error,
  },
  
  // Weather selectors
  weather: {
    temperature: (state: ContextStoreWithActions) => state.weather.data?.temperature,
    condition: (state: ContextStoreWithActions) => state.weather.data?.condition?.main,
    hasData: (state: ContextStoreWithActions) => state.weather.hasWeather,
    loading: (state: ContextStoreWithActions) => state.weather.loading,
    unit: (state: ContextStoreWithActions) => state.weather.unit,
  },
  
  // User selectors
  user: {
    isAuthenticated: (state: ContextStoreWithActions) => state.user.isAuthenticated,
    email: (state: ContextStoreWithActions) => state.user.user?.email,
    name: (state: ContextStoreWithActions) => state.user.profile?.nickname || state.user.profile?.fullName,
    loading: (state: ContextStoreWithActions) => state.user.loading,
  },
  
  // Environment selectors
  environment: {
    isOnline: (state: ContextStoreWithActions) => state.environment.isOnline,
    deviceType: (state: ContextStoreWithActions) => state.environment.deviceType,
    isDarkMode: (state: ContextStoreWithActions) => state.environment.prefersDarkMode,
  },
  
  // Activity selectors
  activity: {
    recentActions: (state: ContextStoreWithActions) => state.activity.recentActions,
    activeComponents: (state: ContextStoreWithActions) => state.activity.activeComponents,
    sessionTime: (state: ContextStoreWithActions) => state.activity.timeSpentInSession,
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
    storeSelector: (state: ContextStoreWithActions) => T,
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
      logger.debug('Store state logged', {
        component: 'ContextStore',
        action: 'logState',
        metadata: { state: getState() as unknown as Record<string, unknown> },
      });
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