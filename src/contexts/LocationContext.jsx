import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { locationService } from '../lib/locationService'

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

const LocationContext = createContext()

const locationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_LOCATION_DATA':
      return { 
        ...state, 
        ...action.payload, 
        loading: false, 
        error: null,
        lastUpdated: Date.now()
      }
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

const initialState = {
  coordinates: null,
  address: null,
  ip: null,
  ipLocation: null,
  loading: false,
  error: null,
  permissionStatus: 'unknown',
  lastUpdated: null
}

export function LocationProvider({ children }) {
  const [state, dispatch] = useReducer(locationReducer, initialState)

  const fetchLocationData = useCallback(async (forceRefresh = false) => {
    if (state.loading) return

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
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }, [state.loading, state.lastUpdated])

  const checkLocationPermission = async () => {
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
    } catch (error) {
      console.warn('Could not check location permission:', error)
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'unavailable' })
    }
  }

  const requestLocationPermission = async () => {
    try {
      await locationService.getCurrentPosition()
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'granted' })
      await fetchLocationData(true)
    } catch (error) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: 'denied' })
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  useEffect(() => {
    checkLocationPermission()
    
    if (state.permissionStatus === 'granted') {
      fetchLocationData()
    }
  }, [state.permissionStatus, fetchLocationData])

  const value = {
    ...state,
    fetchLocationData,
    requestLocationPermission,
    clearError,
    hasLocation: !!(state.coordinates || state.ipLocation),
    hasGPSLocation: !!state.coordinates,
    hasIPLocation: !!state.ipLocation
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}