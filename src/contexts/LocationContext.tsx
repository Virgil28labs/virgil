import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import { locationService } from '../lib/locationService';
import type { 
  LocationContextValue, 
  LocationState, 
  LocationAction,
} from '../types/location.types';
import { logger } from '../lib/logger';

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

export const LocationContext = createContext<LocationContextValue | undefined>(undefined);

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
        loading: false, 
        error: null,
        lastUpdated: Date.now(),
        initialized: true,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.payload };
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
    const isCacheValid = state.lastUpdated && (Date.now() - state.lastUpdated) < cacheExpiry;

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
        
        // Pass the existing IP location to avoid duplicate fetching
        locationService.getFullLocationData(quickLocation.ipLocation).then(fullLocationData => {
          // Only update if we got GPS coordinates or better address
          if (fullLocationData.coordinates || 
              (fullLocationData.address?.street && !state.address?.street)) {
            dispatch({ type: 'SET_LOCATION_DATA', payload: fullLocationData });
          }
        }).catch(() => {
          // Silently ignore GPS errors since we already have IP location
          // This is expected behavior when location services are unavailable
        }).finally(() => {
          gpsRequestInProgressRef.current = false;
        });
      }
    } catch (error: any) {
      logger.error('Location fetch error', error as Error, {
        component: 'LocationContext',
        action: 'updateLocationDataFromIP',
      });
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

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
    } catch (error: any) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' });
      return () => {};
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<void> => {
    try {
      await locationService.getCurrentPosition();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'granted' });
      await fetchLocationData(true);
    } catch (error: any) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'denied' });
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [fetchLocationData]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

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
      const timeSinceLastUpdate = Date.now() - (state.lastUpdated || 0);
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
    clearError,
    hasLocation: !!(state.coordinates || state.ipLocation),
    hasGPSLocation: !!state.coordinates,
    hasIPLocation: !!state.ipLocation,
    initialized: true,  // Always initialized after mount
  }), [
    state, 
    fetchLocationData, 
    requestLocationPermission, 
    clearError,
  ]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}