import type { ReactNode } from 'react';
import { useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { locationService } from '../lib/locationService';
import type {
  LocationState,
  LocationAction,
  LocationContextValue,
} from '../types/location.types';
import { logger } from '../lib/logger';
import { timeService } from '../services/TimeService';
import { LocationContext } from './LocationContextInstance';

/**
 * LocationContext - Location Services State Management
 *
 * Provides GPS coordinates, IP geolocation, and address data
 * with automatic permission handling and caching.
 *
 * Features:
 * - GPS coordinates via Navigator API
 * - IP-based geolocation fallback
 * - Reverse geocoding for street addresses
 * - Permission state management
 * - Data caching with refresh intervals
 */

const locationReducer = (state: LocationState, action: LocationAction): LocationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_LOCATION_DATA':
      return {
        ...state,
        coordinates: action.payload.coordinates ?? state.coordinates,
        address: action.payload.address ?? state.address,
        ipLocation: action.payload.ipLocation ?? state.ipLocation,
        locationSource: action.payload.source ?? (action.payload.coordinates ? 'gps' : 'ip'),
        loading: false,
        error: null,
        lastUpdated: timeService.getTimestamp(),
        initialized: true,
        gpsRetrying: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, gpsRetrying: false };
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.payload };
    case 'SET_LOCATION_SOURCE':
      return { ...state, locationSource: action.payload };
    case 'SET_GPS_RETRY_STATUS':
      return { ...state, canRetryGPS: action.payload.canRetry, gpsRetrying: action.payload.retrying };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: LocationState = {
  coordinates: null,
  address: null,
  ipLocation: null,
  loading: false,  // Start with loading false to allow initial fetch
  error: null,
  permissionStatus: 'unknown',
  lastUpdated: null,
  initialized: false,
  locationSource: null,
  canRetryGPS: false,
  gpsRetrying: false,
};

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [state, dispatch] = useReducer(locationReducer, initialState);
  const gpsRequestInProgressRef = useRef(false);

  const fetchLocationData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // Skip if already loading and not forcing refresh
    if (state.loading && !forceRefresh) {
      return;
    }

    const cacheExpiry = 5 * 60 * 1000;
    const isCacheValid = state.lastUpdated && (timeService.getTimestamp() - state.lastUpdated) < cacheExpiry;

    if (!forceRefresh && isCacheValid) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // First, get quick IP location for immediate weather display
      const quickLocation = await locationService.getQuickLocation();
      if (quickLocation.ipLocation) {
        dispatch({ type: 'SET_LOCATION_DATA', payload: quickLocation });
      } else {
        // If no quick location, still set loading to false
        dispatch({ type: 'SET_LOADING', payload: false });
      }

      // Then enhance with GPS data in the background (non-blocking)
      // Check if GPS request is already in progress to prevent concurrent calls
      if (!gpsRequestInProgressRef.current) {
        gpsRequestInProgressRef.current = true;

        // Check GPS permission status first
        const permissionInfo = await locationService.checkLocationPermission();
        dispatch({ type: 'SET_GPS_RETRY_STATUS', payload: { canRetry: permissionInfo.canRetry, retrying: false } });

        // Add warm-up delay to let location services initialize
        setTimeout(() => {
          // Pass the existing IP location to avoid duplicate fetching
          locationService.getFullLocationData(quickLocation.ipLocation).then(async (fullLocationData) => {
            // Only update if we got GPS coordinates or better address
            if (fullLocationData.coordinates ||
                (fullLocationData.address?.street && !state.address?.street)) {
              
              const source = fullLocationData.coordinates ? 'gps' : 'ip';
              dispatch({ type: 'SET_LOCATION_DATA', payload: { ...fullLocationData, source } });
            }
          }).catch((error) => {
            // Log GPS errors but don't show to user since we have IP location
            logger.warn('GPS location failed, using IP fallback', {
              component: 'LocationContext',
              action: 'fetchLocationData',
              metadata: { error: (error as Error).message },
            });
            
            // Update retry status based on error type
            const canRetry = !(error as Error).message.includes('denied');
            dispatch({ type: 'SET_GPS_RETRY_STATUS', payload: { canRetry, retrying: false } });
          }).finally(() => {
            gpsRequestInProgressRef.current = false;
          });
        }, 500); // 500ms warm-up delay
      }
    } catch (_error: unknown) {
      logger.error('Location fetch error', _error as Error, {
        component: 'LocationContext',
        action: 'updateLocationDataFromIP',
      });
      dispatch({ type: 'SET_ERROR', payload: _error instanceof Error ? _error.message : 'Failed to fetch location' });
    }
  }, [state.loading, state.lastUpdated, state.address]);

  const checkLocationPermission = useCallback(async (): Promise<() => void | undefined> => {
    if (!navigator.permissions) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' });
      return () => {};
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission.state });

      // Store permission listener for cleanup
      const handlePermissionChange = () => {
        dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission.state });
      };
      permission.addEventListener('change', handlePermissionChange);

      // Return cleanup function
      return () => {
        permission.removeEventListener('change', handlePermissionChange);
      };
    } catch (_error: unknown) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' });
      return () => {};
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<void> => {
    try {
      await locationService.getCurrentPosition();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'granted' });
      await fetchLocationData(true);
    } catch (_error: unknown) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'denied' });
      dispatch({ type: 'SET_ERROR', payload: _error instanceof Error ? _error.message : 'Failed to fetch location' });
    }
  }, [fetchLocationData]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const retryGPSLocation = useCallback(async (): Promise<void> => {
    if (state.gpsRetrying || !state.canRetryGPS) {
      return;
    }

    dispatch({ type: 'SET_GPS_RETRY_STATUS', payload: { canRetry: state.canRetryGPS, retrying: true } });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      logger.info('Manual GPS retry initiated', {
        component: 'LocationContext',
        action: 'retryGPSLocation',
      });

      const coords = await locationService.retryGPSLocation();
      
      // Get enriched location data (address + elevation)
      const enrichedData = await locationService.enrichLocationData(coords.latitude, coords.longitude);
      
      // Add elevation to coordinates if available
      if (enrichedData.elevation) {
        coords.elevation = enrichedData.elevation.elevation;
      }
      
      dispatch({ 
        type: 'SET_LOCATION_DATA', 
        payload: { 
          coordinates: coords, 
          address: enrichedData.address, 
          timestamp: timeService.getTimestamp(),
          source: 'gps',
        }, 
      });

      logger.info('Manual GPS retry successful', {
        component: 'LocationContext',
        action: 'retryGPSLocation',
        metadata: { accuracy: coords.accuracy },
      });

    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Manual GPS retry failed', error as Error, {
        component: 'LocationContext',
        action: 'retryGPSLocation',
      });

      dispatch({ type: 'SET_ERROR', payload: `GPS retry failed: ${errorMessage}` });
      
      // Update retry status based on error
      const canRetry = !errorMessage.includes('denied');
      dispatch({ type: 'SET_GPS_RETRY_STATUS', payload: { canRetry, retrying: false } });
    }
  }, [state.gpsRetrying, state.canRetryGPS]);

  useEffect(() => {
    // Check location permission on mount
    const cleanup = checkLocationPermission();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [checkLocationPermission]);

  useEffect(() => {
    // Always attempt to fetch location if permission is granted, unavailable, or unknown
    if (
      state.permissionStatus === 'granted' ||
      state.permissionStatus === 'unavailable' ||
      state.permissionStatus === 'unknown'
    ) {
      // Check state internally to avoid dependency
      const timeSinceLastUpdate = timeService.getTimestamp() - (state.lastUpdated || 0);
      const cacheExpiry = 5 * 60 * 1000;
      if (!state.loading && timeSinceLastUpdate > cacheExpiry) {
        fetchLocationData();
      }
    }
  }, [state.permissionStatus, state.loading, state.lastUpdated, fetchLocationData]);

  // Memoized context value to prevent unnecessary re-renders (performance optimization)
  const value: LocationContextValue = useMemo(() => ({
    ...state,
    fetchLocationData,
    requestLocationPermission,
    retryGPSLocation,
    clearError,
    hasLocation: !!(state.coordinates || state.ipLocation),
    hasGPSLocation: !!state.coordinates,
    hasIpLocation: !!state.ipLocation,
    isPreciseLocation: state.locationSource === 'gps',
    initialized: true,  // Always initialized after mount
  }), [
    state,
    fetchLocationData,
    requestLocationPermission,
    retryGPSLocation,
    clearError,
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}
