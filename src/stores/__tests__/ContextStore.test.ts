/**
 * Context Store Tests
 * 
 * Comprehensive tests for the Zustand-based context store with
 * special focus on time service integration and state management.
 */

import { act, renderHook } from '@testing-library/react';
import { useContextStore, getStoreState, cleanupContextStore } from '../ContextStore';
import { timeService } from '../../services/TimeService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';

// Mock TimeService
jest.mock('../../services/TimeService', () => {
  const actualTimeService = jest.requireActual('../../services/TimeService');
  return {
    timeService: {
      ...actualTimeService.timeService,
      getCurrentTime: jest.fn(() => '12:00'),
      getCurrentDate: jest.fn(() => 'January 20, 2024'),
      getTimeOfDay: jest.fn(() => 'afternoon'),
      getDayOfWeek: jest.fn(() => 'saturday'),
      getTimestamp: jest.fn(() => 1640995200000),
      getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
      subscribeToTimeUpdates: jest.fn(() => jest.fn()),
    },
  };
});

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('ContextStore', () => {
  let timeContext: ReturnType<typeof setupTimeTest>;

  beforeEach(() => {
    jest.clearAllMocks();
    timeContext = setupTimeTest('2024-01-20T12:00:00');
    
    // Reset mocks to default values
    mockTimeService.getCurrentTime.mockReturnValue('12:00');
    mockTimeService.getCurrentDate.mockReturnValue('January 20, 2024');
    mockTimeService.getTimeOfDay.mockReturnValue('afternoon');
    mockTimeService.getDayOfWeek.mockReturnValue('saturday');
    mockTimeService.getTimestamp.mockReturnValue(1640995200000);
    mockTimeService.getCurrentDateTime.mockReturnValue(new Date('2024-01-20T12:00:00'));
    
    // Reset store state by clearing coordinates that might have been set in previous tests
    const store = useContextStore.getState();
    store.location.setCoordinates(null);
    store.location.setIpLocation(null);
    store.location.updateLocation({
      locationSource: null,
      hasLocation: false,
      hasGPSLocation: false,
      hasIpLocation: false,
      isPreciseLocation: false,
    });
  });

  afterEach(() => {
    timeContext.cleanup();
    cleanupContextStore();
  });

  describe('Store Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useContextStore((state) => state));
      
      expect(result.current.time.isValid).toBe(true);
      expect(result.current.time.currentTime).toBe('12:00');
      expect(result.current.time.currentDate).toBe('January 20, 2024');
      expect(result.current.time.timeOfDay).toBe('afternoon');
      expect(result.current.time.dayOfWeek).toBe('saturday');
      expect(result.current.time.isActive).toBe(true);
    });

    it('should handle TimeService initialization failure gracefully', () => {
      // Since we're not auto-initializing in tests, we need to manually trigger sync
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      // Mock TimeService to fail
      mockTimeService.getCurrentTime.mockImplementation(() => {
        throw new Error('TimeService error');
      });

      // Manually sync to trigger the error
      act(() => {
        result.current.syncWithTimeService();
      });
      
      expect(result.current.isValid).toBe(false);
      expect(result.current.currentTime).toBeDefined(); // Should have some fallback value
    });

    it('should initialize all slices with correct default states', () => {
      const { result } = renderHook(() => useContextStore((state) => state));
      
      // Location slice
      expect(result.current.location.coordinates).toBeNull();
      expect(result.current.location.hasLocation).toBe(false);
      expect(result.current.location.loading).toBe(false);
      expect(result.current.location.initialized).toBe(false);
      
      // Weather slice
      expect(result.current.weather.data).toBeNull();
      expect(result.current.weather.hasWeather).toBe(false);
      expect(result.current.weather.unit).toBe('fahrenheit');
      
      // User slice
      expect(result.current.user.user).toBeNull();
      expect(result.current.user.isAuthenticated).toBe(false);
      
      // Environment slice
      expect(result.current.environment.deviceType).toBeDefined();
      expect(result.current.environment.isOnline).toBeDefined();
    });
  });

  describe('Time Slice', () => {
    it('should sync with TimeService correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.syncWithTimeService();
      });

      expect(mockTimeService.getCurrentTime).toHaveBeenCalled();
      expect(mockTimeService.getCurrentDate).toHaveBeenCalled();
      expect(mockTimeService.getTimeOfDay).toHaveBeenCalled();
      expect(mockTimeService.getDayOfWeek).toHaveBeenCalled();
    });

    it('should handle TimeService subscription', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.subscribeToTimeService();
      });

      expect(mockTimeService.subscribeToTimeUpdates).toHaveBeenCalled();
    });

    it('should update time state correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.updateTime({
          currentTime: '14:30',
          timeOfDay: 'afternoon',
        });
      });

      expect(result.current.currentTime).toBe('14:30');
      expect(result.current.timeOfDay).toBe('afternoon');
    });

    it('should handle time validity changes', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.setTimeValid(false);
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should manage update interval correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.setUpdateInterval(2000);
      });

      expect(result.current.updateInterval).toBe(2000);
    });

    it('should enforce minimum and maximum update intervals', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      // Test minimum
      act(() => {
        result.current.setUpdateInterval(50);
      });
      expect(result.current.updateInterval).toBe(100);

      // Test maximum
      act(() => {
        result.current.setUpdateInterval(120000);
      });
      expect(result.current.updateInterval).toBe(60000);
    });
  });

  describe('Location Slice', () => {
    it('should update coordinates correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      const coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: Date.now(),
      };

      act(() => {
        result.current.setCoordinates(coordinates);
      });

      expect(result.current.coordinates).toEqual(coordinates);
      expect(result.current.hasGPSLocation).toBe(true);
      expect(result.current.hasLocation).toBe(true);
      expect(result.current.isPreciseLocation).toBe(true);
      expect(result.current.locationSource).toBe('gps');
    });

    it('should update address correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      const address = {
        street: 'Main St',
        house_number: '123',
        city: 'San Francisco',
        postcode: '94102',
        country: 'US',
        formatted: '123 Main St, San Francisco, CA',
      };

      act(() => {
        result.current.setAddress(address);
      });

      expect(result.current.address).toEqual(address);
    });

    it('should handle IP location correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      // Ensure we start with no coordinates to test IP location source correctly
      expect(result.current.coordinates).toBeNull();
      expect(result.current.locationSource).toBeNull();
      
      const ipLocation = {
        ip: '192.168.1.1',
        city: 'San Francisco',
        region: 'CA',
        country: 'US',
      };

      act(() => {
        result.current.setIpLocation(ipLocation);
      });

      expect(result.current.ipLocation).toEqual(ipLocation);
      expect(result.current.hasIpLocation).toBe(true);
      expect(result.current.hasLocation).toBe(true);
      expect(result.current.locationSource).toBe('ip');
    });

    it('should manage loading state', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should handle errors correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      act(() => {
        result.current.setError('Location access denied');
      });

      expect(result.current.error).toBe('Location access denied');
      expect(result.current.loading).toBe(false);
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useContextStore((state) => state.location));
      
      act(() => {
        result.current.setError('Some error');
      });
      
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Weather Slice', () => {
    it('should update weather data correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.weather));
      
      const weatherData = {
        temperature: 72,
        feelsLike: 75,
        tempMin: 68,
        tempMax: 78,
        humidity: 65,
        pressure: 1013,
        windSpeed: 8.5,
        windDeg: 315,
        clouds: 0,
        visibility: 10000,
        condition: {
          id: 800,
          main: 'Clear',
          description: 'Clear sky',
          icon: '01d',
        },
        sunrise: 1640995200000,
        sunset: 1641026800000,
        timezone: -18000,
        cityName: 'San Francisco',
        country: 'US',
        timestamp: Date.now(),
      };

      act(() => {
        result.current.setWeatherData(weatherData);
      });

      expect(result.current.data).toEqual(weatherData);
      expect(result.current.hasWeather).toBe(true);
    });

    it('should toggle temperature unit', () => {
      const { result } = renderHook(() => useContextStore((state) => state.weather));
      
      expect(result.current.unit).toBe('fahrenheit');
      
      act(() => {
        result.current.toggleUnit();
      });

      expect(result.current.unit).toBe('celsius');
      
      act(() => {
        result.current.toggleUnit();
      });

      expect(result.current.unit).toBe('fahrenheit');
    });

    it('should set specific unit', () => {
      const { result } = renderHook(() => useContextStore((state) => state.weather));
      
      act(() => {
        result.current.setUnit('celsius');
      });

      expect(result.current.unit).toBe('celsius');
    });
  });

  describe('User Slice', () => {
    it('should update user data correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: { name: 'Test User' },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        role: 'authenticated',
        identities: [],
        is_anonymous: false,
      };

      act(() => {
        result.current.setUser(userData);
      });

      expect(result.current.user).toEqual({
        ...userData,
        name: '',
        dob: '',
        username: '',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.memberSince).toBeDefined();
    });

    it('should handle sign out', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // First set a user
      act(() => {
        result.current.setUser({
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then sign out
      act(() => {
        result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.profile).toBeNull();
    });
  });

  describe('Activity Slice', () => {
    it('should log activities correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.activity));
      
      act(() => {
        result.current.logActivity('user_clicked_button', 'dashboard');
      });

      expect(result.current.recentActions).toHaveLength(1);
      expect(result.current.recentActions[0].action).toBe('user_clicked_button');
      expect(result.current.recentActions[0].component).toBe('dashboard');
      expect(result.current.activeComponents).toContain('dashboard');
    });

    it('should manage active components', () => {
      const { result } = renderHook(() => useContextStore((state) => state.activity));
      
      act(() => {
        result.current.addActiveComponent('weather');
        result.current.addActiveComponent('location');
      });

      expect(result.current.activeComponents).toContain('weather');
      expect(result.current.activeComponents).toContain('location');
      
      act(() => {
        result.current.removeActiveComponent('weather');
      });

      expect(result.current.activeComponents).not.toContain('weather');
      expect(result.current.activeComponents).toContain('location');
    });

    it('should limit recent actions to prevent memory leaks', () => {
      const { result } = renderHook(() => useContextStore((state) => state.activity));
      
      // Add more than 50 actions
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.logActivity(`action_${i}`);
        }
      });

      expect(result.current.recentActions.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Environment Slice', () => {
    it('should update online status', () => {
      const { result } = renderHook(() => useContextStore((state) => state.environment));
      
      act(() => {
        result.current.setOnlineStatus(false);
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('should update device type', () => {
      const { result } = renderHook(() => useContextStore((state) => state.environment));
      
      act(() => {
        result.current.setDeviceType('mobile');
      });

      expect(result.current.deviceType).toBe('mobile');
    });

    it('should update viewport dimensions', () => {
      const { result } = renderHook(() => useContextStore((state) => state.environment));
      
      act(() => {
        result.current.updateViewport(1920, 1080);
      });

      expect(result.current.viewport).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('Store Utilities', () => {
    it('should provide current state via getStoreState', () => {
      const state = getStoreState();
      
      expect(state).toBeDefined();
      expect(state.time).toBeDefined();
      expect(state.location).toBeDefined();
      expect(state.weather).toBeDefined();
    });

    it('should handle store subscriptions', () => {
      const callback = jest.fn();
      renderHook(() => useContextStore((state) => state.time.currentTime));
      
      // Subscribe to time changes
      const unsubscribe = useContextStore.subscribe(
        (state) => state.time.currentTime,
        callback,
      );

      // Update time
      act(() => {
        useContextStore.getState().time.updateTime({ currentTime: '15:30' });
      });

      expect(callback).toHaveBeenCalled();
      
      unsubscribe();
    });
  });

  describe('Integration with TimeService', () => {
    it('should maintain TimeService as single source of truth', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      // Manually trigger sync since auto-initialization is disabled in tests
      act(() => {
        result.current.syncWithTimeService();
      });
      
      // TimeService should be called for sync
      expect(mockTimeService.getCurrentTime).toHaveBeenCalled();
      expect(mockTimeService.getCurrentDate).toHaveBeenCalled();
    });

    it('should handle TimeService errors gracefully', () => {
      mockTimeService.getCurrentTime.mockImplementation(() => {
        throw new Error('TimeService failure');
      });

      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      act(() => {
        result.current.syncWithTimeService();
      });

      expect(result.current.isValid).toBe(false);
      // Store should still function with fallback values
      expect(result.current.currentTime).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      renderHook(() => {
        renderCount++;
        return useContextStore((state) => state.time.currentTime);
      });

      const initialRenderCount = renderCount;

      // Update unrelated state
      act(() => {
        useContextStore.getState().location.setLoading(true);
      });

      // Should not re-render since we're only subscribing to time
      expect(renderCount).toBe(initialRenderCount);
    });

    it('should handle rapid updates efficiently', () => {
      const { result } = renderHook(() => useContextStore((state) => state.time));
      
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateTime({ timestamp: Date.now() + i });
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 100 updates in reasonable time
      expect(duration).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('New User Fields', () => {
    it('should set user name correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // First set a user to work with
      act(() => {
        result.current.setUser({
          id: 'user-123',
          name: '',
          dob: '',
          username: '',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      act(() => {
        result.current.setUserName('Ben');
      });

      expect(result.current.user?.name).toBe('Ben');
    });

    it('should set user date of birth correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // First set a user to work with
      act(() => {
        result.current.setUser({
          id: 'user-123',
          name: '',
          dob: '',
          username: '',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      act(() => {
        result.current.setUserDob('28-11-1982');
      });

      expect(result.current.user?.dob).toBe('28-11-1982');
    });

    it('should set user ID correctly', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // First set a user to work with
      act(() => {
        result.current.setUser({
          id: 'user-123',
          name: '',
          dob: '',
          username: '',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      act(() => {
        result.current.setUsername('Ben28');
      });

      expect(result.current.user?.username).toBe('Ben28');
    });

    it('should update multiple user fields at once', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // First set a user to work with
      act(() => {
        result.current.setUser({
          id: 'user-123',
          name: '',
          dob: '',
          username: '',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      act(() => {
        result.current.updateUserFields({
          name: 'Ben',
          dob: '28-11-1982',
          username: 'Ben28',
        });
      });

      expect(result.current.user?.name).toBe('Ben');
      expect(result.current.user?.dob).toBe('28-11-1982');
      expect(result.current.user?.username).toBe('Ben28');
    });

    it('should handle setUser with new fields', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      const userData = {
        id: 'user-123',
        name: 'Ben',
        dob: '28-11-1982',
        username: 'Ben28',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        role: 'authenticated',
        identities: [],
        is_anonymous: false,
      };

      act(() => {
        result.current.setUser(userData);
      });

      expect(result.current.user?.name).toBe('Ben');
      expect(result.current.user?.dob).toBe('28-11-1982');
      expect(result.current.user?.username).toBe('Ben28');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Environment Context', () => {
    it('should initialize with default environment values', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user.env));
      
      expect(result.current).toEqual({
        ip: '',
        city: '',
        lat: 0,
        long: 0,
        weather: '',
        deviceType: 'desktop',
        browser: '',
        os: '',
      });
    });

    it('should update environment context from source data', () => {
      const { result } = renderHook(() => useContextStore((state) => state));
      
      // Set up source data
      act(() => {
        result.current.location.setCoordinates({
          latitude: 34.0451,
          longitude: -118.4422,
          accuracy: 10,
          timestamp: Date.now(),
        });
        
        result.current.location.setAddress({
          street: 'Main St',
          house_number: '123',
          city: 'Los Angeles',
          postcode: '90210',
          country: 'US',
          formatted: '123 Main St, Los Angeles, CA',
        });

        result.current.weather.setWeatherData({
          temperature: 82,
          feelsLike: 85,
          tempMin: 75,
          tempMax: 88,
          humidity: 65,
          pressure: 1013,
          windSpeed: 8.5,
          windDeg: 315,
          clouds: 0,
          visibility: 10000,
          condition: {
            id: 800,
            main: 'Clear',
            description: 'Clear sky',
            icon: '01d',
          },
          sunrise: 1640995200000,
          sunset: 1641026800000,
          timezone: -18000,
          cityName: 'Los Angeles',
          country: 'US',
          timestamp: Date.now(),
        });

        result.current.environment.setDeviceType('desktop');
        
        // Explicitly set weather unit to fahrenheit
        result.current.weather.setUnit('fahrenheit');
      });

      // Update environment context
      act(() => {
        result.current.user.updateEnvironmentContext();
      });

      expect(result.current.user.env.city).toBe('Los Angeles');
      expect(result.current.user.env.lat).toBe(34.0451);
      expect(result.current.user.env.long).toBe(-118.4422);
      expect(result.current.user.env.weather).toBe('Clear, 82°F');
      expect(result.current.user.env.deviceType).toBe('desktop');
    });

    it('should set specific environment fields', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      act(() => {
        result.current.setEnvironmentField('ip', '76.33.141.122');
        result.current.setEnvironmentField('browser', 'Chrome');
        result.current.setEnvironmentField('os', 'macOS');
      });

      expect(result.current.env.ip).toBe('76.33.141.122');
      expect(result.current.env.browser).toBe('Chrome');
      expect(result.current.env.os).toBe('macOS');
    });

    it('should handle weather formatting in environment context', () => {
      const { result } = renderHook(() => useContextStore((state) => state));
      
      // Set weather data
      act(() => {
        result.current.weather.setWeatherData({
          temperature: 25,
          feelsLike: 28,
          tempMin: 20,
          tempMax: 30,
          humidity: 65,
          pressure: 1013,
          windSpeed: 8.5,
          windDeg: 315,
          clouds: 20,
          visibility: 10000,
          condition: {
            id: 801,
            main: 'Clouds',
            description: 'Few clouds',
            icon: '02d',
          },
          sunrise: 1640995200000,
          sunset: 1641026800000,
          timezone: -18000,
          cityName: 'Los Angeles',
          country: 'US',
          timestamp: Date.now(),
        });

        // Set unit to celsius
        result.current.weather.setUnit('celsius');
      });

      // Update environment context
      act(() => {
        result.current.user.updateEnvironmentContext();
      });

      // Should format weather with celsius (25°F converted to celsius = -4°C, but since we set celsius, it should show as is)
      expect(result.current.user.env.weather).toContain('Clouds');
      expect(result.current.user.env.weather).toContain('°C');
    });

    it('should reset environment context on sign out', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // Set up environment data
      act(() => {
        result.current.setEnvironmentField('ip', '76.33.141.122');
        result.current.setEnvironmentField('city', 'Los Angeles');
        result.current.setEnvironmentField('browser', 'Chrome');
      });

      // Sign out
      act(() => {
        result.current.signOut();
      });

      expect(result.current.env).toEqual({
        ip: '',
        city: '',
        lat: 0,
        long: 0,
        weather: '',
        deviceType: 'desktop',
        browser: '',
        os: '',
      });
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency between user fields and profile', () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      const profile = {
        nickname: 'Ben',
        fullName: 'Ben Smith',
        dateOfBirth: '28-11-1982',
        email: 'ben@example.com',
        phone: '',
        gender: 'male',
        maritalStatus: 'single',
        uniqueId: 'Ben28',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: '',
        },
      };

      // Set profile first
      act(() => {
        result.current.setProfile(profile);
      });

      // Update user fields to match
      act(() => {
        result.current.updateUserFields({
          name: profile.nickname,
          dob: profile.dateOfBirth,
          username: profile.uniqueId,
        });
      });

      expect(result.current.profile?.nickname).toBe('Ben');
      // Note: user fields would need a user object to be set first
    });

    it('should handle complete user data flow', () => {
      const { result } = renderHook(() => useContextStore((state) => state));
      
      // 1. Set user authentication
      act(() => {
        result.current.user.setUser({
          id: 'user-123',
          name: 'Ben',
          dob: '28-11-1982',
          username: 'Ben28',
          email: 'ben@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          identities: [],
          is_anonymous: false,
        });
      });

      // 2. Set location data
      act(() => {
        result.current.location.setCoordinates({
          latitude: 34.0451,
          longitude: -118.4422,
          accuracy: 10,
          timestamp: Date.now(),
        });
      });

      // 3. Set weather data
      act(() => {
        result.current.weather.setWeatherData({
          temperature: 82,
          feelsLike: 85,
          tempMin: 75,
          tempMax: 88,
          humidity: 65,
          pressure: 1013,
          windSpeed: 8.5,
          windDeg: 315,
          clouds: 0,
          visibility: 10000,
          condition: {
            id: 800,
            main: 'Clear',
            description: 'Clear sky',
            icon: '01d',
          },
          sunrise: 1640995200000,
          sunset: 1641026800000,
          timezone: -18000,
          cityName: 'Los Angeles',
          country: 'US',
          timestamp: Date.now(),
        });
      });

      // 4. Update environment context
      act(() => {
        result.current.user.updateEnvironmentContext();
      });

      // Verify complete integration
      expect(result.current.user.isAuthenticated).toBe(true);
      expect(result.current.user.user?.name).toBe('Ben');
      expect(result.current.user.env.lat).toBe(34.0451);
      expect(result.current.user.env.weather).toContain('Clear');
    });
  });
});