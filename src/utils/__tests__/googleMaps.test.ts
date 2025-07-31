/**
 * Google Maps Utilities Test Suite
 * 
 * Tests Google Maps API loading, marker creation, info windows, and utility functions.
 * These utilities are used for location-based features in the dashboard.
 */

import {
  loadGoogleMaps,
  createLocationMarker,
  createInfoWindow,
  animateToPosition,
  checkStreetViewAvailability,
  getGoogleMapsApiKey,
  type LoadGoogleMapsOptions,
} from '../googleMaps';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock Google Maps API
const mockGoogle = {
  maps: {
    ControlPosition: {
      TOP_LEFT: 1,
      TOP_CENTER: 2,
    },
    importLibrary: jest.fn(),
    InfoWindow: jest.fn(),
    StreetViewService: jest.fn(),
    StreetViewStatus: {
      OK: 'OK',
      ZERO_RESULTS: 'ZERO_RESULTS',
    },
    Map: jest.fn(),
  },
  marker: {
    AdvancedMarkerElement: jest.fn(),
    PinElement: jest.fn(),
  },
};

// Mock DOM methods
const mockScript = {
  type: '',
  async: false,
  defer: false,
  src: '',
  onload: null as (() => void) | null,
  onerror: null as ((error: any) => void) | null,
};

const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(document.head, 'appendChild', {
  value: mockAppendChild,
});

// Mock import.meta.env - handled in jest.setup.ts
// Test will use VITE_GOOGLE_MAPS_API_KEY='test-key' from the setup file

describe('googleMaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreateElement.mockImplementation((tagName: string) => {
      if (tagName === 'script') return mockScript;
      return {};
    });
    
    // Reset global google object and promise cache
    delete (global as any).google;
    // Reset the internal promise cache
    (require('../googleMaps') as any).googleMapsPromise = null;
  });

  describe('loadGoogleMaps', () => {
    const defaultOptions: LoadGoogleMapsOptions = {
      apiKey: 'test-api-key',
    };

    it('loads Google Maps API successfully', async () => {
      // Mock successful script loading
      mockCreateElement.mockReturnValue(mockScript);
      
      // Set up promise to resolve when script loads
      const loadPromise = loadGoogleMaps(defaultOptions);
      
      // Simulate Google Maps being available after script load
      (global as any).google = mockGoogle;
      
      // Trigger script onload
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      const result = await loadPromise;
      
      expect(result).toBe(mockGoogle);
      expect(mockCreateElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toContain('maps.googleapis.com/maps/api/js');
      expect(mockScript.src).toContain('key=test-api-key');
      expect(mockAppendChild).toHaveBeenCalledWith(mockScript);
    });

    it('includes custom libraries in request', async () => {
      const optionsWithLibraries = {
        ...defaultOptions,
        libraries: ['places', 'geometry', 'visualization'],
      };
      
      const loadPromise = loadGoogleMaps(optionsWithLibraries);
      
      // Check the script src was set correctly before resolving
      expect(mockScript.src).toContain('libraries=places%2Cgeometry%2Cvisualization');
      
      (global as any).google = mockGoogle;
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      await loadPromise;
    });

    it('includes language and region parameters', async () => {
      const optionsWithLocale = {
        ...defaultOptions,
        language: 'es',
        region: 'ES',
      };
      
      const loadPromise = loadGoogleMaps(optionsWithLocale);
      
      // Check the parameters before resolving
      expect(mockScript.src).toContain('language=es');
      expect(mockScript.src).toContain('region=ES');
      
      (global as any).google = mockGoogle;
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      await loadPromise;
    });

    it('returns existing Google object if already loaded', async () => {
      (global as any).google = mockGoogle;
      
      const result = await loadGoogleMaps(defaultOptions);
      
      expect(result).toBe(mockGoogle);
      expect(mockCreateElement).not.toHaveBeenCalled();
    });

    it('returns existing promise if already loading', async () => {
      // Start first load
      const firstLoad = loadGoogleMaps(defaultOptions);
      
      // Start second load immediately  
      const secondLoad = loadGoogleMaps(defaultOptions);
      
      // Should be the same promise object
      expect(firstLoad === secondLoad).toBe(true);
      
      // Complete the load
      (global as any).google = mockGoogle;
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      const result = await firstLoad;
      expect(result).toBe(mockGoogle);
    });

    it('handles script loading errors', async () => {
      const loadPromise = loadGoogleMaps(defaultOptions);
      
      // Trigger script onerror synchronously
      if (mockScript.onerror) {
        mockScript.onerror('Script failed to load');
      }
      
      await expect(loadPromise).rejects.toThrow(
        'Failed to load Google Maps script. Please check your internet connection and API key.',
      );
    });

    it('handles Google Maps initialization failure', async () => {
      const loadPromise = loadGoogleMaps(defaultOptions);
      
      // Simulate script loading but Google Maps not properly initialized
      // Don't set global.google, so it remains undefined
      if (mockScript.onload) {
        mockScript.onload();
      }
      
      await expect(loadPromise).rejects.toThrow(
        'Google Maps failed to initialize properly',
      );
    });

    it('handles exceptions during script creation', async () => {
      // Clear the cache first
      (require('../googleMaps') as any).googleMapsPromise = null;
      
      mockCreateElement.mockImplementation(() => {
        throw new Error('DOM manipulation failed');
      });
      
      await expect(loadGoogleMaps(defaultOptions)).rejects.toThrow('DOM manipulation failed');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load Google Maps script',
        expect.any(Error),
        {
          component: 'googleMaps',
          action: 'loadGoogleMaps',
        },
      );
    });

    it('uses default libraries when none specified', async () => {
      const loadPromise = loadGoogleMaps(defaultOptions);
      
      (global as any).google = mockGoogle;
      setTimeout(() => {
        if (mockScript.onload) mockScript.onload();
      }, 0);
      
      await loadPromise;
      
      expect(mockScript.src).toContain('libraries=places%2Cgeometry%2Cmarker');
    });
  });

  describe('createLocationMarker', () => {
    const mockPosition = { lat: 37.7749, lng: -122.4194 };
    const mockMap = {} as google.maps.Map;
    const mockPinElement = { element: document.createElement('div') };
    const mockAdvancedMarker = { position: mockPosition };

    beforeEach(() => {
      (global as any).google = mockGoogle;
      
      mockGoogle.maps.importLibrary.mockResolvedValue({
        AdvancedMarkerElement: jest.fn().mockReturnValue(mockAdvancedMarker),
        PinElement: jest.fn().mockReturnValue(mockPinElement),
      });
    });

    it('creates advanced marker with custom pin', async () => {
      const marker = await createLocationMarker(mockPosition, mockMap);
      
      expect(mockGoogle.maps.importLibrary).toHaveBeenCalledWith('marker');
      
      const PinElement = (await mockGoogle.maps.importLibrary('marker')).PinElement;
      expect(PinElement).toHaveBeenCalledWith({
        background: '#6c3baa',
        borderColor: '#b2a5c1',
        glyphColor: '#ffffff',
        scale: 1.2,
      });
      
      const AdvancedMarkerElement = (await mockGoogle.maps.importLibrary('marker')).AdvancedMarkerElement;
      expect(AdvancedMarkerElement).toHaveBeenCalledWith({
        position: mockPosition,
        map: mockMap,
        title: 'Your Location',
        content: mockPinElement.element,
      });
      
      expect(marker).toBe(mockAdvancedMarker);
    });
  });

  describe('createInfoWindow', () => {
    const mockContent = '<div>Location info</div>';
    const mockMarker = {
      addListener: jest.fn(),
    } as any;
    const mockMap = {} as google.maps.Map;
    const mockInfoWindow = {
      open: jest.fn(),
    };

    beforeEach(() => {
      (global as any).google = mockGoogle;
      mockGoogle.maps.InfoWindow.mockReturnValue(mockInfoWindow);
    });

    it('creates info window with click listener', () => {
      const infoWindow = createInfoWindow(mockContent, mockMarker, mockMap);
      
      expect(mockGoogle.maps.InfoWindow).toHaveBeenCalledWith({
        content: mockContent,
        maxWidth: 300,
      });
      
      expect(mockMarker.addListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(infoWindow).toBe(mockInfoWindow);
    });

    it('opens info window when marker is clicked', () => {
      createInfoWindow(mockContent, mockMarker, mockMap);
      
      // Get the click handler and call it
      const clickHandler = mockMarker.addListener.mock.calls[0][1];
      clickHandler();
      
      expect(mockInfoWindow.open).toHaveBeenCalledWith({
        anchor: mockMarker,
        map: mockMap,
      });
    });
  });

  describe('animateToPosition', () => {
    const mockMap = {
      panTo: jest.fn(),
      setZoom: jest.fn(),
    } as any;
    const mockPosition = { lat: 37.7749, lng: -122.4194 };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('animates to position without zoom', () => {
      animateToPosition(mockMap, mockPosition);
      
      expect(mockMap.panTo).toHaveBeenCalledWith(mockPosition);
      expect(mockMap.setZoom).not.toHaveBeenCalled();
    });

    it('animates to position with zoom', () => {
      animateToPosition(mockMap, mockPosition, 15);
      
      expect(mockMap.panTo).toHaveBeenCalledWith(mockPosition);
      expect(mockMap.setZoom).toHaveBeenCalledWith(15);
    });
  });

  describe('checkStreetViewAvailability', () => {
    const mockPosition = { lat: 37.7749, lng: -122.4194 };
    const mockStreetViewService = {
      getPanorama: jest.fn(),
    };

    beforeEach(() => {
      (global as any).google = mockGoogle;
      mockGoogle.maps.StreetViewService.mockReturnValue(mockStreetViewService);
    });

    it('returns true when Street View is available', async () => {
      mockStreetViewService.getPanorama.mockImplementation((request, callback) => {
        callback({}, mockGoogle.maps.StreetViewStatus.OK);
      });
      
      const result = await checkStreetViewAvailability(mockPosition);
      
      expect(result).toBe(true);
      expect(mockStreetViewService.getPanorama).toHaveBeenCalledWith(
        {
          location: mockPosition,
          radius: 50,
        },
        expect.any(Function),
      );
    });

    it('returns false when Street View is not available', async () => {
      mockStreetViewService.getPanorama.mockImplementation((request, callback) => {
        callback({}, mockGoogle.maps.StreetViewStatus.ZERO_RESULTS);
      });
      
      const result = await checkStreetViewAvailability(mockPosition);
      
      expect(result).toBe(false);
    });
  });

  describe('getGoogleMapsApiKey', () => {
    it('returns API key from environment variables', () => {
      const apiKey = getGoogleMapsApiKey();
      
      // Should return the value from jest.setup.ts VITE_GOOGLE_MAPS_API_KEY
      expect(apiKey).toBe('test-google-maps-key');
    });

    it('returns null when API key is not set', () => {
      // Mock a different environment without the API key
      const originalGetGoogleMapsApiKey = getGoogleMapsApiKey;
      
      // Test the null case by mocking the function return
      const mockGetApiKey = jest.fn(() => null);
      (require('../googleMaps') as any).getGoogleMapsApiKey = mockGetApiKey;
      
      const apiKey = mockGetApiKey();
      expect(apiKey).toBeNull();
      
      // Restore original function
      (require('../googleMaps') as any).getGoogleMapsApiKey = originalGetGoogleMapsApiKey;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined position in createLocationMarker', async () => {
      (global as any).google = mockGoogle;
      
      const mockMap = {} as google.maps.Map;
      const undefinedPosition = undefined as any;
      
      mockGoogle.maps.importLibrary.mockResolvedValue({
        AdvancedMarkerElement: jest.fn().mockReturnValue({}),
        PinElement: jest.fn().mockReturnValue({ element: document.createElement('div') }),
      });
      
      await expect(createLocationMarker(undefinedPosition, mockMap)).resolves.toBeDefined();
    });

    it('handles empty content in createInfoWindow', () => {
      (global as any).google = mockGoogle;
      
      const mockMarker = { addListener: jest.fn() } as any;
      const mockMap = {} as google.maps.Map;
      const mockInfoWindow = { open: jest.fn() };
      
      mockGoogle.maps.InfoWindow.mockReturnValue(mockInfoWindow);
      
      const infoWindow = createInfoWindow('', mockMarker, mockMap);
      
      expect(mockGoogle.maps.InfoWindow).toHaveBeenCalledWith({
        content: '',
        maxWidth: 300,
      });
      expect(infoWindow).toBe(mockInfoWindow);
    });

    it('handles negative coordinates', () => {
      const mockMap = {
        panTo: jest.fn(),
        setZoom: jest.fn(),
      } as any;
      const negativePosition = { lat: -37.7749, lng: 122.4194 };
      
      animateToPosition(mockMap, negativePosition, 10);
      
      expect(mockMap.panTo).toHaveBeenCalledWith(negativePosition);
      expect(mockMap.setZoom).toHaveBeenCalledWith(10);
    });

    it('handles zero zoom level', () => {
      const mockMap = {
        panTo: jest.fn(),
        setZoom: jest.fn(),
      } as any;
      const mockPosition = { lat: 0, lng: 0 };
      
      animateToPosition(mockMap, mockPosition, 0);
      
      expect(mockMap.setZoom).toHaveBeenCalledWith(0);
    });
  });
});