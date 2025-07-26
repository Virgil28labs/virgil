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

export interface IpLocation {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  // Extended fields for hover card
  flag?: string; // Emoji flag
  isp?: string; // Internet Service Provider
  org?: string; // Organization name
  type?: string; // Connection type (residential/hosting/vpn)
  postal?: string; // Postal code
  connection?: {
    asn?: number; // Autonomous System Number
    domain?: string; // Associated domain
  };
  timezone_details?: {
    current_time?: string; // Current time at IP location
    offset?: number; // UTC offset in seconds
    is_dst?: boolean; // Daylight saving time
  };
}

export interface LocationData {
  coordinates?: Coordinates;
  address?: Address;
  ipLocation?: IpLocation;
  timestamp: number;
}

export interface LocationState {
  coordinates: Coordinates | null;
  address: Address | null;
  ipLocation: IpLocation | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionStatus;
  lastUpdated: number | null;
  initialized: boolean;
}

export interface LocationContextValue extends LocationState {
  fetchLocationData: (forceRefresh?: boolean) => Promise<void>;
  requestLocationPermission: () => Promise<void>;
  clearError: () => void;
  hasLocation: boolean;
  hasGPSLocation: boolean;
  hasIpLocation: boolean;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unavailable';

export type LocationActionType =
  | 'SET_LOADING'
  | 'SET_LOCATION_DATA'
  | 'SET_ERROR'
  | 'SET_PERMISSION_STATUS'
  | 'CLEAR_ERROR';

export type LocationAction =
  | { type: 'SET_LOCATION_DATA'; payload: LocationData }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PERMISSION_STATUS'; payload: PermissionStatus }
  | { type: 'CLEAR_ERROR' };

export interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}
