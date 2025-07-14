import type {
  Coordinates,
  Address,
  IPLocation,
  LocationData,
  GeolocationError
} from '../types/location.types'

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
          timeout: 10000,
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
    } catch (error) {
      console.error('Error fetching address:', error);
      throw new Error('Failed to get address from coordinates');
    }
  },


  async getIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error('Failed to fetch IP address');
      }
      const data: { ip: string } = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
      throw new Error('Failed to get IP address');
    }
  },

  async getIPLocation(ip: string): Promise<IPLocation> {
    try {
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
    } catch (error) {
      console.error('Error fetching IP location:', error);
      throw new Error('Failed to get location from IP');
    }
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
    } catch (error) {
      console.error('Error fetching elevation:', error);
      throw new Error('Failed to get elevation data');
    }
  },

  async getFullLocationData(): Promise<LocationData> {
    const locationData: LocationData = {
      timestamp: Date.now()
    };

    // Get IP information
    try {
      const ip = await this.getIPAddress();
      const ipLocation = await this.getIPLocation(ip);
      locationData.ipLocation = ipLocation;
    } catch (error) {
      console.error('Failed to get IP location:', error);
      // Still set a basic IP location object with just the IP
      try {
        const ip = await this.getIPAddress();
        locationData.ipLocation = { ip: ip };
      } catch (ipError) {
        console.error('Failed to get even basic IP:', ipError);
      }
    }

    // Try to get GPS location (may fail due to permissions)
    try {
      const coords = await this.getCurrentPosition();
      locationData.coordinates = coords;
      
      // Try to get address
      try {
        locationData.address = await this.getAddressFromCoordinates(
          coords.latitude, 
          coords.longitude
        );
      } catch (addressError) {
        console.warn('Failed to get address:', addressError.message);
      }
      
      // Try to get elevation
      try {
        const elevationData = await this.getElevation(coords.latitude, coords.longitude);
        locationData.coordinates = {
          ...coords,
          elevation: elevationData.elevation,
          elevationUnit: 'meters'
        };
      } catch (elevationError) {
        console.warn('Failed to get elevation:', elevationError.message);
        // Continue without elevation data
      }
    } catch (error) {
      console.warn('Failed to get GPS location:', error.message);
      // Don't set null values - let the context preserve existing data
    }

    return locationData;
  }
};