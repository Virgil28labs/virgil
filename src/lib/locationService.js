export const locationService = {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
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
        (error) => {
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

  async getAddressFromCoordinates(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json();
      const address = data.address || {};
      
      return {
        street: address.road || '',
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

  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error('Failed to fetch IP address');
      }
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
      throw new Error('Failed to get IP address');
    }
  },

  async getLocationFromIP(ip) {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!response.ok) {
        throw new Error('Failed to fetch location from IP');
      }
      const data = await response.json();
      
      if (data.error) {
        console.warn('IP geolocation service error:', data.reason || data.message);
        throw new Error(data.message || 'IP geolocation service unavailable');
      }
      
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        asn: data.asn
      };
    } catch (error) {
      console.error('Error fetching location from IP:', error);
      throw new Error('Failed to get location from IP');
    }
  },

  async getFullLocationData() {
    const locationData = {
      coordinates: null,
      address: null,
      ip: null,
      ipLocation: null,
      timestamp: Date.now()
    };

    try {
      const ip = await this.getIPAddress();
      locationData.ip = ip;
      locationData.ipLocation = await this.getLocationFromIP(ip);
    } catch (error) {
      console.warn('Failed to get IP location:', error.message);
    }

    try {
      const coords = await this.getCurrentPosition();
      locationData.coordinates = coords;
      locationData.address = await this.getAddressFromCoordinates(
        coords.latitude, 
        coords.longitude
      );
    } catch (error) {
      console.warn('Failed to get GPS location:', error.message);
    }

    return locationData;
  }
};