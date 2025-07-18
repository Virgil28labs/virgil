import React from 'react';
import { render } from '@testing-library/react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LocationProvider, useLocation } from './LocationContext';
import { locationService } from '../lib/locationService';

// Mock the location service
jest.mock('../lib/locationService', () => ({
  locationService: {
    getCurrentPosition: jest.fn(),
    getAddressFromCoordinates: jest.fn(),
    getIPAddress: jest.fn(),
    getIPLocation: jest.fn(),
    getFullLocationData: jest.fn(),
    getQuickLocation: jest.fn().mockResolvedValue({ 
      ipLocation: undefined,
      timestamp: Date.now()
    })
  }
}));

const mockLocationService = locationService as jest.Mocked<typeof locationService>;

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

const mockCoordinates = {
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp: Date.now()
};

const mockAddress = {
  street: '123 Main St',
  house_number: '123',
  city: 'New York',
  postcode: '10001',
  country: 'USA',
  formatted: '123 Main St, New York, NY 10001, USA'
};

const mockIPLocation = {
  ip: '127.0.0.1',
  city: 'New York',
  region: 'NY',
  country: 'US',
  timezone: 'America/New_York'
};

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocationProvider>{children}</LocationProvider>
);

describe('LocationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true
    });
    // Setup permissions mock
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ 
          state: 'granted',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        })
      },
      writable: true
    });
    
    // Reset all mock implementations to default
    mockLocationService.getQuickLocation.mockResolvedValue({ 
      ipLocation: undefined,
      timestamp: Date.now()
    });
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
    });
    mockLocationService.getCurrentPosition.mockResolvedValue(mockCoordinates);
    mockLocationService.getAddressFromCoordinates.mockResolvedValue(mockAddress);
    mockLocationService.getIPAddress.mockResolvedValue('127.0.0.1');
    mockLocationService.getIPLocation.mockResolvedValue(mockIPLocation);
  });

  it('throws error when useLocation is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const TestComponent = () => {
      useLocation();
      return null;
    };
    
    expect(() => render(<TestComponent />)).toThrow(
      'useLocation must be used within a LocationProvider'
    );
    
    consoleSpy.mockRestore();
  });

  it('provides initial state', async () => {
    // Mock getFullLocationData to prevent actual API calls
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
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
      coordinates: mockCoordinates,
      address: mockAddress,
      ipLocation: mockIPLocation,
      timestamp: Date.now()
    };
    
    mockLocationService.getFullLocationData.mockResolvedValue(mockLocationData);
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.coordinates).toEqual(mockCoordinates);
    expect(result.current.address).toEqual(mockAddress);
    expect(result.current.ipLocation).toEqual(mockIPLocation);
    expect(result.current.hasLocation).toBe(true);
  });

  it('handles geolocation permission denied', async () => {
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ state: 'denied' })
      },
      writable: true
    });
    
    // Mock getFullLocationData to return only IP location (simulating GPS denied)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: mockIPLocation,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.coordinates).toBeNull();
    expect(result.current.address).toBeNull();
    expect(result.current.ipLocation).toEqual(mockIPLocation);
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('handles geolocation timeout', async () => {
    // Mock getFullLocationData to throw timeout error
    mockLocationService.getFullLocationData.mockRejectedValue(
      new Error('Location request timed out')
    );
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.error).toContain('Location request timed out');
  });

  it('refreshes location when requested', async () => {
    const initialLocationData = {
      coordinates: mockCoordinates,
      address: mockAddress,
      ipLocation: mockIPLocation,
      timestamp: Date.now()
    };
    
    mockLocationService.getFullLocationData.mockResolvedValue(initialLocationData);
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Clear mocks to verify refresh calls them again
    jest.clearAllMocks();
    
    // Update mock with new data for refresh
    const updatedLocationData = {
      ...initialLocationData,
      timestamp: Date.now() + 1000
    };
    mockLocationService.getFullLocationData.mockResolvedValue(updatedLocationData);
    
    await act(async () => {
      await result.current.fetchLocationData(true);
    });
    
    expect(mockLocationService.getFullLocationData).toHaveBeenCalled();
  });

  it('clears error when clearError is called', async () => {
    // Mock getFullLocationData to throw an error
    mockLocationService.getFullLocationData.mockRejectedValue(
      new Error('Position unavailable')
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
  });

  it('handles API errors gracefully', async () => {
    // Mock getFullLocationData to return partial data (only coordinates)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: mockCoordinates,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Should still have coordinates even if geocoding fails
    expect(result.current.coordinates).toEqual(mockCoordinates);
    expect(result.current.address).toBeNull();
    expect(result.current.ipLocation).toBeNull();
  });

  it('calculates hasLocation correctly', async () => {
    // Start with no location data
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    // Initially false
    expect(result.current.hasLocation).toBe(false);
    
    // Update mock to return coordinates
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: mockCoordinates,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
    });
    
    await act(async () => {
      await result.current.fetchLocationData(true);
    });
    
    await waitFor(() => {
      expect(result.current.hasLocation).toBe(true);
    });
  });

  it('updates lastUpdated timestamp', async () => {
    const beforeUpdate = Date.now();
    
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: mockCoordinates,
      address: undefined,
      ipLocation: undefined,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.lastUpdated).toBeGreaterThanOrEqual(beforeUpdate);
    expect(result.current.lastUpdated).toBeLessThanOrEqual(Date.now());
  });

  it('handles missing geolocation API', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true
    });
    
    // Mock getFullLocationData to return only IP location (no GPS available)
    mockLocationService.getFullLocationData.mockResolvedValue({
      coordinates: undefined,
      address: undefined,
      ipLocation: mockIPLocation,
      timestamp: Date.now()
    });
    
    const { result } = renderHook(() => useLocation(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });
    
    expect(result.current.coordinates).toBeNull();
    expect(result.current.ipLocation).toEqual(mockIPLocation);
  });
});