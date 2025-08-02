import type {
  Coordinates,
  Address,
  IpLocation,
  LocationData,
} from '../types/location.types';
import { retryWithBackoff } from './retryUtils';
import { timeService } from '../services/TimeService';
import { logger } from './logger';

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


export const locationService = {
  async getCurrentPosition(): Promise<Coordinates> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    // Progressive GPS acquisition strategy
    const strategies = [
      {
        name: 'quick-lowaccuracy',
        options: {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 60000, // 1 minute
        },
      },
      {
        name: 'precise-highaccuracy',
        options: {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000, // 5 minutes
        },
      },
      {
        name: 'fallback-mediumaccuracy',
        options: {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000, // 10 minutes
        },
      },
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        logger.info(`Attempting GPS acquisition: ${strategy.name}`, {
          component: 'locationService',
          action: 'getCurrentPosition',
          metadata: { strategy: strategy.name },
        });

        const coords = await this.getPositionWithOptions(strategy.options);
        
        logger.info(`GPS acquisition successful: ${strategy.name}`, {
          component: 'locationService',
          action: 'getCurrentPosition',
          metadata: { 
            strategy: strategy.name,
            accuracy: coords.accuracy,
            timestamp: coords.timestamp,
          },
        });

        return coords;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`GPS acquisition failed: ${strategy.name}`, {
          component: 'locationService',
          action: 'getCurrentPosition',
          metadata: { 
            strategy: strategy.name,
            error: (error as Error).message,
          },
        });

        // If permission denied, don't try other strategies
        if (error instanceof Error && error.message.includes('denied')) {
          break;
        }
      }
    }

    // All strategies failed
    throw lastError || new Error('All GPS acquisition strategies failed');
  },

  async getPositionWithOptions(options: PositionOptions): Promise<Coordinates> {
    return new Promise<Coordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          resolve(coords);
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
        options,
      );
    });
  },

  async checkLocationPermission(): Promise<{ 
    status: 'granted' | 'denied' | 'prompt' | 'unsupported';
    canRetry: boolean;
  }> {
    if (!navigator.geolocation) {
      return { status: 'unsupported', canRetry: false };
    }

    // Check if Permissions API is available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return {
          status: permission.state as 'granted' | 'denied' | 'prompt',
          canRetry: permission.state !== 'denied',
        };
      } catch (error) {
        logger.warn('Permissions API not available', {
          component: 'locationService',
          action: 'checkLocationPermission',
          metadata: { error: (error as Error).message },
        });
      }
    }

    // Fallback: assume we can try (user will be prompted)
    return { status: 'prompt', canRetry: true };
  },

  async retryGPSLocation(): Promise<Coordinates> {
    logger.info('Manual GPS retry requested', {
      component: 'locationService',
      action: 'retryGPSLocation',
    });
    
    // Force fresh GPS acquisition (no cache)
    const coords = await this.getPositionWithOptions({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0, // Force fresh position
    });
    
    return coords;
  },

  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<Address> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
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
        
        // Check if we got a valid response
        if (!data || data.error) {
          throw new Error(data.error || 'No address found for coordinates');
        }

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
          city: address.city || address.town || address.village || address.suburb || '',
          postcode: address.postcode || '',
          country: address.country || '',
          formatted: data.display_name || `${streetName} ${address.house_number || ''}, ${address.city || address.town || address.village || ''}, ${address.country || ''}`.trim(),
        };
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        onRetry: (_attempt, _error) => {
          // Retry logic handled by retryWithBackoff
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
    } catch (error) {
      // Return empty location data on error
      logger.error('Failed to get quick location', error as Error, {
        component: 'locationService',
        action: 'getQuickLocation',
      });
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
    } catch (error) {
      // GPS is optional, continue without it
      logger.error('Failed to get GPS location data', error as Error, {
        component: 'locationService',
        action: 'getFullLocationData',
      });
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
    } catch (error) {
      logger.error('Failed to fetch IP location data', error as Error, {
        component: 'locationService',
        action: 'fetchIpLocationData',
      });
      return undefined;
    }
  },

  async fetchGPSLocationData(): Promise<{ coordinates?: Coordinates; address?: Address }> {
    try {
      const coords = await this.getCurrentPosition();
      const result: { coordinates?: Coordinates; address?: Address } = { coordinates: coords };

      // Fetch address for the coordinates
      try {
        const address = await this.getAddressFromCoordinates(coords.latitude, coords.longitude);
        result.address = address;
      } catch (error) {
        // Address lookup failed - non-critical, continue without address
        logger.error('Address lookup failed', error as Error, {
          component: 'locationService',
          action: 'fetchGPSLocationData',
          metadata: { coords },
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch GPS location data', error as Error, {
        component: 'locationService',
        action: 'fetchGPSLocationData',
      });
      return {};
    }
  },

  async fetchElevationData(latitude: number, longitude: number): Promise<{ elevation: number } | null> {
    try {
      const response = await fetch(`/api/v1/elevation/coordinates/${latitude}/${longitude}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch elevation: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        elevation: data.elevation,
      };
    } catch (error) {
      logger.error('Failed to fetch elevation data', error as Error, {
        component: 'locationService',
        action: 'fetchElevationData',
        metadata: { latitude, longitude },
      });
      return null;
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
