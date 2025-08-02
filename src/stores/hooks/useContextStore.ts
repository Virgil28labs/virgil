/**
 * Context Store Hooks - Optimized Store Access
 * 
 * Provides optimized hooks for accessing and using the centralized context store
 * with efficient re-render patterns and TypeScript safety.
 */

import { useCallback } from 'react';
import { useStore } from 'zustand';
import { useContextStore } from '../ContextStore';
import { timeSelectors } from '../slices/timeSlice';
import type { 
  ContextSelector, 
} from '../types/store.types';
import { timeService } from '../../services/TimeService';

// ========== Core Store Hook ==========

/**
 * Main hook for accessing the context store
 * Uses selector pattern for optimized re-renders
 */
export const useContext = <T>(selector: ContextSelector<T>): T => {
  return useStore(useContextStore, selector);
};

// ========== Time Hooks (Primary) ==========

/**
 * Hook for current time - updates every second
 */
export const useCurrentTime = () => {
  return useContext(timeSelectors.getCurrentTime);
};

/**
 * Hook for current date - updates daily
 */
export const useCurrentDate = () => {
  return useContext(timeSelectors.getCurrentDate);
};

/**
 * Hook for time of day category
 */
export const useTimeOfDay = () => {
  return useContext(timeSelectors.getTimeOfDay);
};

/**
 * Hook for day of week
 */
export const useDayOfWeek = () => {
  return useContext(timeSelectors.getDayOfWeek);
};

/**
 * Hook for current timestamp
 */
export const useTimestamp = () => {
  return useContext(timeSelectors.getTimestamp);
};

/**
 * Hook for Date object
 */
export const useDateObject = () => {
  return useContext(timeSelectors.getDateObject);
};

/**
 * Hook for time validity status
 */
export const useIsTimeValid = () => {
  return useContext(timeSelectors.isTimeValid);
};

/**
 * Hook for complete time state
 */
export const useTimeState = () => {
  return useContext((state) => state.time);
};

/**
 * Hook for time actions
 */
export const useTimeActions = () => {
  return useContext((state) => ({
    updateTime: state.time.updateTime,
    setTimeValid: state.time.setTimeValid,
    setUpdateInterval: state.time.setUpdateInterval,
    setActive: state.time.setActive,
    syncWithTimeService: state.time.syncWithTimeService,
    subscribeToTimeService: state.time.subscribeToTimeService,
    unsubscribeFromTimeService: state.time.unsubscribeFromTimeService,
  }));
};

// ========== Location Hooks ==========

/**
 * Hook for location state
 */
export const useLocationState = () => {
  return useContext((state) => state.location);
};

/**
 * Hook for GPS coordinates
 */
export const useCoordinates = () => {
  return useContext((state) => state.location.coordinates);
};

/**
 * Hook for address information
 */
export const useAddress = () => {
  return useContext((state) => state.location.address);
};

/**
 * Hook for IP location
 */
export const useIpLocation = () => {
  return useContext((state) => state.location.ipLocation);
};

/**
 * Hook for location status flags
 */
export const useLocationStatus = () => {
  return useContext((state) => ({
    hasLocation: state.location.hasLocation,
    hasGPSLocation: state.location.hasGPSLocation,
    hasIpLocation: state.location.hasIpLocation,
    isPreciseLocation: state.location.isPreciseLocation,
    loading: state.location.loading,
    error: state.location.error,
    permissionStatus: state.location.permissionStatus,
  }));
};

/**
 * Hook for location actions
 */
export const useLocationActions = () => {
  return useContext((state) => ({
    updateLocation: state.location.updateLocation,
    setCoordinates: state.location.setCoordinates,
    setAddress: state.location.setAddress,
    setIpLocation: state.location.setIpLocation,
    setLoading: state.location.setLoading,
    setError: state.location.setError,
    setPermissionStatus: state.location.setPermissionStatus,
    clearError: state.location.clearError,
    retryGPS: state.location.retryGPS,
  }));
};

// ========== Weather Hooks ==========

/**
 * Hook for weather state
 */
export const useWeatherState = () => {
  return useContext((state) => state.weather);
};

/**
 * Hook for current weather data
 */
export const useWeatherData = () => {
  return useContext((state) => state.weather.data);
};

/**
 * Hook for weather forecast
 */
export const useWeatherForecast = () => {
  return useContext((state) => state.weather.forecast);
};

/**
 * Hook for weather status
 */
export const useWeatherStatus = () => {
  return useContext((state) => ({
    hasWeather: state.weather.hasWeather,
    loading: state.weather.loading,
    error: state.weather.error,
    unit: state.weather.unit,
    lastUpdated: state.weather.lastUpdated,
  }));
};

/**
 * Hook for weather actions
 */
export const useWeatherActions = () => {
  return useContext((state) => ({
    updateWeather: state.weather.updateWeather,
    setWeatherData: state.weather.setWeatherData,
    setForecast: state.weather.setForecast,
    setLoading: state.weather.setLoading,
    setError: state.weather.setError,
    setUnit: state.weather.setUnit,
    toggleUnit: state.weather.toggleUnit,
    clearError: state.weather.clearError,
  }));
};

// ========== User Hooks ==========

/**
 * Hook for user state
 */
export const useUserState = () => {
  return useContext((state) => state.user);
};

/**
 * Hook for current user
 */
export const useCurrentUser = () => {
  return useContext((state) => state.user.user);
};

/**
 * Hook for user profile
 */
export const useUserProfile = () => {
  return useContext((state) => state.user.profile);
};

/**
 * Hook for authentication status
 */
export const useAuthStatus = () => {
  return useContext((state) => ({
    isAuthenticated: state.user.isAuthenticated,
    loading: state.user.loading,
    memberSince: state.user.memberSince,
  }));
};

/**
 * Hook for user actions
 */
export const useUserActions = () => {
  return useContext((state) => ({
    updateUser: state.user.updateUser,
    setUser: state.user.setUser,
    setProfile: state.user.setProfile,
    setLoading: state.user.setLoading,
    signOut: state.user.signOut,
    refreshUser: state.user.refreshUser,
    // New user field actions
    setUserName: state.user.setUserName,
    setUserDob: state.user.setUserDob,
    setUserId: state.user.setUserId,
    updateUserFields: state.user.updateUserFields,
    // Environment context actions
    updateEnvironmentContext: state.user.updateEnvironmentContext,
    setEnvironmentField: state.user.setEnvironmentField,
  }));
};

// ========== New User Field Hooks ==========

/**
 * Hook for user name
 */
export const useUserName = () => {
  return useContext((state) => state.user.user?.name || '');
};

/**
 * Hook for user date of birth
 */
export const useUserDob = () => {
  return useContext((state) => state.user.user?.dob || '');
};

/**
 * Hook for user ID
 */
export const useUserId = () => {
  return useContext((state) => state.user.user?.userId || '');
};

/**
 * Hook for all core user fields
 */
export const useUserFields = () => {
  return useContext((state) => ({
    name: state.user.user?.name || '',
    dob: state.user.user?.dob || '',
    userId: state.user.user?.userId || '',
  }));
};

// ========== Environment Context Hooks ==========

/**
 * Hook for complete environment context
 */
export const useUserEnvironment = () => {
  return useContext((state) => state.user.env);
};

/**
 * Hook for user location data from environment
 */
export const useUserLocation = () => {
  return useContext((state) => ({
    city: state.user.env.city,
    lat: state.user.env.lat,
    long: state.user.env.long,
    ip: state.user.env.ip,
  }));
};

/**
 * Hook for user weather from environment
 */
export const useUserWeather = () => {
  return useContext((state) => state.user.env.weather);
};

/**
 * Hook for user device info from environment
 */
export const useUserDevice = () => {
  return useContext((state) => ({
    deviceType: state.user.env.deviceType,
    browser: state.user.env.browser,
    os: state.user.env.os,
  }));
};

/**
 * Hook for specific environment field
 */
export const useEnvironmentField = <K extends keyof ReturnType<typeof useUserEnvironment>>(field: K) => {
  return useContext((state) => state.user.env[field]);
};

// ========== Device Hooks ==========

/**
 * Hook for device state
 */
export const useDeviceState = () => {
  return useContext((state) => state.device);
};

/**
 * Hook for device information
 */
export const useDeviceInfo = () => {
  return useContext((state) => ({
    hasData: state.device.hasData,
    os: state.device.os,
    browser: state.device.browser,
    device: state.device.device,
    screen: state.device.screen,
    windowSize: state.device.windowSize,
    online: state.device.online,
  }));
};

/**
 * Hook for device actions
 */
export const useDeviceActions = () => {
  return useContext((state) => ({
    updateDevice: state.device.updateDevice,
    setDeviceInfo: state.device.setDeviceInfo,
    updateNetworkStatus: state.device.updateNetworkStatus,
    updateBattery: state.device.updateBattery,
    updateSession: state.device.updateSession,
  }));
};

// ========== Activity Hooks ==========

/**
 * Hook for activity state
 */
export const useActivityState = () => {
  return useContext((state) => state.activity);
};

/**
 * Hook for session information
 */
export const useSessionInfo = () => {
  return useContext((state) => ({
    timeSpentInSession: state.activity.timeSpentInSession,
    lastInteraction: state.activity.lastInteraction,
    sessionStartTime: state.activity.sessionStartTime,
  }));
};

/**
 * Hook for activity actions
 */
export const useActivityActions = () => {
  return useContext((state) => ({
    logActivity: state.activity.logActivity,
    updateSession: state.activity.updateSession,
    setLastInteraction: state.activity.setLastInteraction,
    addActiveComponent: state.activity.addActiveComponent,
    removeActiveComponent: state.activity.removeActiveComponent,
    clearOldActivities: state.activity.clearOldActivities,
  }));
};

// ========== Environment Hooks ==========

/**
 * Hook for environment state
 */
export const useEnvironmentState = () => {
  return useContext((state) => state.environment);
};

/**
 * Hook for connectivity status
 */
export const useConnectivity = () => {
  return useContext((state) => ({
    isOnline: state.environment.isOnline,
    deviceType: state.environment.deviceType,
  }));
};

/**
 * Hook for environment actions
 */
export const useEnvironmentActions = () => {
  return useContext((state) => ({
    updateEnvironment: state.environment.updateEnvironment,
    setOnlineStatus: state.environment.setOnlineStatus,
    setDeviceType: state.environment.setDeviceType,
    setDarkMode: state.environment.setDarkMode,
    updateViewport: state.environment.updateViewport,
    updateCapabilities: state.environment.updateCapabilities,
  }));
};

// ========== Apps Hooks ==========

/**
 * Hook for apps state
 */
export const useAppsState = () => {
  return useContext((state) => state.apps);
};

/**
 * Hook for apps data
 */
export const useAppsData = () => {
  return useContext((state) => state.apps.data);
};

/**
 * Hook for apps actions
 */
export const useAppsActions = () => {
  return useContext((state) => ({
    updateApps: state.apps.updateApps,
    setAppsData: state.apps.setAppsData,
    setLoading: state.apps.setLoading,
    setError: state.apps.setError,
  }));
};

// ========== Utility Hooks ==========

/**
 * Hook for getting complete store state (use sparingly)
 */
export const useCompleteState = () => {
  return useContext((state) => state);
};

/**
 * Hook for subscribing to store changes with custom selector
 */
export const useStoreSubscription = <T>(
  selector: ContextSelector<T>,
  callback: (value: T, previousValue: T) => void,
) => {
  return useCallback(() => {
    return useContextStore.subscribe(
      selector,
      callback,
      {
        equalityFn: Object.is,
        fireImmediately: false,
      },
    );
  }, [selector, callback]);
};

/**
 * Hook for getting time-relative information
 */
export const useTimeRelative = () => {
  const timeActions = useTimeActions();
  const isTimeValid = useIsTimeValid();
  
  return useCallback((date: Date): string => {
    if (!isTimeValid) {
      // Fallback calculation
      const now = Date.now();
      const diff = Math.floor((now - date.getTime()) / 1000);
      
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
      return `${Math.floor(diff / 86400)} days ago`;
    }
    
    // Use TimeService through the store
    try {
      return timeService.getRelativeTime(date);
    } catch (error) {
      console.error('Error getting relative time:', error);
      return 'unknown time';
    }
  }, [isTimeValid, timeActions]);
};

// ========== Development Hooks ==========

/**
 * Hook for debugging store state (development only)
 */
export const useStoreDebug = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      logState: () => console.log('Context Store State:', useContextStore.getState()),
      logTimeState: () => console.log('Time State:', useContextStore.getState().time),
      logLocationState: () => console.log('Location State:', useContextStore.getState().location),
      logWeatherState: () => console.log('Weather State:', useContextStore.getState().weather),
    };
  }
  return {
    logState: () => {},
    logTimeState: () => {},
    logLocationState: () => {},
    logWeatherState: () => {},
  };
};