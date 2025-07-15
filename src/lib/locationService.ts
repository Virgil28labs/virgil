import type {
  Coordinates,
  Address,
  IPLocation,
  LocationData,
  GeolocationError
} from '../types/location.types'
import { retryWithBackoff } from './retryUtils'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const locationService = {
  async getCurrentPosition(): Promise<Coordinates> {
    return new Promise<Coordinates>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
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
        {
          enableHighAccuracy: true,
          timeout: 3000, // Reduced from 10s to 3s for faster response
          maximumAge: 300000
        }
      );
    });
  },

  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<Address> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data: any = await response.json();
      const address: any = data.address || {};
      
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
        formatted: data.display_name || ''
      };
    } catch (_error) {
      throw new Error('Failed to get address from coordinates');
    }
  },



  async getIPAddress(): Promise<string> {
    return retryWithBackoff(
      async () => {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) {
          throw new Error('Failed to fetch IP address');
        }
        const data: { ip: string } = await response.json();
        return data.ip;
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        onRetry: (_attempt, _error) => {
          // Retry silently
        }
      }
    );
  },

  async getIPLocation(ip: string): Promise<IPLocation> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        if (!response.ok) {
          throw new Error('Failed to fetch IP location');
        }
        const data: any = await response.json();
        
        if (data.error) {
          throw new Error(data.reason || 'Failed to get location from IP');
        }
        
        return {
          ip: data.ip,
          country: data.country_name,
          region: data.region,
          city: data.city,
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone
        };
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        onRetry: (_attempt, _error) => {
          // Retry silently
        }
      }
    );
  },

  async getElevation(latitude: number, longitude: number): Promise<{ elevation: number; elevationFeet: number }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/elevation/coordinates/${latitude}/${longitude}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch elevation data');
      }
      
      const data = await response.json();
      return {
        elevation: data.elevation,
        elevationFeet: data.elevationFeet
      };
    } catch (_error) {
      throw new Error('Failed to get elevation data');
    }
  },

  async getQuickLocation(): Promise<LocationData> {
    // Fast IP-only location for immediate weather display
    const locationData: LocationData = {
      timestamp: Date.now()
    };

    try {
      const ip = await this.getIPAddress();
      const ipLocation = await this.getIPLocation(ip);
      locationData.ipLocation = ipLocation;
      
      // Create basic address from IP data
      if (ipLocation?.city) {
        locationData.address = this.createAddressFromIPLocation(ipLocation);
      }
    } catch (_error) {
      // Return empty location data on error
    }

    return locationData;
  },

  async getFullLocationData(existingIPLocation?: IPLocation): Promise<LocationData> {
    const locationData: LocationData = {
      timestamp: Date.now()
    };

    // If we already have IP location, use it; otherwise fetch it
    if (existingIPLocation) {
      locationData.ipLocation = existingIPLocation;
    } else {
      const ipLocationResult = await this.fetchIPLocationData();
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
      locationData.address = this.createAddressFromIPLocation(locationData.ipLocation);
    }

    return locationData;
  },

  async fetchIPLocationData(): Promise<IPLocation | undefined> {
    try {
      const ip = await this.getIPAddress();
      return await this.getIPLocation(ip);
    } catch (_error) {
      // Try to at least get the IP
      try {
        const ip = await this.getIPAddress();
        return { ip };
      } catch (_ipError) {
        return undefined;
      }
    }
  },

  async fetchGPSLocationData(): Promise<{ coordinates?: Coordinates; address?: Address }> {
    try {
      const coords = await this.getCurrentPosition();
      const result: { coordinates?: Coordinates; address?: Address } = { coordinates: coords };
      
      // Fetch address and elevation in parallel
      const [addressResult, elevationResult] = await Promise.allSettled([
        this.getAddressFromCoordinates(coords.latitude, coords.longitude),
        this.getElevation(coords.latitude, coords.longitude)
      ]);
      
      if (addressResult.status === 'fulfilled') {
        result.address = addressResult.value;
      }
      
      if (elevationResult.status === 'fulfilled') {
        result.coordinates = {
          ...coords,
          elevation: elevationResult.value.elevation,
          elevationUnit: 'meters'
        };
      }
      
      return result;
    } catch (_error) {
      return {};
    }
  },

  createAddressFromIPLocation(ipLocation: IPLocation): Address {
    return {
      street: '',
      house_number: '',
      city: ipLocation.city || '',
      postcode: '',
      country: ipLocation.country || '',
      formatted: `${ipLocation.city || ''}, ${ipLocation.region || ''} ${ipLocation.country || ''}`.trim()
    };
  }
};