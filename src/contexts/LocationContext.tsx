import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { locationService } from '../lib/locationService'
import type { 
  LocationContextType, 
  LocationState, 
  LocationAction,
  Coordinates,
  Address,
  IPLocation 
} from '../types/location.types'

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

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const locationReducer = (state: LocationState, action: LocationAction): LocationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_LOCATION_DATA':
      return { 
        ...state, 
        coordinates: action.payload.coordinates ?? state.coordinates,
        address: action.payload.address ?? state.address,
        ipLocation: action.payload.ipLocation ?? state.ipLocation,
        loading: false, 
        error: null,
        lastUpdated: Date.now()
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

const initialState: LocationState = {
  coordinates: null,
  address: null,
  ipLocation: null,
  loading: false,
  error: null,
  permissionStatus: 'unknown',
  lastUpdated: null
}

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [state, dispatch] = useReducer(locationReducer, initialState)


  const fetchLocationData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (state.loading) {
      return;
    }

    const cacheExpiry = 5 * 60 * 1000
    const isCacheValid = state.lastUpdated && (Date.now() - state.lastUpdated) < cacheExpiry

    if (!forceRefresh && isCacheValid) {
      return
    }

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const locationData = await locationService.getFullLocationData()
      dispatch({ type: 'SET_LOCATION_DATA', payload: locationData })
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Location fetch error:', error)
      }
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }, [state.loading, state.lastUpdated])

  const checkLocationPermission = async (): Promise<void> => {
    if (!navigator.permissions) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' })
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission.state })
      
      permission.onchange = () => {
        dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission.state })
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not check location permission:', error)
      }
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' })
    }
  }

  const requestLocationPermission = async (): Promise<void> => {
    try {
      await locationService.getCurrentPosition()
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'granted' })
      await fetchLocationData(true)
    } catch (error: any) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'denied' })
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  useEffect(() => {
    checkLocationPermission()
  }, [])

  useEffect(() => {
    // Always attempt to fetch location if permission is granted, unavailable, or unknown
    if (
      state.permissionStatus === 'granted' ||
      state.permissionStatus === 'unavailable' ||
      state.permissionStatus === 'unknown'
    ) {
      fetchLocationData()
    }
  }, [state.permissionStatus, fetchLocationData])

  // Optimized debug logging (performance optimization)
  useEffect(() => {
    // Only log in development and throttle logs to prevent performance impact
    if (process.env.NODE_ENV === 'development' && state.lastUpdated) {
      const logData = {
        coordinates: !!state.coordinates,
        address: !!state.address,
        ipLocation: !!state.ipLocation,
        loading: state.loading,
        error: !!state.error,
        permissionStatus: state.permissionStatus
      };
      
      // Throttle logging to prevent spam
      const lastLog = sessionStorage.getItem('last-location-log');
      const now = Date.now();
      if (!lastLog || now - parseInt(lastLog) > 2000) {
        console.log('📍 [LocationContext] State update:', logData);
        sessionStorage.setItem('last-location-log', now.toString());
        
        if (state.coordinates) {
          console.log('📍 [LocationContext] GPS:', {
            lat: state.coordinates.latitude.toFixed(6),
            lon: state.coordinates.longitude.toFixed(6),
            accuracy: Math.round(state.coordinates.accuracy)
          });
        }
      }
    }
  }, [state.lastUpdated, state.coordinates, state.error, state.loading]);

  // Memoized context value to prevent unnecessary re-renders (performance optimization)
  const value: LocationContextType = useMemo(() => ({
    ...state,
    fetchLocationData,
    requestLocationPermission,
    clearError,
    hasLocation: !!state.coordinates,
    hasGPSLocation: !!state.coordinates,
    hasIPLocation: !!state.ipLocation
  }), [
    state, 
    fetchLocationData, 
    requestLocationPermission, 
    clearError
  ])

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation(): LocationContextType {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}