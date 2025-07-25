import type {
  Coordinates,
  Address,
  IpLocation,
  LocationData,
} from '../types/location.types';
import { retryWithBackoff } from './retryUtils';
import { timeService } from '../services/TimeService';

// ipwho.is API response type
interface IpWhoResponse {
  success: boolean;
  message?: string;
  ip: string;
  type?: string; // IPv4 or IPv6
  continent?: string;
  continent_code?: string;
  country?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  is_eu?: boolean;
  postal?: string;
  calling_code?: string;
  capital?: string;
  borders?: string;
  flag?: {
    img?: string;
    emoji?: string;
    emoji_unicode?: string;
  };
  connection?: {
    asn?: number;
    org?: string;
    isp?: string;
    domain?: string;
  };
  timezone?: {
    id?: string;
    abbr?: string;
    is_dst?: boolean;
    offset?: number;
    utc?: string;
    current_time?: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const locationService = {
  async getCurrentPosition(): Promise<Coordinates> {
    return new Promise<Coordinates>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      // First attempt with low accuracy for faster response
      const lowAccuracyOptions: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 5000, // Shorter timeout for first attempt
        maximumAge: 300000,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // If accuracy is poor (> 100m), try once more with high accuracy
          if (position.coords.accuracy > 100) {
            try {
              const highAccuracyCoords = await this.getHighAccuracyPosition();
              resolve(highAccuracyCoords);
            } catch {
              // If high accuracy fails, use the low accuracy result
              resolve(coords);
            }
          } else {
            resolve(coords);
          }
        },
        (error: GeolocationPositionError) => {
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        lowAccuracyOptions,
      );
    });
  },

  async getHighAccuracyPosition(): Promise<Coordinates> {
    return new Promise<Coordinates>((resolve, reject) => {
      const highAccuracyOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(error);
        },
        highAccuracyOptions,
      );
    });
  },

  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<Address> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Virgil-App/1.0', // OpenStreetMap requires User-Agent
            },
          },
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch address: ${response.status}`);
        }
        
        const data = await response.json();
        const address = data.address || {};
        
        // Handle various street name fields from OpenStreetMap
        const streetName = address.road || 
                          address.pedestrian || 
                          address.footway || 
                          address.path || 
                          address.cycleway || 
                          address.residential || 
                          address.avenue ||
                          address.street ||
                          address.way ||
                          '';
        
        return {
          street: streetName,
          house_number: address.house_number || '',
          city: address.city || address.town || address.village || '',
          postcode: address.postcode || '',
          country: address.country || '',
          formatted: data.display_name || '',
        };
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (_attempt, _error) => {
          // console.log(`Retrying reverse geocoding (attempt ${_attempt}):`, _error.message);
        },
      },
    );
  },


  async getIpLocation(ip?: string): Promise<IpLocation> {
    return retryWithBackoff(
      async () => {
        // If no IP provided, ipwho.is returns info about the caller's IP
        const url = ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch IP location');
        }
        const data: IpWhoResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to get location from IP');
        }
        
        // Extract all available fields for the hover card
        const ipLocation: IpLocation = {
          ip: data.ip,
          country: data.country,
          region: data.region,
          city: data.city,
          lat: data.latitude,
          lon: data.longitude,
          timezone: typeof data.timezone === 'object' ? data.timezone?.id : data.timezone,
          // Extended fields
          flag: data.flag?.emoji,
          type: data.type,
          postal: data.postal,
        };

        // Add ISP and connection info if available
        if (data.connection) {
          ipLocation.isp = data.connection.isp;
          ipLocation.org = data.connection.org;
          ipLocation.connection = {
            asn: data.connection.asn,
            domain: data.connection.domain,
          };
        }

        // Add detailed timezone info if available
        if (typeof data.timezone === 'object' && data.timezone) {
          ipLocation.timezone_details = {
            current_time: data.timezone.current_time,
            offset: data.timezone.offset,
            is_dst: data.timezone.is_dst,
          };
        }
        
        return ipLocation;
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        onRetry: (_attempt, _error) => {
          // Retry silently
        },
      },
    );
  },

  async getElevation(latitude: number, longitude: number): Promise<{ elevation: number; elevationFeet: number }> {
    try {
      return await retryWithBackoff(
        async () => {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/elevation/coordinates/${latitude}/${longitude}`,
            {
              signal: AbortSignal.timeout(8000), // Increased to 8 second timeout
            },
          );
          
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Elevation data not available for this location');
            }
            throw new Error(`Failed to fetch elevation data: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Validate response data
          if (typeof data.elevation !== 'number' || typeof data.elevationFeet !== 'number') {
            throw new Error('Invalid elevation data format');
          }
          
          return {
            elevation: data.elevation,
            elevationFeet: data.elevationFeet,
          };
        },
        {
          maxRetries: 3, // Increased retries
          initialDelay: 1000, // Increased initial delay
          onRetry: (_attempt, _error) => {
          },
        },
      );
    } catch (_error) {
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  },

  async getQuickLocation(): Promise<LocationData> {
    // Fast IP-only location for immediate weather display
    const locationData: LocationData = {
      timestamp: timeService.getTimestamp(),
    };

    try {
      // Get IP location in one call
      const ipLocation = await this.getIpLocation();
      locationData.ipLocation = ipLocation;
      
      // Create basic address from IP data
      if (ipLocation?.city) {
        locationData.address = this.createAddressFromIpLocation(ipLocation);
      }
    } catch (_error) {
      // Return empty location data on error
    }

    return locationData;
  },

  async getFullLocationData(existingIpLocation?: IpLocation): Promise<LocationData> {
    const locationData: LocationData = {
      timestamp: timeService.getTimestamp(),
    };

    // If we already have IP location, use it; otherwise fetch it
    if (existingIpLocation) {
      locationData.ipLocation = existingIpLocation;
    } else {
      const ipLocationResult = await this.fetchIpLocationData();
      if (ipLocationResult) {
        locationData.ipLocation = ipLocationResult;
      }
    }

    // Fetch GPS location data
    try {
      const gpsResult = await this.fetchGPSLocationData();
      if (gpsResult.coordinates) {
        locationData.coordinates = gpsResult.coordinates;
      }
      if (gpsResult.address) {
        locationData.address = gpsResult.address;
      }
    } catch (_error) {
      // GPS is optional, continue without it
    }

    // If we have no GPS but have IP location, create a basic address from IP data
    if (!locationData.address && locationData.ipLocation?.city) {
      locationData.address = this.createAddressFromIpLocation(locationData.ipLocation);
    }

    return locationData;
  },

  async fetchIpLocationData(): Promise<IpLocation | undefined> {
    try {
      // Call without IP parameter to get caller's location
      return await this.getIpLocation();
    } catch (_error) {
      return undefined;
    }
  },

  async fetchGPSLocationData(): Promise<{ coordinates?: Coordinates; address?: Address }> {
    try {
      const coords = await this.getCurrentPosition();
      const result: { coordinates?: Coordinates; address?: Address } = { coordinates: coords };
      
      // Fetch address and elevation in parallel
      const [addressResult, elevationResult] = await Promise.allSettled([
        this.getAddressFromCoordinates(coords.latitude, coords.longitude),
        this.getElevation(coords.latitude, coords.longitude),
      ]);
      
      if (addressResult.status === 'fulfilled') {
        result.address = addressResult.value;
      } else {
        // Address lookup failed - non-critical, continue without address
      }
      
      if (elevationResult.status === 'fulfilled' && elevationResult.value) {
        result.coordinates = {
          ...coords,
          elevation: elevationResult.value.elevation,
          elevationUnit: 'meters',
        };
      } else {
        // Still return coordinates without elevation
        result.coordinates = coords;
      }
      
      return result;
    } catch (_error) {
      return {};
    }
  },

  createAddressFromIpLocation(ipLocation: IpLocation): Address {
    return {
      street: '',
      house_number: '',
      city: ipLocation.city || '',
      postcode: '',
      country: ipLocation.country || '',
      formatted: `${ipLocation.city || ''}, ${ipLocation.region || ''} ${ipLocation.country || ''}`.trim(),
    };
  },
};