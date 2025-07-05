class MapsService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
  }

  async loadGoogleMaps() {
    if (this.isLoaded) {
      return window.google;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        reject(new Error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.'));
        return;
      }

      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(window.google);
        return;
      }

      window.initGoogleMaps = () => {
        this.isLoaded = true;
        resolve(window.google);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async createMap(container, options = {}) {
    const google = await this.loadGoogleMaps();
    
    const defaultOptions = {
      zoom: 13,
      center: { lat: 37.7749, lng: -122.4194 },
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      ...options
    };

    return new google.maps.Map(container, defaultOptions);
  }

  async addMarker(map, position, options = {}) {
    const google = await this.loadGoogleMaps();
    
    const defaultOptions = {
      position,
      map,
      ...options
    };

    return new google.maps.Marker(defaultOptions);
  }

  async geocodeAddress(address) {
    const google = await this.loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const result = results[0];
          resolve({
            coordinates: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            formatted_address: result.formatted_address,
            place_id: result.place_id
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(lat, lng) {
    const google = await this.loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve({
            formatted_address: results[0].formatted_address,
            place_id: results[0].place_id,
            address_components: results[0].address_components
          });
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  async searchNearbyPlaces(location, radius = 5000, type = 'restaurant') {
    const google = await this.loadGoogleMaps();
    const service = new google.maps.places.PlacesService(document.createElement('div'));

    return new Promise((resolve, reject) => {
      const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        type
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          const places = results.map(place => ({
            name: place.name,
            place_id: place.place_id,
            rating: place.rating,
            types: place.types,
            vicinity: place.vicinity,
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            photo_url: place.photos && place.photos[0] 
              ? place.photos[0].getUrl({ maxWidth: 200 })
              : null
          }));
          resolve(places);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  async getDirections(origin, destination, travelMode = 'DRIVING') {
    const google = await this.loadGoogleMaps();
    const directionsService = new google.maps.DirectionsService();

    return new Promise((resolve, reject) => {
      directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode[travelMode]
      }, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }
}

export const mapsService = new MapsService();