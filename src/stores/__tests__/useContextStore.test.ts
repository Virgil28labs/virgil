/**
 * Context Store Hooks Tests
 * 
 * Tests for the hook API that provides optimized access to the store
 * with proper selector patterns and re-render optimization.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useCurrentTime,
  useCurrentDate,
  useTimeOfDay,
  useTimestamp,
  useLocationState,
  useCoordinates,
  useWeatherData,
  useAuthStatus,
  useActivityActions,
  useTimeActions,
} from '../hooks/useContextStore';
import { useContextStore } from '../ContextStore';
// timeService is mocked below

// Mock TimeService
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getCurrentTime: jest.fn(() => '12:00'),
    getCurrentDate: jest.fn(() => 'January 20, 2024'),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'saturday'),
    getTimestamp: jest.fn(() => 1640995200000),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
    subscribeToTimeUpdates: jest.fn(() => jest.fn()),
    getRelativeTime: jest.fn((_date) => '2 hours ago'),
  },
}));

// const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('Context Store Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Time Hooks', () => {
    it('useCurrentTime should return current time', () => {
      const { result } = renderHook(() => useCurrentTime());
      
      expect(result.current).toBe('12:00');
    });

    it('useCurrentDate should return current date', () => {
      const { result } = renderHook(() => useCurrentDate());
      
      expect(result.current).toBe('January 20, 2024');
    });

    it('useTimeOfDay should return time of day', () => {
      const { result } = renderHook(() => useTimeOfDay());
      
      expect(result.current).toBe('afternoon');
    });

    it('useTimestamp should return current timestamp', () => {
      const { result } = renderHook(() => useTimestamp());
      
      expect(typeof result.current).toBe('number');
    });

    it('useTimeActions should provide time manipulation functions', () => {
      const { result } = renderHook(() => useTimeActions());
      
      expect(result.current.updateTime).toBeInstanceOf(Function);
      expect(result.current.setTimeValid).toBeInstanceOf(Function);
      expect(result.current.syncWithTimeService).toBeInstanceOf(Function);
    });

    it('should update when time state changes', () => {
      const { result } = renderHook(() => useCurrentTime());
      
      expect(result.current).toBe('12:00');

      // Update time in store
      act(() => {
        useContextStore.getState().time.updateTime({ currentTime: '15:30' });
      });

      expect(result.current).toBe('15:30');
    });
  });

  describe('Location Hooks', () => {
    it('useLocationState should return complete location state', () => {
      const { result } = renderHook(() => useLocationState());
      
      expect(result.current).toMatchObject({
        coordinates: null,
        address: null,
        ipLocation: null,
        loading: false,
        error: null,
        hasLocation: false,
      });
    });

    it('useCoordinates should return coordinates', () => {
      const { result } = renderHook(() => useCoordinates());
      
      expect(result.current).toBeNull();

      // Update coordinates
      const coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: Date.now(),
      };

      act(() => {
        useContextStore.getState().location.setCoordinates(coordinates);
      });

      expect(result.current).toEqual(coordinates);
    });

    it('should not re-render when unrelated location state changes', () => {
      let renderCount = 0;
      
      renderHook(() => {
        renderCount++;
        return useCoordinates();
      });

      const initialRenderCount = renderCount;

      // Update address (unrelated to coordinates)
      act(() => {
        useContextStore.getState().location.setAddress({
          street: 'Main St',
          house_number: '123',
          city: 'Test City',
          postcode: '12345',
          country: 'US',
          formatted: '123 Main St',
        });
      });

      // Should not re-render
      expect(renderCount).toBe(initialRenderCount);
    });
  });

  describe('Weather Hooks', () => {
    it('useWeatherData should return weather data', () => {
      const { result } = renderHook(() => useWeatherData());
      
      expect(result.current).toBeNull();

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
        useContextStore.getState().weather.setWeatherData(weatherData);
      });

      expect(result.current).toEqual(weatherData);
    });
  });

  describe('User Hooks', () => {
    it('useAuthStatus should return authentication status', () => {
      const { result } = renderHook(() => useAuthStatus());
      
      expect(result.current).toMatchObject({
        isAuthenticated: false,
        loading: false,
        memberSince: undefined,
      });

      // Update user
      const userData = {
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
      };

      act(() => {
        useContextStore.getState().user.setUser(userData);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.memberSince).toBeDefined();
    });
  });

  describe('Activity Hooks', () => {
    it('useActivityActions should provide activity functions', () => {
      const { result } = renderHook(() => useActivityActions());
      
      expect(result.current.logActivity).toBeInstanceOf(Function);
      expect(result.current.addActiveComponent).toBeInstanceOf(Function);
      expect(result.current.removeActiveComponent).toBeInstanceOf(Function);
    });

    it('should log activities correctly', () => {
      const { result: actionsResult } = renderHook(() => useActivityActions());
      const { result: stateResult } = renderHook(() => 
        useContextStore((state) => state.activity.recentActions),
      );

      expect(stateResult.current).toHaveLength(0);

      act(() => {
        actionsResult.current.logActivity('test_action', 'test_component');
      });

      expect(stateResult.current).toHaveLength(1);
      expect(stateResult.current[0].action).toBe('test_action');
      expect(stateResult.current[0].component).toBe('test_component');
    });
  });

  describe('Selector Optimization', () => {
    it('should only re-render when selected data changes', () => {
      let timeRenderCount = 0;
      let locationRenderCount = 0;

      renderHook(() => {
        timeRenderCount++;
        return useCurrentTime();
      });

      renderHook(() => {
        locationRenderCount++;
        return useCoordinates();
      });

      const initialTimeRenders = timeRenderCount;
      const initialLocationRenders = locationRenderCount;

      // Update time - should only trigger time hook re-render
      act(() => {
        useContextStore.getState().time.updateTime({ currentTime: '13:00' });
      });

      expect(timeRenderCount).toBe(initialTimeRenders + 1);
      expect(locationRenderCount).toBe(initialLocationRenders);

      // Update location - should only trigger location hook re-render
      act(() => {
        useContextStore.getState().location.setCoordinates({
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: Date.now(),
        });
      });

      expect(timeRenderCount).toBe(initialTimeRenders + 1); // No additional renders
      expect(locationRenderCount).toBe(initialLocationRenders + 1);
    });

    it('should handle rapid updates efficiently', () => {
      let renderCount = 0;
      
      const { result } = renderHook(() => {
        renderCount++;
        return useCurrentTime();
      });

      const initialRenderCount = renderCount;

      // Perform rapid updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          useContextStore.getState().time.updateTime({ 
            currentTime: `${12 + i}:00`, 
          });
        }
      });

      // Should handle all updates but render count should be reasonable
      expect(result.current).toBe('21:00');
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      // This tests the hook's resilience when store operations fail
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useTimeActions());

      // Attempt to call actions even if they might fail
      act(() => {
        try {
          result.current.updateTime({ currentTime: 'invalid' });
        } catch (_error) {
          // Should not crash the hook
        }
      });

      expect(result.current).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useCurrentTime());
      
      // No direct way to test subscription cleanup, but unmounting
      // should not cause memory leaks or errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple hook instances', () => {
      const hooks = [];
      
      // Create multiple instances of the same hook
      for (let i = 0; i < 10; i++) {
        hooks.push(renderHook(() => useCurrentTime()));
      }

      // All should return the same value
      const values = hooks.map(hook => hook.result.current);
      expect(new Set(values).size).toBe(1); // All values should be the same

      // Update state
      act(() => {
        useContextStore.getState().time.updateTime({ currentTime: '14:00' });
      });

      // All hooks should update
      const updatedValues = hooks.map(hook => hook.result.current);
      expect(new Set(updatedValues).size).toBe(1);
      expect(updatedValues[0]).toBe('14:00');

      // Clean up
      hooks.forEach(hook => hook.unmount());
    });
  });

  describe('Integration with Legacy Patterns', () => {
    it('should work alongside legacy context providers during migration', () => {
      // This simulates the migration period where both systems might coexist
      const { result } = renderHook(() => useCurrentTime());
      
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('string');
    });
  });
});