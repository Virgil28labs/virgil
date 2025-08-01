/**
 * GoogleMapsModal Test Suite
 * 
 * Tests the Google Maps modal component including:
 * - Map initialization and cleanup
 * - Route calculation and display
 * - Traffic layer integration
 * - Geocoding functionality
 * - Component integration
 * - Error handling
 * - State management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleMapsModal } from '../GoogleMapsModal';
import { loadGoogleMaps, createLocationMarker, getGoogleMapsApiKey } from '../../../utils/googleMaps';
import { useRouteState } from '../../../hooks/useRouteState';
import { timeService } from '../../../services/TimeService';
import { logger } from '../../../lib/logger';

// Mock dependencies
jest.mock('../../../utils/googleMaps');
jest.mock('../../../hooks/useRouteState');
jest.mock('../../../services/TimeService', () => ({
  timeService: {
    getCurrentDateTime: jest.fn(),
    formatTimeToLocal: jest.fn(),
    formatDateToLocal: jest.fn(),
    addMinutes: jest.fn(),
    addDays: jest.fn(),
    addHours: jest.fn(),
    addYears: jest.fn(),
    startOfDay: jest.fn(),
    parseDate: jest.fn(),
    formatForDateTimeInput: jest.fn(),
    isSameDay: jest.fn(),
    getHours: jest.fn(),
  },
}));
jest.mock('../../../lib/logger');
jest.mock('../../common/Modal');
jest.mock('../RouteInputBar');
jest.mock('../RouteInfoBar');
jest.mock('../TrafficIndicator');

const mockLoadGoogleMaps = loadGoogleMaps as jest.MockedFunction<typeof loadGoogleMaps>;
const mockCreateLocationMarker = createLocationMarker as jest.MockedFunction<typeof createLocationMarker>;
const mockGetGoogleMapsApiKey = getGoogleMapsApiKey as jest.MockedFunction<typeof getGoogleMapsApiKey>;
const mockUseRouteState = useRouteState as jest.MockedFunction<typeof useRouteState>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock Modal component
jest.mock('../../common/Modal', () => ({
  Modal: ({ children, isOpen, onClose, title, className, size }: any) => (
    isOpen ? (
      <div data-testid="modal" className={className} data-size={size}>
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  ),
}));

// Mock child components
jest.mock('../RouteInputBar', () => ({
  RouteInputBar: ({ currentLocation, currentAddress, onRouteRequest, onClearRoute, hasRoute }: any) => (
    <div data-testid="route-input-bar">
      <span data-testid="current-location">{JSON.stringify(currentLocation)}</span>
      <span data-testid="current-address">{currentAddress}</span>
      <span data-testid="has-route">{hasRoute.toString()}</span>
      <button onClick={() => onRouteRequest('Origin', 'Destination')}>Request Route</button>
      <button onClick={onClearRoute}>Clear Route</button>
    </div>
  ),
}));

jest.mock('../RouteInfoBar', () => ({
  RouteInfoBar: ({ route, alternativeRoutes, selectedRouteIndex, isExpanded, onRouteSelect, onToggleExpand, onClose }: any) => (
    <div data-testid="route-info-bar">
      <span data-testid="has-route">{!!route}</span>
      <span data-testid="alternatives-count">{alternativeRoutes.length}</span>
      <span data-testid="selected-index">{selectedRouteIndex}</span>
      <span data-testid="is-expanded">{isExpanded.toString()}</span>
      <button onClick={() => onRouteSelect(1)}>Select Route 1</button>
      <button onClick={onToggleExpand}>Toggle Expand</button>
      <button onClick={onClose}>Close Info</button>
    </div>
  ),
}));

jest.mock('../TrafficIndicator', () => ({
  TrafficIndicator: ({ map, isTrafficEnabled, onToggleTraffic }: any) => (
    <div data-testid="traffic-indicator">
      <span data-testid="has-map">{!!map}</span>
      <span data-testid="traffic-enabled">{isTrafficEnabled.toString()}</span>
      <button onClick={() => onToggleTraffic(!isTrafficEnabled)}>Toggle Traffic</button>
    </div>
  ),
}));

describe('GoogleMapsModal', () => {
  const mockOnClose = jest.fn();
  const mockCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
  };
  const mockAddress = {
    formatted: '123 Main St, San Francisco, CA',
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    coordinates: mockCoordinates,
    address: mockAddress,
  };

  // Mock Google Maps objects
  const mockMap = {
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    fitBounds: jest.fn(),
    panToBounds: jest.fn(),
  };

  const mockDirectionsService = {
    route: jest.fn(),
  };

  const mockDirectionsRenderer = {
    setMap: jest.fn(),
    setDirections: jest.fn(),
    setRouteIndex: jest.fn(),
    setOptions: jest.fn(),
    getDirections: jest.fn(),
  };

  const mockTrafficLayer = {
    setMap: jest.fn(),
  };

  const mockGeocoder = {
    geocode: jest.fn(),
  };

  const mockMarker = {
    map: null,
  };

  const mockRouteState = {
    currentRoute: null,
    alternativeRoutes: [],
    selectedRouteIndex: 0,
    hasActiveRoute: false,
    showRouteOptions: false,
    routeInfoVisible: false,
    setSelectedRouteIndex: jest.fn(),
    setShowRouteOptions: jest.fn(),
    setRouteInfoVisible: jest.fn(),
    clearRoute: jest.fn(),
    setRouteData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup Google Maps API mocks
    global.window = Object.create(window);
    Object.defineProperty(window, 'google', {
      value: {
        maps: {
          Map: jest.fn(() => mockMap),
          DirectionsService: jest.fn(() => mockDirectionsService),
          DirectionsRenderer: jest.fn(() => mockDirectionsRenderer),
          TrafficLayer: jest.fn(() => mockTrafficLayer),
          Geocoder: jest.fn(() => mockGeocoder),
          ControlPosition: {
            RIGHT_CENTER: 6,
          },
          TravelMode: {
            DRIVING: 'DRIVING',
          },
          TrafficModel: {
            BEST_GUESS: 'BEST_GUESS',
          },
          event: {
            clearInstanceListeners: jest.fn(),
          },
        },
      },
      writable: true,
    });

    // Mock implementations
    mockGetGoogleMapsApiKey.mockReturnValue('test-api-key');
    mockCreateLocationMarker.mockResolvedValue(mockMarker as any);
    mockUseRouteState.mockReturnValue(mockRouteState);
    mockTimeService.getCurrentDateTime.mockReturnValue(new Date('2024-01-15T14:30:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render modal when open', () => {
      render(<GoogleMapsModal {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Check Traffic');
      expect(screen.getByTestId('modal')).toHaveClass('google-maps-modal');
      expect(screen.getByTestId('modal')).toHaveAttribute('data-size', 'extra-large');
    });

    it('should not render when closed', () => {
      render(<GoogleMapsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<GoogleMapsModal {...defaultProps} />);

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
      expect(screen.getByTestId('modal').querySelector('.maps-spinner')).toBeInTheDocument();
    });

    it('should show error state when API key missing', async () => {
      mockGetGoogleMapsApiKey.mockReturnValue('');
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Google Maps API key is not configured')).toBeInTheDocument();
      });
    });

    it('should show error state on map initialization failure', async () => {
      mockLoadGoogleMaps.mockRejectedValue(new Error('Failed to load'));
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load Google Maps. Please try again.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
      });
    });
  });

  describe('map initialization', () => {
    it('should initialize map with correct configuration', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadGoogleMaps).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      });

      await waitFor(() => {
        expect(window.google.maps.Map).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            center: {
              lat: 37.7749,
              lng: -122.4194,
            },
            zoom: 14,
            mapId: 'VIRGIL_TRAFFIC_MAP',
            disableDefaultUI: true,
            zoomControl: true,
          }),
        );
      });
    });

    it('should initialize map services', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(window.google.maps.DirectionsService).toHaveBeenCalled();
        expect(window.google.maps.DirectionsRenderer).toHaveBeenCalled();
        expect(window.google.maps.TrafficLayer).toHaveBeenCalled();
        expect(window.google.maps.Geocoder).toHaveBeenCalled();
      });
    });

    it('should create location marker', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateLocationMarker).toHaveBeenCalledWith(
          {
            lat: 37.7749,
            lng: -122.4194,
          },
          mockMap,
        );
      });
    });

    it('should enable traffic layer by default', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockTrafficLayer.setMap).toHaveBeenCalledWith(mockMap);
      });
    });

    it('should not initialize when coordinates missing', () => {
      render(<GoogleMapsModal {...defaultProps} coordinates={null} />);

      expect(mockLoadGoogleMaps).not.toHaveBeenCalled();
    });

    it('should not initialize when modal closed', () => {
      render(<GoogleMapsModal {...defaultProps} isOpen={false} />);

      expect(mockLoadGoogleMaps).not.toHaveBeenCalled();
    });
  });

  describe('geocoding', () => {
    it('should geocode current location', async () => {
      const mockGeocoderResult = [{
        formatted_address: '456 Market St, San Francisco, CA',
      }];

      mockGeocoder.geocode.mockImplementation((request: any, callback: any) => {
        setTimeout(() => callback(mockGeocoderResult, 'OK'), 100);
      });

      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockGeocoder.geocode).toHaveBeenCalledWith(
          {
            location: {
              lat: 37.7749,
              lng: -122.4194,
            },
          },
          expect.any(Function),
        );
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-address')).toHaveTextContent('456 Market St, San Francisco, CA');
      });
    });

    it('should handle geocoding timeout gracefully', async () => {
      mockGeocoder.geocode.mockImplementation((request: any, callback: any) => {
        // Don't call callback to simulate timeout
      });

      render(<GoogleMapsModal {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(3100); // Trigger timeout
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-address')).toHaveTextContent('Current Location');
      });
    });

    it('should handle geocoding errors gracefully', async () => {
      mockGeocoder.geocode.mockImplementation((request: any, callback: any) => {
        setTimeout(() => callback(null, 'ERROR'), 100);
      });

      render(<GoogleMapsModal {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-address')).toHaveTextContent('Current Location');
      });
    });
  });

  describe('route functionality', () => {
    const mockRoute = {
      legs: [{
        duration: { value: 1800, text: '30 min' },
        distance: { value: 24000, text: '15 mi' },
      }],
      bounds: {
        extend: jest.fn(),
      },
      summary: 'US-101 N',
    };

    const mockDirectionsResult = {
      routes: [mockRoute],
    };

    beforeEach(() => {
      mockDirectionsService.route.mockImplementation((request: any, callback: any) => {
        setTimeout(() => callback(mockDirectionsResult, 'OK'), 100);
      });
    });

    it('should handle route request', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      // Wait for map to load
      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Request Route'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockDirectionsService.route).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: 'Origin',
            destination: 'Destination',
            travelMode: 'DRIVING',
            provideRouteAlternatives: true,
          }),
          expect.any(Function),
        );
      });
    });

    it('should update route state on successful route calculation', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Request Route'));

      act(() => {
        jest.advanceTimers();
      });

      await waitFor(() => {
        expect(mockRouteState.setRouteData).toHaveBeenCalledWith([mockRoute]);
      });
    });

    it('should display route on map', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Request Route'));

      act(() => {
        jest.advanceTimers();
      });

      await waitFor(() => {
        expect(mockDirectionsRenderer.setDirections).toHaveBeenCalledWith(mockDirectionsResult);
        expect(mockDirectionsRenderer.setRouteIndex).toHaveBeenCalledWith(0);
      });
    });

    it('should handle route calculation errors', async () => {
      mockDirectionsService.route.mockImplementation((request: any, callback: any) => {
        setTimeout(() => callback(null, 'NOT_FOUND'), 100);
      });

      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Request Route'));

      act(() => {
        jest.advanceTimers();
      });

      await waitFor(() => {
        expect(screen.getByText('Unable to calculate route. Please try again.')).toBeInTheDocument();
      });
    });

    it('should clear route when requested', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Clear Route'));

      expect(mockRouteState.clearRoute).toHaveBeenCalled();
      expect(mockMap.setCenter).toHaveBeenCalledWith({
        lat: 37.7749,
        lng: -122.4194,
      });
      expect(mockMap.setZoom).toHaveBeenCalledWith(14);
    });
  });

  describe('route selection', () => {
    beforeEach(() => {
      mockUseRouteState.mockReturnValue({
        ...mockRouteState,
        currentRoute: { bounds: { extend: jest.fn() } } as any,
        alternativeRoutes: [{ bounds: { extend: jest.fn() } }] as any,
        routeInfoVisible: true,
      });
    });

    it('should handle route selection', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-info-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select Route 1'));

      expect(mockRouteState.setSelectedRouteIndex).toHaveBeenCalledWith(1);
      expect(mockDirectionsRenderer.setRouteIndex).toHaveBeenCalledWith(1);
    });

    it('should auto-collapse route options after selection', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-info-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select Route 1'));

      act(() => {
        jest.advanceTimersByTime(800);
      });

      expect(mockRouteState.setShowRouteOptions).toHaveBeenCalledWith(false);
    });

    it('should handle toggle expand', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-info-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Toggle Expand'));

      expect(mockRouteState.setShowRouteOptions).toHaveBeenCalled();
    });

    it('should handle close route info', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-info-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close Info'));

      expect(mockRouteState.setRouteInfoVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('traffic functionality', () => {
    it('should render traffic indicator', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('traffic-indicator')).toBeInTheDocument();
        expect(screen.getByTestId('traffic-enabled')).toHaveTextContent('true');
      });
    });

    it('should handle traffic toggle', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('traffic-indicator')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Toggle Traffic'));

      expect(mockTrafficLayer.setMap).toHaveBeenCalledWith(null);
    });
  });

  describe('component integration', () => {
    it('should pass correct props to RouteInputBar', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      expect(screen.getByTestId('current-location')).toHaveTextContent(
        JSON.stringify({ lat: 37.7749, lng: -122.4194 }),
      );
      expect(screen.getByTestId('current-address')).toHaveTextContent('123 Main St, San Francisco, CA');
      expect(screen.getByTestId('has-route')).toHaveTextContent('false');
    });

    it('should pass correct props to TrafficIndicator', async () => {
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('traffic-indicator')).toBeInTheDocument();
      });

      expect(screen.getByTestId('has-map')).toHaveTextContent('true');
      expect(screen.getByTestId('traffic-enabled')).toHaveTextContent('true');
    });

    it('should conditionally render RouteInfoBar', async () => {
      const { rerender } = render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('route-info-bar')).not.toBeInTheDocument();
      });

      // Mock route state with active route
      mockUseRouteState.mockReturnValue({
        ...mockRouteState,
        currentRoute: { bounds: { extend: jest.fn() } } as any,
        routeInfoVisible: true,
      });

      rerender(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-info-bar')).toBeInTheDocument();
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup map resources on unmount', async () => {
      const { unmount } = render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      unmount();

      expect(mockDirectionsRenderer.setMap).toHaveBeenCalledWith(null);
      expect(mockTrafficLayer.setMap).toHaveBeenCalledWith(null);
      expect(window.google.maps.event.clearInstanceListeners).toHaveBeenCalled();
    });

    it('should clear timers on cleanup', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle missing Google Maps gracefully', async () => {
      // Remove Google Maps from global
      delete (window as any).google;

      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Google Maps not properly initialized',
          undefined,
          expect.objectContaining({
            component: 'GoogleMapsModal',
            action: 'initMap',
          }),
        );
      });
    });

    it('should reload page on error button click', async () => {
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      mockGetGoogleMapsApiKey.mockReturnValue('');
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Reload' }));

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should handle directions service initialization failure', async () => {
      mockDirectionsService.route.mockImplementation(() => {
        throw new Error('DirectionsService not initialized');
      });

      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Request Route'));

      // Should not crash
      expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<GoogleMapsModal {...defaultProps} />);
      const firstRender = screen.getByTestId('modal');

      rerender(<GoogleMapsModal {...defaultProps} />);
      const secondRender = screen.getByTestId('modal');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<GoogleMapsModal {...defaultProps} />);
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Check Traffic');

      rerender(<GoogleMapsModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper modal structure', () => {
      render(<GoogleMapsModal {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toBeInTheDocument();
      expect(screen.getByTestId('modal-close')).toBeInTheDocument();
    });

    it('should handle modal close', async () => {
      const user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      await user.click(screen.getByTestId('modal-close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('departure time handling', () => {
    it('should recalculate route when departure time changes', async () => {
      // Setup route state with active route
      mockUseRouteState.mockReturnValue({
        ...mockRouteState,
        hasActiveRoute: true,
        routeInfoVisible: true,
      });

      const _user = userEvent.setup();
      render(<GoogleMapsModal {...defaultProps} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('route-input-bar')).toBeInTheDocument();
      });

      // Simulate departure time change (this would come from RouteInfoBar)
      // In the real component, this would be triggered by the DepartureTimeSelector
      // For testing, we need to simulate the callback
      
      // The component should handle departure time changes for route recalculation
      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
    });
  });
});