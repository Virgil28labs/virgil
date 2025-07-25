import React from 'react';
import { render } from '@testing-library/react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LocationProvider, useLocation } from './LocationContext';
import { locationService } from '../lib/locationService';

// Mock the location service
jest.mock('../lib/locationService');

// Mock the logger to prevent timeService usage during tests
jest.mock('../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock TimeService with the actual mock implementation
jest.mock('../services/TimeService', () => {
  // Use the actual mock implementation
  const actualMock = jest.requireActual('../services/__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../services/TimeService';
const mockTimeService = timeService as any;

const mockLocationService = locationService as jest.Mocked<typeof locationService>;

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

const createMockCoordinates = (timestamp: number) => ({
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp,
});

const mockAddress = {
  street: '123 Main St',
  house_number: '123',
  city: 'New York',
  postcode: '10001',
  country: 'USA',
  formatted: '123 Main St, New York, NY 10001, USA',
};

const mockIpLocation = {
  ip: '127.0.0.1',
  city: 'New York',
  region: 'NY',
  country: 'US',
  timezone: 'America/New_York',
};

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocationProvider>{children}</LocationProvider>
);

describe('LocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
    
    // Setup geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });
    // Setup permissions mock
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ 
          state: 'granted',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }),
      },
      writable: true,
    });
    
    // Reset all mock implementations to default
    mockLocationService.getQuickLocation.mockResolvedValue({ 
      ipLocation: undefined,
      timestamp: mockTimeService.getTimestamp(),
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: mockTimeService.getTimestamp(),
    });
    mockLocationService.getCurrentPosition.mockResolvedValue(
      createMockCoordinates(mockTimeService.getTimestamp()),
    );
    mockLocationService.getAddressFromCoordinates.mockResolvedValue(mockAddress);
    mockLocationService.getIpLocation.mockResolvedValue(mockIpLocation);
  });

  afterEach(() => {
    mockTimeService.destroy();
  });

  it('throws error when useLocation is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const TestComponent = () => {
      useLocation();
      return null;
    };
    
    expect(() => render(<TestComponent />)).toThrow(
      'useLocation must be used within a LocationProvider',
    );
    
    consoleSpy.mockRestore();
  });

  it('provides initial state', async () => {
    // Mock getFullLocationData to prevent actual API calls
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Initial state
    expect(result.current.coordinates).toBeNull();
    expect(result.current.address).toBeNull();
    expect(result.current.ipLocation).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.hasLocation).toBe(false);
    
    // Wait for any async operations
    await waitFor(() => {
      // Permission status should be set
      expect(result.current.permissionStatus).not.toBe('unknown');
    }, { timeout: 3000 });
    
    // After initial load, permission should be checked
    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.loading).toBe(false);
  });

  it('fetches location on mount', async () => {
    const mockLocationData = {
      coordinates: createMockCoordinates(mockTimeService.getTimestamp()),
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    };
    
    // Mock quick location to return IP location
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    // Mock full location data
    mockLocationService.getFullLocationData.mockResolvedValue(mockLocationData);
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Wait for quick location (IP location) to be set first
    await waitFor(() => {
      expect(result.current.ipLocation).toEqual(mockIpLocation);
      expect(result.current.loading).toBe(false);
    });
    
    // The full location fetch happens after 500ms, but since we're mocking
    // the service, we can just check that it was called
    expect(mockLocationService.getQuickLocation).toHaveBeenCalled();
    
    // For now, just verify the IP location was set correctly
    // The full location data would be set after the timeout in real usage
    expect(result.current.ipLocation).toEqual(mockIpLocation);
    expect(result.current.hasLocation).toBe(true);
  });

  it('handles geolocation permission denied', async () => {
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ 
          state: 'denied',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }),
      },
      writable: true,
    });
    
    // Mock getQuickLocation to return IP location
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    // Mock getFullLocationData to return only IP location (simulating GPS denied)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.permissionStatus).toBe('denied');
    }, { timeout: 3000 });
    
    expect(result.current.coordinates).toBeNull();
    expect(result.current.address).toBeNull();
    expect(result.current.ipLocation).toEqual(mockIpLocation);
  });

  it('handles geolocation timeout', async () => {
    // Mock getQuickLocation to throw timeout error
    mockLocationService.getQuickLocation.mockRejectedValue(
      new Error('Location request timed out'),
    );
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(result.current.error).toContain('Location request timed out');
  }, 15000); // Increase test timeout

  it('refreshes location when requested', async () => {
    const initialLocationData = {
      coordinates: createMockCoordinates(mockTimeService.getTimestamp()),
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    };
    
    // Setup initial mocks
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    mockLocationService.getFullLocationData.mockResolvedValue(initialLocationData);
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Clear mocks to verify refresh calls them again
    jest.clearAllMocks();
    
    // Advance time for refresh
    mockTimeService.advanceTime(1000);
    
    // Update mocks for refresh
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    const updatedLocationData = {
      ...initialLocationData,
      timestamp: mockTimeService.getTimestamp(),
    };
    mockLocationService.getFullLocationData.mockResolvedValue(updatedLocationData);
    
    // Force refresh
    await act(async () => {
      await result.current.fetchLocationData(true);
    });
    
    expect(mockLocationService.getQuickLocation).toHaveBeenCalled();
  });

  it('clears error when clearError is called', async () => {
    // Mock getQuickLocation to throw an error
    mockLocationService.getQuickLocation.mockRejectedValue(
      new Error('Position unavailable'),
    );
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  }, 15000); // Increase test timeout

  it('handles API errors gracefully', async () => {
    // Mock getQuickLocation to return partial data (only IP)
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    // Mock getFullLocationData to return partial data (no address)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Wait for quick location to complete
    await waitFor(() => {
      expect(result.current.ipLocation).toEqual(mockIpLocation);
      expect(result.current.loading).toBe(false);
    });
    
    // Should have IP location even if GPS and geocoding fail
    expect(result.current.coordinates).toBeNull();
    expect(result.current.address).toBeNull();
    expect(result.current.ipLocation).toEqual(mockIpLocation);
    expect(result.current.hasLocation).toBe(true); // Has IP location
  });

  it('calculates hasLocation correctly', async () => {
    // Start with no location data
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: undefined,
      timestamp: mockTimeService.getTimestamp(),
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Initially false
    expect(result.current.hasLocation).toBe(false);
    
    // Update mocks to return coordinates
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: createMockCoordinates(mockTimeService.getTimestamp()),
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    await act(async () => {
      await result.current.fetchLocationData(true);
    });
    
    await waitFor(() => {
      expect(result.current.hasLocation).toBe(true);
    });
  }, 15000); // Increase test timeout

  it('updates lastUpdated timestamp', async () => {
    const beforeUpdate = mockTimeService.getTimestamp();
    
    // Mock quick location
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: createMockCoordinates(mockTimeService.getTimestamp()),
      address: undefined,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Wait for quick location to set lastUpdated
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.lastUpdated).not.toBeNull();
    }, { timeout: 3000 });
    
    expect(result.current.lastUpdated).toBeGreaterThanOrEqual(beforeUpdate);
    expect(result.current.lastUpdated).toBeLessThanOrEqual(mockTimeService.getTimestamp());
  });

  it('handles missing geolocation API', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
    });
    
    // Mock getQuickLocation to return IP location only
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    // Mock getFullLocationData to return only IP location (no GPS available)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: mockIpLocation,
      timestamp: mockTimeService.getTimestamp(),
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.coordinates).toBeNull();
    expect(result.current.ipLocation).toEqual(mockIpLocation);
  });

  it('handles time-based location expiry', async () => {
    const initialTimestamp = mockTimeService.getTimestamp();
    
    // Mock initial location data
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: initialTimestamp,
    });
    
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: createMockCoordinates(initialTimestamp),
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: initialTimestamp,
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.lastUpdated).not.toBeNull();
    });
    
    const initialLastUpdated = result.current.lastUpdated;
    
    // Advance time by 1 hour
    mockTimeService.advanceTime(60 * 60 * 1000);
    
    // Update mocks for new timestamp
    const newTimestamp = mockTimeService.getTimestamp();
    mockLocationService.getQuickLocation.mockResolvedValue({
      ipLocation: mockIpLocation,
      timestamp: newTimestamp,
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: createMockCoordinates(newTimestamp),
      address: mockAddress,
      ipLocation: mockIpLocation,
      timestamp: newTimestamp,
    });
    
    // Force refresh
    await act(async () => {
      await result.current.fetchLocationData(true);
    });
    
    // Wait for update
    await waitFor(() => {
      expect(result.current.lastUpdated).toBeGreaterThan(initialLastUpdated);
    });
    
    expect(result.current.lastUpdated).toBe(newTimestamp);
  });
});