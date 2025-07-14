/**
 * Location Services Types
 * GPS coordinates, IP geolocation, and address data
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  elevation?: number; // in meters
  elevationUnit?: 'meters' | 'feet';
}

export interface Address {
  street: string;
  house_number: string;
  city: string;
  postcode: string;
  country: string;
  formatted: string;
}

export interface IPLocation {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}

export interface LocationData {
  coordinates?: Coordinates;
  address?: Address;
  ipLocation?: IPLocation;
  timestamp: number;
}

export interface LocationState {
  coordinates: Coordinates | null;
  address: Address | null;
  ipLocation: IPLocation | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionStatus;
  lastUpdated: number | null;
}

export interface LocationContextValue extends LocationState {
  fetchLocationData: (forceRefresh?: boolean) => Promise<void>;
  requestLocationPermission: () => Promise<void>;
  clearError: () => void;
  hasLocation: boolean;
  hasGPSLocation: boolean;
  hasIPLocation: boolean;
}

export type LocationContextType = LocationContextValue;

export type PermissionStatus = 'granted' | 'denied' | 'unknown' | 'unavailable';

export type LocationActionType = 
  | 'SET_LOADING'
  | 'SET_LOCATION_DATA'
  | 'SET_ERROR'
  | 'SET_PERMISSION_STATUS'
  | 'CLEAR_ERROR';

export interface LocationAction {
  type: LocationActionType;
  payload?: any;
}

export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}