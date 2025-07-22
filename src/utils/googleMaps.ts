/**
 * Google Maps Utilities
 * Script loader and helper functions for Google Maps integration
 */

let googleMapsPromise: Promise<typeof google> | null = null;

export interface LoadGoogleMapsOptions {
  apiKey: string;
  libraries?: string[];
  language?: string;
  region?: string;
}

/**
 * Dynamically loads the Google Maps JavaScript API
 * @param options - Configuration options for loading the API
 * @returns Promise that resolves when the API is loaded
 */
export async function loadGoogleMaps(options: LoadGoogleMapsOptions): Promise<typeof google> {
  // Return existing promise if already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Check if already loaded
  if (typeof google !== 'undefined' && google.maps) {
    return google;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    try {
      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;

      // Build URL with parameters
      const params = new URLSearchParams({
        key: options.apiKey,
        libraries: (options.libraries || ['places', 'geometry']).join(','),
        loading: 'async',
        callback: '__googleMapsCallback',
        ...(options.language && { language: options.language }),
        ...(options.region && { region: options.region })
      });

      // Create global callback
      (window as any).__googleMapsCallback = () => {
        delete (window as any).__googleMapsCallback;
      };

      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;

      // Handle load success
      script.onload = () => {
        // Add extra time for Google Maps to initialize
        setTimeout(() => {
          if (typeof google !== 'undefined' && google.maps) {
            resolve(google);
          } else {
            reject(new Error('Google Maps failed to initialize properly'));
          }
        }, 100);
      };

      // Handle load error
      script.onerror = (_error) => {
        googleMapsPromise = null;
        reject(new Error('Failed to load Google Maps script. Please check your internet connection and API key.'));
      };

      // Append to document
      document.head.appendChild(script);
    } catch (error) {
      googleMapsPromise = null;
      reject(error);
    }
  });

  return googleMapsPromise;
}

/**
 * Creates a custom marker for the user's location
 * @param position - The position for the marker
 * @param map - The map instance
 * @returns Google Maps Marker instance
 */
export function createLocationMarker(
  position: google.maps.LatLngLiteral,
  map: google.maps.Map
): google.maps.Marker {
  return new google.maps.Marker({
    position,
    map,
    title: 'Your Location',
    animation: google.maps.Animation.DROP,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#6c3baa',
      fillOpacity: 0.9,
      strokeColor: '#b2a5c1',
      strokeWeight: 3,
    }
  });
}

/**
 * Creates an info window for the location marker
 * @param content - HTML content for the info window
 * @param marker - The marker to attach the info window to
 * @param map - The map instance
 * @returns Google Maps InfoWindow instance
 */
export function createInfoWindow(
  content: string,
  marker: google.maps.Marker,
  map: google.maps.Map
): google.maps.InfoWindow {
  const infoWindow = new google.maps.InfoWindow({
    content,
    maxWidth: 300
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  return infoWindow;
}

/**
 * Animates the map to a new position
 * @param map - The map instance
 * @param position - The new position
 * @param zoom - Optional zoom level
 */
export function animateToPosition(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  zoom?: number
): void {
  map.panTo(position);
  if (zoom !== undefined) {
    map.setZoom(zoom);
  }
}

/**
 * Checks if Street View is available at a given location
 * @param position - The position to check
 * @returns Promise that resolves with availability status
 */
export async function checkStreetViewAvailability(
  position: google.maps.LatLngLiteral
): Promise<boolean> {
  return new Promise((resolve) => {
    const streetViewService = new google.maps.StreetViewService();
    
    streetViewService.getPanorama(
      {
        location: position,
        radius: 50, // Check within 50 meters
      },
      (_, status) => {
        resolve(status === google.maps.StreetViewStatus.OK);
      }
    );
  });
}

/**
 * Gets the Google Maps API key from environment variables
 * @returns The API key or null if not found
 */
export function getGoogleMapsApiKey(): string | null {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
}