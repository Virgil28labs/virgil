/**
 * MapService Test Suite
 * 
 * Tests the MapService that handles Google Maps API interactions
 * including directions, geocoding, markers, and map controls.
 */

import type { DirectionsRequestConfig } from '../MapService';
import { MapService } from '../MapService';
import { logger } from '../../lib/logger';
import { timeService } from '../TimeService';
import { createLocationMarker } from '../../utils/googleMaps';
import type { MockGoogleMaps, MockAdvancedMarkerElement, MockMapServicePrivate } from '../../test-utils/mockTypes';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../TimeService', () => ({
  timeService: {
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
  },
}));

jest.mock('../../utils/googleMaps');

// Mock Google Maps API
const mockMap = {
  setCenter: jest.fn(),
  setZoom: jest.fn(),
  fitBounds: jest.fn(),
  panToBounds: jest.fn(),
} as unknown as google.maps.Map;

const mockDirectionsService = {
  route: jest.fn(),
};

const mockGeocoder = {
  geocode: jest.fn(),
};

const mockAdvancedMarkerElement = {
  position: { lat: 37.7749, lng: -122.4194 },
};

const mockTrafficLayer = {
  setMap: jest.fn(),
};

// Mock Google Maps classes
global.google = {
  maps: {
    DirectionsService: jest.fn(() => mockDirectionsService),
    Geocoder: jest.fn(() => mockGeocoder),
    TrafficLayer: jest.fn(() => mockTrafficLayer),
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      BICYCLING: 'BICYCLING',
      TRANSIT: 'TRANSIT',
    },
    TrafficModel: {
      BEST_GUESS: 'BEST_GUESS',
      OPTIMISTIC: 'OPTIMISTIC',
      PESSIMISTIC: 'PESSIMISTIC',
    },
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND',
      ZERO_RESULTS: 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED: 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST: 'INVALID_REQUEST',
      OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
      REQUEST_DENIED: 'REQUEST_DENIED',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    },
    marker: {
      AdvancedMarkerElement: jest.fn(() => mockAdvancedMarkerElement),
    },
  },
} as unknown as MockGoogleMaps;

const mockCreateLocationMarker = createLocationMarker as jest.MockedFunction<typeof createLocationMarker>;

describe('MapService', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateLocationMarker.mockResolvedValue(mockAdvancedMarkerElement as unknown as google.maps.marker.AdvancedMarkerElement);
    
    // Clear the WeakMap instances to ensure fresh state
    (MapService as unknown as MockMapServicePrivate).instances = new WeakMap();
  });

  describe('Singleton Pattern', () => {
    it('returns same instance for same map', () => {
      const instance1 = MapService.getInstance(mockMap);
      const instance2 = MapService.getInstance(mockMap);

      expect(instance1).toBe(instance2);
    });

    it('returns different instances for different maps', () => {
      const mockMap2 = { different: 'map' } as unknown as google.maps.Map;
      
      const instance1 = MapService.getInstance(mockMap);
      const instance2 = MapService.getInstance(mockMap2);

      expect(instance1).not.toBe(instance2);
    });

    it('initializes services on creation', () => {
      MapService.getInstance(mockMap);

      expect(google.maps.DirectionsService).toHaveBeenCalled();
      expect(google.maps.Geocoder).toHaveBeenCalled();
    });
  });

  describe('Route Calculation', () => {
    let mapService: MapService;

    beforeEach(() => {
      mapService = MapService.getInstance(mockMap);
    });

    it('calculates route successfully', async () => {
      const mockRoutes = [
        {
          bounds: {
            north: 37.8,
            south: 37.7,
            east: -122.3,
            west: -122.5,
          },
          legs: [
            {
              duration: { text: '30 mins', value: 1800 },
              distance: { text: '10 miles', value: 16093 },
            },
          ],
        },
      ];

      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback({ routes: mockRoutes }, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
      };

      const result = await mapService.calculateRoute(config);

      expect(result.routes).toEqual(mockRoutes);
      expect(result.status).toBe('OK');
      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'San Francisco, CA',
          destination: 'Oakland, CA',
          travelMode: 'DRIVING',
          provideRouteAlternatives: true,
          drivingOptions: {
            departureTime: new Date('2024-01-20T12:00:00'),
            trafficModel: 'BEST_GUESS',
          },
        }),
        expect.any(Function),
      );
    });

    it('uses custom travel mode', async () => {
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback({ routes: [] }, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
        travelMode: google.maps.TravelMode.WALKING,
      };

      await mapService.calculateRoute(config);

      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          travelMode: 'WALKING',
        }),
        expect.any(Function),
      );
    });

    it('uses custom departure time', async () => {
      const customTime = new Date('2024-02-01T15:30:00');
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback({ routes: [] }, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
        departureTime: customTime,
      };

      await mapService.calculateRoute(config);

      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          drivingOptions: expect.objectContaining({
            departureTime: customTime,
          }),
        }),
        expect.any(Function),
      );
    });

    it('uses current time when departureTime is "now"', async () => {
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback({ routes: [] }, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
        departureTime: 'now',
      };

      await mapService.calculateRoute(config);

      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          drivingOptions: expect.objectContaining({
            departureTime: new Date('2024-01-20T12:00:00'),
          }),
        }),
        expect.any(Function),
      );
    });

    it('disables route alternatives when specified', async () => {
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback({ routes: [] }, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
        provideAlternatives: false,
      };

      await mapService.calculateRoute(config);

      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          provideRouteAlternatives: false,
        }),
        expect.any(Function),
      );
    });

    it('handles directions service errors', async () => {
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback(null, 'NOT_FOUND');
      });

      const config: DirectionsRequestConfig = {
        origin: 'Invalid Location',
        destination: 'Another Invalid Location',
      };

      await expect(mapService.calculateRoute(config)).rejects.toThrow('NOT_FOUND');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Directions calculation failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'MapService',
          action: 'calculateRoute',
          metadata: {
            origin: 'Invalid Location',
            destination: 'Another Invalid Location',
          },
        }),
      );
    });

    it('throws error when DirectionsService not initialized', async () => {
      // Create service with null directionsService
      const mapService = MapService.getInstance(mockMap);
      (mapService as unknown as MockMapServicePrivate).directionsService = null;

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
      };

      await expect(mapService.calculateRoute(config)).rejects.toThrow('DirectionsService not initialized');
    });
  });

  describe('Geocoding', () => {
    let mapService: MapService;

    beforeEach(() => {
      mapService = MapService.getInstance(mockMap);
    });

    it('geocodes location successfully', async () => {
      const mockResults = [
        {
          formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
          geometry: {
            location: { lat: () => 37.4224764, lng: () => -122.0842499 },
          },
        },
      ];

      mockGeocoder.geocode.mockImplementation((_request, callback) => {
        callback(mockResults, 'OK');
      });

      const location = { lat: 37.4224764, lng: -122.0842499 };
      const address = await mapService.geocodeLocation(location);

      expect(address).toBe('1600 Amphitheatre Parkway, Mountain View, CA 94043, USA');
      expect(mockGeocoder.geocode).toHaveBeenCalledWith(
        { location },
        expect.any(Function),
      );
    });

    it('returns empty string when no results', async () => {
      mockGeocoder.geocode.mockImplementation((_request, callback) => {
        callback([], 'OK');
      });

      const location = { lat: 0, lng: 0 };
      const address = await mapService.geocodeLocation(location);

      expect(address).toBe('');
    });

    it('handles geocoding errors', async () => {
      mockGeocoder.geocode.mockImplementation((_request, callback) => {
        callback(null, 'ZERO_RESULTS');
      });

      const location = { lat: 0, lng: 0 };
      const address = await mapService.geocodeLocation(location);

      expect(address).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Geocoding failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'MapService',
          action: 'geocodeLocation',
          metadata: { location },
        }),
      );
    });

    it('throws error when Geocoder not initialized', async () => {
      const mapService = MapService.getInstance(mockMap);
      (mapService as unknown as MockMapServicePrivate).geocoder = null;

      const location = { lat: 37.4224764, lng: -122.0842499 };

      await expect(mapService.geocodeLocation(location)).rejects.toThrow('Geocoder not initialized');
    });
  });

  describe('Marker Creation', () => {
    let mapService: MapService;

    beforeEach(() => {
      mapService = MapService.getInstance(mockMap);
    });

    it('creates marker successfully', async () => {
      const position = { lat: 37.7749, lng: -122.4194 };
      
      const marker = await mapService.createMarker(position);

      expect(marker).toBe(mockAdvancedMarkerElement);
      expect(mockCreateLocationMarker).toHaveBeenCalledWith(position, mockMap);
    });

    it('handles marker creation errors', async () => {
      const error = new Error('Marker creation failed');
      mockCreateLocationMarker.mockRejectedValue(error);

      const position = { lat: 37.7749, lng: -122.4194 };

      await expect(mapService.createMarker(position)).rejects.toThrow('Marker creation failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Marker creation failed',
        error,
        expect.objectContaining({
          component: 'MapService',
          action: 'createMarker',
          metadata: { position },
        }),
      );
    });
  });

  describe('Traffic Layer', () => {
    let mapService: MapService;

    beforeEach(() => {
      mapService = MapService.getInstance(mockMap);
    });

    it('creates traffic layer', () => {
      const trafficLayer = mapService.createTrafficLayer();

      expect(trafficLayer).toBe(mockTrafficLayer);
      expect(google.maps.TrafficLayer).toHaveBeenCalled();
    });
  });

  describe('Map View Controls', () => {
    let mapService: MapService;

    beforeEach(() => {
      mapService = MapService.getInstance(mockMap);
    });

    it('sets map view with center and zoom', () => {
      const center = { lat: 37.7749, lng: -122.4194 };
      const zoom = 12;

      mapService.setView(center, zoom);

      expect(mockMap.setCenter).toHaveBeenCalledWith(center);
      expect(mockMap.setZoom).toHaveBeenCalledWith(zoom);
    });

    it('fits route bounds with default padding', () => {
      const route = {
        bounds: {
          north: 37.8,
          south: 37.7,
          east: -122.3,
          west: -122.5,
        },
      } as unknown as google.maps.DirectionsRoute;

      mapService.fitRouteBounds(route);

      expect(mockMap.fitBounds).toHaveBeenCalledWith(
        route.bounds,
        {
          top: 100,
          right: 50,
          bottom: 150,
          left: 50,
        },
      );
    });

    it('fits route bounds with custom padding', () => {
      const route = {
        bounds: {
          north: 37.8,
          south: 37.7,
          east: -122.3,
          west: -122.5,
        },
      } as unknown as google.maps.DirectionsRoute;

      const customPadding = {
        top: 200,
        right: 100,
        bottom: 300,
        left: 100,
      };

      mapService.fitRouteBounds(route, customPadding);

      expect(mockMap.fitBounds).toHaveBeenCalledWith(route.bounds, customPadding);
    });

    it('does not fit bounds when route has no bounds', () => {
      const route = {} as google.maps.DirectionsRoute;

      mapService.fitRouteBounds(route);

      expect(mockMap.fitBounds).not.toHaveBeenCalled();
    });

    it('pans to route bounds with default padding', () => {
      const route = {
        bounds: {
          north: 37.8,
          south: 37.7,
          east: -122.3,
          west: -122.5,
        },
      } as unknown as google.maps.DirectionsRoute;

      mapService.panToRouteBounds(route);

      expect(mockMap.panToBounds).toHaveBeenCalledWith(
        route.bounds,
        {
          top: 100,
          right: 50,
          bottom: 150,
          left: 50,
        },
      );
    });

    it('pans to route bounds with custom padding', () => {
      const route = {
        bounds: {
          north: 37.8,
          south: 37.7,
          east: -122.3,
          west: -122.5,
        },
      } as unknown as google.maps.DirectionsRoute;

      const customPadding = {
        top: 200,
        right: 100,
        bottom: 300,
        left: 100,
      };

      mapService.panToRouteBounds(route, customPadding);

      expect(mockMap.panToBounds).toHaveBeenCalledWith(route.bounds, customPadding);
    });

    it('does not pan when route has no bounds', () => {
      const route = {} as google.maps.DirectionsRoute;

      mapService.panToRouteBounds(route);

      expect(mockMap.panToBounds).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('cleans up service instances', () => {
      const mapService = MapService.getInstance(mockMap);

      mapService.cleanup();

      const privateService = mapService as unknown as MockMapServicePrivate;
      expect(privateService.directionsService).toBeNull();
      expect(privateService.geocoder).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      MapService.getInstance(mockMap);
    });

    it('handles promise rejection in directions service', async () => {
      // Ensure service is initialized
      const freshMapService = MapService.getInstance(mockMap);
      
      mockDirectionsService.route.mockImplementation((_request, _callback) => {
        // Simulate an internal error in the directions service
        throw new Error('Internal service error');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
      };

      await expect(freshMapService.calculateRoute(config)).rejects.toThrow('Internal service error');
    });

    it('handles promise rejection in geocoder', async () => {
      // Ensure service is initialized
      const freshMapService = MapService.getInstance(mockMap);
      
      mockGeocoder.geocode.mockImplementation((_request, _callback) => {
        // Simulate an internal error in the geocoder
        throw new Error('Geocoder service error');
      });

      const location = { lat: 37.4224764, lng: -122.0842499 };

      // The service catches errors and returns empty string
      const result = await freshMapService.geocodeLocation(location);
      expect(result).toBe('');
      
      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Geocoding failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'MapService',
          action: 'geocodeLocation',
          metadata: { location },
        }),
      );
    });

    it('handles malformed geocoding results', async () => {
      // Ensure service is initialized
      const freshMapService = MapService.getInstance(mockMap);
      
      mockGeocoder.geocode.mockImplementation((_request, callback) => {
        callback([{ malformed: 'result' }], 'OK');
      });

      const location = { lat: 37.4224764, lng: -122.0842499 };
      const address = await freshMapService.geocodeLocation(location);

      expect(address).toBe('');
    });

    it('handles null results in directions', async () => {
      // Ensure service is initialized
      const freshMapService = MapService.getInstance(mockMap);
      
      mockDirectionsService.route.mockImplementation((_request, callback) => {
        callback(null, 'OK');
      });

      const config: DirectionsRequestConfig = {
        origin: 'San Francisco, CA',
        destination: 'Oakland, CA',
      };

      await expect(freshMapService.calculateRoute(config)).rejects.toThrow('OK');
    });
  });
});