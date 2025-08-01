import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from './useWeather';
import { useUserProfile } from './useUserProfile';
import { dashboardContextService } from '../services/DashboardContextService';

/**
 * Custom hook to sync context data with dashboard context service
 *
 * Consolidates all context synchronization logic in one place
 */
export function useContextSync() {
  const { user } = useAuth();
  const { address, ipLocation, hasGPSLocation, coordinates } = useLocation();
  const { data: weatherData, unit: weatherUnit } = useWeather();
  const { profile: userProfile } = useUserProfile();

  // Sync location context
  useEffect(() => {
    dashboardContextService.updateLocationContext({
      address,
      ipLocation,
      hasGPSLocation,
      coordinates,
      loading: false,
      error: null,
      permissionStatus: 'granted',
      hasLocation: !!(coordinates || ipLocation),
      hasIpLocation: !!ipLocation,
      initialized: true,
      lastUpdated: dashboardContextService.getTimestamp(),
      fetchLocationData: () => Promise.resolve(),
      requestLocationPermission: () => Promise.resolve(),
      clearError: () => {},
    });
  }, [address, ipLocation, hasGPSLocation, coordinates]);

  // Sync weather context
  useEffect(() => {
    dashboardContextService.updateWeatherContext({
      data: weatherData,
      unit: weatherUnit,
      loading: false,
      error: null,
      fetchWeather: () => Promise.resolve(),
      toggleUnit: () => {},
      clearError: () => {},
      hasWeather: !!weatherData,
      forecast: null,
      lastUpdated: weatherData ? dashboardContextService.getTimestamp() : null,
    });
  }, [weatherData, weatherUnit]);

  // Sync user context
  useEffect(() => {
    dashboardContextService.updateUserContext({
      user,
      loading: false,
      signOut: () => Promise.resolve({ error: undefined }),
      refreshUser: () => Promise.resolve(),
    }, userProfile);
  }, [user, userProfile]);

  // Subscribe to dashboard context updates
  useEffect(() => {
    const unsubscribe = dashboardContextService.subscribe(() => {
      // Context updates are handled by the parent component
    });

    return unsubscribe;
  }, []);
}
