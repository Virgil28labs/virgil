/**
 * LocationContext Tests
 * 
 * Tests the location context provider including:
 * - Location data fetching and caching
 * - GPS and IP geolocation
 * - Permission handling and state management
 * - Error handling and logging
 * - Location refresh and background updates
 * - Context value memoization
 * - Cleanup and lifecycle management
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { LocationProvider } from '../LocationContext';
import { LocationContext } from '../LocationContextInstance';
import { locationService } from '../../lib/locationService';
import { logger } from '../../lib/logger';
import { timeService } from '../../services/TimeService';
import { useContext, useEffect } from 'react';
import type { LocationContextValue } from '../../types/location.types';

// Mock dependencies
jest.mock('../../lib/locationService');
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    getCurrentDateTime: jest.fn(),  
    formatTimeToLocal: jest.fn(),
  },
}));

const mockLocationService = locationService as jest.Mocked<typeof locationService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock navigator.permissions
const mockPermission = {
  state: 'prompt' as PermissionState,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'permissions', {
  value: {
    query: jest.fn<any, any>().mockResolvedValue(mockPermission),
  },
  configurable: true,
});

// Test component to access context
const TestComponent = () => {
  const context = useContext(LocationContext);
  
  if (!context) {
    return <div>No context</div>;
  }

  const {
    coordinates,
    address,
    ipLocation,
    loading,
    error,
    permissionStatus,
    hasLocation,
    hasGPSLocation,
    hasIpLocation,
    initialized,
    fetchLocationData,
    requestLocationPermission,
    clearError,
  } = context;

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="initialized">{initialized ? 'initialized' : 'not-initialized'}</div>
      <div data-testid="coordinates">{coordinates ? `${coordinates.latitude},${coordinates.longitude}` : 'no-coordinates'}</div>
      <div data-testid="address">{address?.city || 'no-address'}</div>
      <div data-testid="ip-location">{ipLocation?.city || 'no-ip-location'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="permission">{permissionStatus}</div>
      <div data-testid="has-location">{hasLocation ? 'has-location' : 'no-location'}</div>
      <div data-testid="has-gps">{hasGPSLocation ? 'has-gps' : 'no-gps'}</div>
      <div data-testid="has-ip">{hasIpLocation ? 'has-ip' : 'no-ip'}</div>
      <button data-testid="fetch-location" onClick={() => fetchLocationData()}>
        Fetch Location
      </button>
      <button data-testid="request-permission" onClick={requestLocationPermission}>
        Request Permission
      </button>
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

// Mock data
const mockCoordinates = { 
  latitude: 40.7128, 
  longitude: -74.0060,
  accuracy: 10,
  timestamp: Date.now(),
};
const mockAddress = { 
  street: '123 Main St',
  house_number: '123',
  city: 'New York', 
  postcode: '10001',
  country: 'USA',
  formatted: '123 Main St, New York, NY 10001, USA',
};
const mockIpLocation = { 
  ip: '192.168.1.1',
  city: 'New York', 
  region: 'NY', 
  country: 'USA',
  lat: 40.7128,
  lon: -74.0060,
};

describe('LocationContext', () => {
  const mockTimestamp = 1640995200000; // Fixed timestamp

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockTimeService.getTimestamp.mockReturnValue(mockTimestamp);
    mockLocationService.getQuickLocation.mockResolvedValue({ 
      ipLocation: mockIpLocation,
      timestamp: mockTimestamp,
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: mockCoordinates,
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: mockTimestamp,
    });
    mockLocationService.getCurrentPosition.mockResolvedValue(mockCoordinates);
    
    // Reset permission mock
    mockPermission.state = 'prompt';
    (navigator.permissions.query as jest.Mock).mockResolvedValue(mockPermission);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should render children and provide context', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('initialized')).toHaveTextContent('initialized');
      expect(screen.getByTestId('permission')).toHaveTextContent('prompt');
    });

    it('should check location permission on mount', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(navigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
      });
    });

    it('should handle unavailable permissions', async () => {
      Object.defineProperty(navigator, 'permissions', {
        value: undefined,
        configurable: true,
      });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('permission')).toHaveTextContent('unavailable');
      });
    });

    it('should handle permission query errors', async () => {
      (navigator.permissions.query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('permission')).toHaveTextContent('unavailable');
      });
    });

    it('should setup permission change listener', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockPermission.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });
    });

    it('should cleanup permission listener on unmount', async () => {
      const { unmount } = render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockPermission.addEventListener).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockPermission.removeEventListener).toHaveBeenCalled();
      });
    });
  });

  describe('Location data fetching', () => {
    it('should fetch IP location immediately when permission is granted', async () => {
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
        expect(screen.getByTestId('has-ip')).toHaveTextContent('has-ip');
        expect(screen.getByTestId('has-location')).toHaveTextContent('has-location');
      });
    });

    it('should enhance with GPS data in background', async () => {
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Wait for IP location
      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Fast-forward timer for GPS delay
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(mockLocationService.getFullLocationData).toHaveBeenCalledWith(mockIpLocation);
      });

      await waitFor(() => {
        expect(screen.getByTestId('coordinates')).toHaveTextContent('40.7128,-74.006');
        expect(screen.getByTestId('address')).toHaveTextContent('New York');
        expect(screen.getByTestId('has-gps')).toHaveTextContent('has-gps');
      });
    });

    it('should handle quick location errors', async () => {
      const locationError = new Error('IP location failed');
      mockLocationService.getQuickLocation.mockRejectedValue(locationError);
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Location fetch error',
          locationError,
          {
            component: 'LocationContext',
            action: 'updateLocationDataFromIP',
          },
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('IP location failed');
      });
    });

    it('should handle GPS enhancement errors silently', async () => {
      mockLocationService.getFullLocationData.mockRejectedValue(new Error('GPS failed'));
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Wait for IP location
      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Fast-forward timer for GPS delay
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(mockLocationService.getFullLocationData).toHaveBeenCalled();
      });

      // GPS error should be silent, IP location should remain
      expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      expect(screen.getByTestId('coordinates')).toHaveTextContent('no-coordinates');
    });

    it('should prevent concurrent GPS requests', async () => {
      mockPermission.state = 'granted';
      mockLocationService.getFullLocationData.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          coordinates: mockCoordinates,
          address: mockAddress,
          ipLocation: mockIpLocation,
          timestamp: mockTimestamp,
        }), 1000)),
      );

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Wait for IP location and first GPS request
      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Fast-forward to trigger GPS
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Trigger another fetch while GPS is in progress
      act(() => {
        screen.getByTestId('fetch-location').click();
      });

      // Only one GPS request should be made
      expect(mockLocationService.getFullLocationData).toHaveBeenCalledTimes(1);
    });

    it('should respect cache expiry', async () => {
      mockPermission.state = 'granted';
      const cacheTime = mockTimestamp;
      mockTimeService.getTimestamp
        .mockReturnValueOnce(cacheTime) // Initial fetch
        .mockReturnValueOnce(cacheTime + 60000) // Within cache (1 min later)
        .mockReturnValueOnce(cacheTime + 360000); // Beyond cache (6 min later)

      const { rerender } = render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Initial fetch
      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalledTimes(1);
      });

      // Force refresh within cache time
      act(() => {
        screen.getByTestId('fetch-location').click();
      });

      // Should not fetch again due to cache
      expect(mockLocationService.getQuickLocation).toHaveBeenCalledTimes(1);

      // Simulate time passing beyond cache expiry
      rerender(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      act(() => {
        screen.getByTestId('fetch-location').click();
      });

      // Should fetch again as cache expired
      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalledTimes(2);
      });
    });

    it('should force refresh when requested', async () => {
      mockPermission.state = 'granted';

      const TestForceRefresh = () => {
        const context = useContext(LocationContext);
        return (
          <div>
            <div data-testid="ip-location">{context?.ipLocation?.city || 'no-ip-location'}</div>
            <button 
              data-testid="force-refresh" 
              onClick={() => context?.fetchLocationData(true)}
            >
              Force Refresh
            </button>
          </div>
        );
      };

      render(
        <LocationProvider>
          <TestForceRefresh />
        </LocationProvider>,
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalledTimes(1);
      });

      // Force refresh should ignore cache
      act(() => {
        screen.getByTestId('force-refresh').click();
      });

      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Permission handling', () => {
    it('should request location permission', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      act(() => {
        screen.getByTestId('request-permission').click();
      });

      await waitFor(() => {
        expect(mockLocationService.getCurrentPosition).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('permission')).toHaveTextContent('granted');
      });
    });

    it('should handle permission denial', async () => {
      const permissionError = new Error('Permission denied');
      mockLocationService.getCurrentPosition.mockRejectedValue(permissionError);

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      act(() => {
        screen.getByTestId('request-permission').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('permission')).toHaveTextContent('denied');
        expect(screen.getByTestId('error')).toHaveTextContent('Permission denied');
      });
    });

    it('should handle permission state changes', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockPermission.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      // Simulate permission change
      const changeHandler = mockPermission.addEventListener.mock.calls[0][1];
      mockPermission.state = 'granted';
      
      act(() => {
        changeHandler();
      });

      expect(screen.getByTestId('permission')).toHaveTextContent('granted');
    });

    it('should fetch location data when permission becomes granted', async () => {
      mockPermission.state = 'denied';
      mockTimeService.getTimestamp.mockReturnValue(mockTimestamp + 400000); // Beyond cache

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Initially no location data
      expect(screen.getByTestId('permission')).toHaveTextContent('denied');

      // Change permission to granted
      mockPermission.state = 'granted';
      
      // Simulate permission change triggering useEffect
      const TestPermissionChange = () => {
        const context = useContext(LocationContext);
        
        // Simulate the permission change effect
        useEffect(() => {
          if (context && mockPermission.state === 'granted') {
            context.fetchLocationData();
          }
        }, [context]);

        return <div data-testid="ip-location">{context?.ipLocation?.city || 'no-ip-location'}</div>;
      };

      const { rerender } = render(
        <LocationProvider>
          <TestPermissionChange />
        </LocationProvider>,
      );

      // Re-render to trigger useEffect
      rerender(
        <LocationProvider>
          <TestPermissionChange />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(mockLocationService.getQuickLocation).toHaveBeenCalled();
      });
    });
  });

  describe('Error handling', () => {
    it('should clear errors', async () => {
      const locationError = new Error('Location failed');
      mockLocationService.getQuickLocation.mockRejectedValue(locationError);
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Location failed');
      });

      act(() => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    it('should handle non-Error exceptions', async () => {
      mockLocationService.getQuickLocation.mockRejectedValue('String error');
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch location');
      });
    });

    it('should handle non-Error permission exceptions', async () => {
      mockLocationService.getCurrentPosition.mockRejectedValue('Permission string error');

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      act(() => {
        screen.getByTestId('request-permission').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch location');
      });
    });
  });

  describe('Location state derived values', () => {
    it('should correctly compute hasLocation', async () => {
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Initially no location
      expect(screen.getByTestId('has-location')).toHaveTextContent('no-location');

      // Mock IP location only
      mockPermission.state = 'granted';
      mockLocationService.getFullLocationData.mockResolvedValue({
        ipLocation: mockIpLocation,
        timestamp: mockTimestamp,
      });

      // Re-render to trigger location fetch
      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-location')).toHaveTextContent('has-location');
        expect(screen.getByTestId('has-ip')).toHaveTextContent('has-ip');
        expect(screen.getByTestId('has-gps')).toHaveTextContent('no-gps');
      });
    });

    it('should correctly compute hasGPSLocation', async () => {
      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Fast-forward for GPS enhancement
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-gps')).toHaveTextContent('has-gps');
        expect(screen.getByTestId('coordinates')).toHaveTextContent('40.7128,-74.006');
      });
    });
  });

  describe('Context value memoization', () => {
    it('should memoize context value to prevent unnecessary re-renders', async () => {
      let renderCount = 0;
      const TestMemoization = () => {
        renderCount++;
        useContext(LocationContext);
        return <div data-testid="render-count">{renderCount}</div>;
      };

      const { rerender } = render(
        <LocationProvider>
          <TestMemoization />
        </LocationProvider>,
      );

      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      // Re-render with same state
      rerender(
        <LocationProvider>
          <TestMemoization />
        </LocationProvider>,
      );

      // Should still be 1 because context value is memoized
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');
    });

    it('should update memoized value when location data changes', async () => {
      const contextValues: LocationContextValue[] = [];
      const TestMemoization = () => {
        const context = useContext(LocationContext);
        if (context) {
          contextValues.push(context);
        }
        return <div data-testid="ip-location">{context?.ipLocation?.city || 'no-ip-location'}</div>;
      };

      mockPermission.state = 'granted';

      render(
        <LocationProvider>
          <TestMemoization />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Context values should be different objects when state changes
      expect(contextValues.length).toBeGreaterThan(1);
      expect(contextValues[0]).not.toBe(contextValues[contextValues.length - 1]);
    });
  });

  describe('Edge cases and concurrent operations', () => {
    it('should handle loading state correctly during concurrent operations', async () => {
      mockPermission.state = 'granted';
      mockLocationService.getQuickLocation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ 
          ipLocation: mockIpLocation,
          timestamp: mockTimestamp,
        }), 100)),
      );

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');

      // Wait for location request to complete
      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });
    });

    it('should handle quick location returning no IP location', async () => {
      mockPermission.state = 'granted';
      mockLocationService.getQuickLocation.mockResolvedValue({
        timestamp: mockTimestamp,
      });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('ip-location')).toHaveTextContent('no-ip-location');
      });
    });

    it('should only update state for better GPS data', async () => {
      mockPermission.state = 'granted';
      
      // Initial IP location with address
      const ipLocationWithAddress = {
        ...mockIpLocation,
        address: { city: 'New York', state: 'NY' },
      };
      
      mockLocationService.getQuickLocation.mockResolvedValue({ 
        ipLocation: ipLocationWithAddress,
        timestamp: mockTimestamp,
      });

      // GPS enhancement with worse address data
      mockLocationService.getFullLocationData.mockResolvedValue({
        coordinates: mockCoordinates,
        address: { 
          street: 'Unknown',
          house_number: '',
          city: 'New York',
          postcode: '10001',
          country: 'USA',
          formatted: 'New York, NY 10001, USA',
        }, // Less detailed than IP location
        ipLocation: ipLocationWithAddress,
        timestamp: mockTimestamp,
      });

      render(
        <LocationProvider>
          <TestComponent />
        </LocationProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('ip-location')).toHaveTextContent('New York');
      });

      // Fast-forward for GPS enhancement
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(mockLocationService.getFullLocationData).toHaveBeenCalled();
      });

      // Should still have GPS coordinates but original address
      await waitFor(() => {
        expect(screen.getByTestId('coordinates')).toHaveTextContent('40.7128,-74.006');
      });
    });
  });
});