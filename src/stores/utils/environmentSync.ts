/**
 * Environment Sync Utilities
 * 
 * Utilities for automatically syncing environment context when source data changes.
 * This ensures the user.env object stays up-to-date with location, weather, and device data.
 */

import { useEffect } from 'react';
import type React from 'react';
import { useContextStore } from '../ContextStore';

/**
 * Hook that automatically syncs environment context when dependencies change
 * Should be used in the ContextStoreProvider or at the app root level
 */
export const useEnvironmentSync = () => {
  useEffect(() => {
    let isUpdating = false; // Prevent recursive updates
    
    const unsubscribe = useContextStore.subscribe(
      (state) => [
        // Location dependencies
        state.location.coordinates,
        state.location.ipLocation,
        state.location.address,
        // Weather dependencies
        state.weather.data,
        state.weather.unit,
        // Device/Environment dependencies
        state.environment.deviceType,
        state.device.browser,
        state.device.os,
        state.device.ip,
      ],
      () => {
        // Prevent infinite loop by checking if we're already updating
        if (isUpdating) return;
        
        isUpdating = true;
        
        try {
          // Automatically update environment context when dependencies change
          const store = useContextStore.getState();
          store.user.updateEnvironmentContext();
        } finally {
          // Reset flag after update completes
          setTimeout(() => {
            isUpdating = false;
          }, 0);
        }
      },
    );

    // Initial sync on mount
    const store = useContextStore.getState();
    store.user.updateEnvironmentContext();

    return unsubscribe;
  }, []);
};

/**
 * Utility to manually sync environment context
 */
export const syncEnvironmentContext = () => {
  const store = useContextStore.getState();
  store.user.updateEnvironmentContext();
};

/**
 * Selective sync for specific environment fields
 * Useful when you only want to update certain fields
 */
export const useSyncEnvironmentField = (_field: string, dependencies: React.DependencyList) => {
  useEffect(() => {
    const unsubscribe = useContextStore.subscribe(
      () => dependencies,
      () => {
        const store = useContextStore.getState();
        store.user.updateEnvironmentContext();
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

/**
 * Profile to user fields sync
 * Automatically syncs UserProfile data to user fields when profile changes
 */
export const useProfileSync = () => {
  useEffect(() => {
    const unsubscribe = useContextStore.subscribe(
      (state) => state.user.profile,
      (profile) => {
        if (profile) {
          const store = useContextStore.getState();
          store.user.updateUserFields({
            name: profile.nickname || profile.fullName,
            dob: profile.dateOfBirth,
            username: profile.uniqueId,
          });
        }
      },
    );

    // Initial sync if profile already exists
    const store = useContextStore.getState();
    const currentProfile = store.user.profile;
    if (currentProfile) {
      store.user.updateUserFields({
        name: currentProfile.nickname || currentProfile.fullName,
        dob: currentProfile.dateOfBirth,
        username: currentProfile.uniqueId,
      });
    }

    return unsubscribe;
  }, []);
};

/**
 * Complete auto-sync setup
 * Combines environment sync and profile sync
 */
export const useAutoSync = () => {
  useEnvironmentSync();
  useProfileSync();
};

/**
 * Manual sync all - useful for debugging or force updates
 */
export const syncAll = () => {
  const store = useContextStore.getState();
  
  // Sync profile to user fields
  const profile = store.user.profile;
  if (profile) {
    store.user.updateUserFields({
      name: profile.nickname || profile.fullName,
      dob: profile.dateOfBirth,
      username: profile.uniqueId,
    });
  }
  
  // Sync environment context
  store.user.updateEnvironmentContext();
};

/**
 * Environment data validation
 * Checks if environment context is up-to-date with source data
 */
export const validateEnvironmentSync = () => {
  const state = useContextStore.getState();
  
  const issues: string[] = [];
  
  // Check location sync
  const hasCoords = !!state.location.coordinates;
  const hasIpLoc = !!state.location.ipLocation;
  const envHasLocation = state.user.env.lat !== 0 || state.user.env.long !== 0;
  
  if ((hasCoords || hasIpLoc) && !envHasLocation) {
    issues.push('Location data exists but environment context not synced');
  }
  
  // Check weather sync
  const hasWeather = !!state.weather.data;
  const envHasWeather = !!state.user.env.weather;
  
  if (hasWeather && !envHasWeather) {
    issues.push('Weather data exists but environment context not synced');
  }
  
  // Check device sync
  const hasDevice = !!state.device.browser || !!state.device.os;
  const envHasDevice = !!state.user.env.browser || !!state.user.env.os;
  
  if (hasDevice && !envHasDevice) {
    issues.push('Device data exists but environment context not synced');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
};