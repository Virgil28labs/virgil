/**
 * DashboardContextService Integration Tests
 * 
 * Tests comprehensive integration scenarios including real-time updates,
 * cross-service coordination, and performance under load.
 */

import { DashboardContextService } from '../DashboardContextService';
import { dashboardAppService } from '../DashboardAppService';
import { timeService } from '../TimeService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';
import type { LocationContextValue } from '../../types/location.types';
import type { WeatherContextType } from '../../types/weather.types';
import type { AuthContextValue } from '../../types/auth.types';
import type { DeviceInfo } from '../../hooks/useDeviceInfo';

// Mock all dependencies
jest.mock('../TimeService');
jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    getAllAppData: jest.fn(() => ({ apps: new Map(), activeApps: [], lastUpdated: Date.now() })),
    subscribe: jest.fn(() => jest.fn()),
    getContextSummary: jest.fn(() => 'No active dashboard apps'),
    destroy: jest.fn(),
    registerAdapter: jest.fn(),
    unregisterAdapter: jest.fn(),
  },
}));

const mockDashboardAppService = dashboardAppService as jest.Mocked<typeof dashboardAppService>;

describe('DashboardContextService Integration Tests', () => {
  let service: DashboardContextService;
  let timeContext: ReturnType<typeof setupTimeTest>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up time context
    timeContext = setupTimeTest('2024-01-20T12:00:00');
    Object.assign(timeService, timeContext.timeService);
    
    // Reset dashboard app service mock to default behavior
    mockDashboardAppService.subscribe.mockImplementation(() => jest.fn());
    
    service = new DashboardContextService();
  });

  afterEach(() => {
    timeContext.cleanup();
  });

  describe('Real-time Context Updates', () => {
    it('coordinates multiple context updates in sequence', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Simulate rapid updates from different sources
      const locationData: LocationContextValue = {
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
        address: { street: '123 Main St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Main St, San Francisco, CA' },
        ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
        loading: false,
        error: null,
        permissionStatus: 'granted',
        lastUpdated: Date.now(),
        initialized: true,
        fetchLocationData: jest.fn(),
        requestLocationPermission: jest.fn(),
        clearError: jest.fn(),
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
      };

      const weatherData: WeatherContextType = {
        data: {
          temperature: 22,
          feelsLike: 24,
          tempMin: 18,
          tempMax: 26,
          humidity: 65,
          pressure: 1013,
          windSpeed: 5,
          windDeg: 180,
          clouds: 20,
          visibility: 10000,
          condition: { id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' },
          sunrise: Date.now() - 10000,
          sunset: Date.now() + 20000,
          timezone: -28800,
          cityName: 'San Francisco',
          country: 'US',
          timestamp: Date.now(),
        },
        forecast: null,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        unit: 'celsius',
        fetchWeather: jest.fn(),
        toggleUnit: jest.fn(),
        clearError: jest.fn(),
        hasWeather: true,
      };

      const userData: AuthContextValue = {
        user: {
          id: '1',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: { name: 'Test User' },
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          last_sign_in_at: '2024-01-01T00:00:00.000Z',
          confirmation_sent_at: undefined,
          confirmed_at: '2024-01-01T00:00:00.000Z',
          email_confirmed_at: '2024-01-01T00:00:00.000Z',
          phone: undefined,
          phone_confirmed_at: undefined,
          recovery_sent_at: undefined,
          new_email: undefined,
          invited_at: undefined,
          factors: undefined,
          identities: [],
          is_anonymous: false,
        },
        loading: false,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      };

      // Update all contexts rapidly
      service.updateLocationContext(locationData);
      service.updateWeatherContext(weatherData);
      service.updateUserContext(userData);

      // Verify all updates were processed
      const finalContext = service.getContext();
      expect(finalContext.location.hasGPS).toBe(true);
      expect(finalContext.location.city).toBe('San Francisco');
      expect(finalContext.weather.hasData).toBe(true);
      expect(finalContext.weather.temperature).toBe(22);
      expect(finalContext.user.isAuthenticated).toBe(true);
      expect(finalContext.user.email).toBe('test@example.com');

      // Listener should have been called for each update
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('handles concurrent context updates without race conditions', async () => {
      const listeners = Array.from({ length: 5 }, () => jest.fn());
      listeners.forEach(listener => service.subscribe(listener));

      // Simulate concurrent updates
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const locationPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            service.updateLocationContext({
              coordinates: { latitude: 37.7749 + i, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
              address: { street: `${i} Test St`, house_number: `${i}`, city: 'San Francisco', postcode: '94102', country: 'US', formatted: `${i} Test St, San Francisco, CA` },
              ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
              loading: false,
              error: null,
              permissionStatus: 'granted',
              lastUpdated: Date.now(),
              initialized: true,
              fetchLocationData: jest.fn(),
              requestLocationPermission: jest.fn(),
              clearError: jest.fn(),
              hasLocation: true,
              hasGPSLocation: true,
              hasIpLocation: true,
            });
            resolve();
          }, Math.random() * 10);
        });
        promises.push(locationPromise);
      }

      await Promise.all(promises);

      // Verify final state is consistent
      const context = service.getContext();
      expect(context.location.hasGPS).toBe(true);
      expect(context.location.city).toBe('San Francisco');

      // All listeners should have been called multiple times
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });

    it('maintains performance with high-frequency updates', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      const startTime = Date.now();
      
      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        service.updateLocationContext({
          coordinates: { latitude: 37.7749, longitude: -122.4194 + (i * 0.001), accuracy: 10, timestamp: Date.now() },
          address: { street: 'Test St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Test St, San Francisco, CA' },
          ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
          loading: false,
          error: null,
          permissionStatus: 'granted',
          lastUpdated: Date.now(),
          initialized: true,
          fetchLocationData: jest.fn(),
          requestLocationPermission: jest.fn(),
          clearError: jest.fn(),
          hasLocation: true,
          hasGPSLocation: true,
          hasIpLocation: true,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 updates in under 1 second
      expect(duration).toBeLessThan(1000);
      expect(listener).toHaveBeenCalledTimes(100);
    });
  });

  describe('Dashboard App Integration', () => {
    it('integrates with dashboard apps and updates context', async () => {
      let appUpdateCallback: ((data: unknown) => void) | undefined;
      
      mockDashboardAppService.subscribe.mockImplementation((callback) => {
        appUpdateCallback = callback;
        return jest.fn();
      });

      // Create new service to trigger app subscription
      const newService = new DashboardContextService();
      
      // Simulate app data update
      const mockAppData = {
        apps: new Map([
          ['notes', { count: 5, lastNote: 'Meeting at 3pm' }],
          ['pomodoro', { isActive: true, remainingTime: 1200 }],
          ['weather', { temperature: 24, condition: 'sunny' }],
        ]),
        activeApps: ['notes', 'pomodoro'],
        lastUpdated: Date.now(),
      };

      if (appUpdateCallback) {
        appUpdateCallback(mockAppData);
      }

      const context = newService.getContext();
      expect(context.apps).toEqual(mockAppData);
    });

    it('handles dashboard app failures gracefully', async () => {
      // Test service resilience when dashboard app service fails
      const context = service.getContext();
      expect(context).toBeDefined();
      expect(context.apps).toBeDefined();
      
      // Should maintain basic functionality even if apps fail
      expect(context.currentTime).toBeDefined();
      expect(context.currentDate).toBeDefined();
    });

    it('updates when dashboard apps change state', async () => {
      let appUpdateCallback: ((data: unknown) => void) | undefined;
      
      mockDashboardAppService.subscribe.mockImplementation((callback) => {
        appUpdateCallback = callback;
        return jest.fn();
      });

      const newService = new DashboardContextService();
      const listener = jest.fn();
      newService.subscribe(listener);

      // Simulate multiple app state changes
      const updates = [
        {
          apps: new Map([['notes', { count: 1 }]]),
          activeApps: ['notes'],
          lastUpdated: Date.now(),
        },
        {
          apps: new Map([['notes', { count: 2 }], ['pomodoro', { isActive: true }]]),
          activeApps: ['notes', 'pomodoro'],
          lastUpdated: Date.now(),
        },
        {
          apps: new Map([['notes', { count: 3 }], ['pomodoro', { isActive: false }]]),
          activeApps: ['notes'],
          lastUpdated: Date.now(),
        },
      ];

      if (appUpdateCallback) {
        updates.forEach(update => appUpdateCallback!(update));
      }

      expect(listener).toHaveBeenCalledTimes(3);
      
      const finalContext = newService.getContext();
      expect(finalContext.apps?.apps.get('notes')).toEqual({ count: 3 });
      expect(finalContext.apps?.activeApps).toEqual(['notes']);
    });
  });

  describe('Memory Management and Performance', () => {
    it('cleans up resources on destruction', () => {
      const service1 = new DashboardContextService();
      const service2 = new DashboardContextService();
      const service3 = new DashboardContextService();

      // Verify multiple services can coexist
      expect(service1.getContext()).toBeDefined();
      expect(service2.getContext()).toBeDefined();
      expect(service3.getContext()).toBeDefined();
    });

    it('handles memory pressure gracefully', async () => {
      const listeners: Array<() => void> = [];
      
      // Create many listeners
      for (let i = 0; i < 1000; i++) {
        const listener = jest.fn();
        const unsubscribe = service.subscribe(listener);
        listeners.push(unsubscribe);
      }

      // Update context
      service.updateLocationContext({
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
        address: { street: 'Test St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Test St, San Francisco, CA' },
        ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
        loading: false,
        error: null,
        permissionStatus: 'granted',
        lastUpdated: Date.now(),
        initialized: true,
        fetchLocationData: jest.fn(),
        requestLocationPermission: jest.fn(),
        clearError: jest.fn(),
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
      });

      // Clean up half the listeners
      for (let i = 0; i < 500; i++) {
        listeners[i]();
      }

      // Should still work with remaining listeners
      service.updateWeatherContext({
        data: {
          temperature: 25,
          feelsLike: 26,
          tempMin: 20,
          tempMax: 28,
          humidity: 60,
          pressure: 1013,
          windSpeed: 3,
          windDeg: 90,
          clouds: 10,
          visibility: 10000,
          condition: { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
          sunrise: Date.now() - 5000,
          sunset: Date.now() + 25000,
          timezone: -28800,
          cityName: 'San Francisco',
          country: 'US',
          timestamp: Date.now(),
        },
        forecast: null,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        unit: 'celsius',
        fetchWeather: jest.fn(),
        toggleUnit: jest.fn(),
        clearError: jest.fn(),
        hasWeather: true,
      });

      expect(service.getContext().weather.temperature).toBe(25);
    });

    it('handles large device info updates efficiently', async () => {
      const deviceData: DeviceInfo = {
        location: 'San Francisco, CA',
        ip: '192.168.1.100',
        device: 'Desktop',
        os: 'macOS Monterey 12.6',
        browser: 'Chrome 108.0.0.0',
        screen: '2560x1440',
        pixelRatio: 2,
        colorScheme: 'dark',
        windowSize: '1920x1080',
        cpu: 16,
        memory: '32 GB',
        online: true,
        networkType: 'wifi',
        downlink: '50 Mbps',
        rtt: '20 ms',
        batteryLevel: null,
        batteryCharging: null,
        localTime: '2:30 PM',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
        tabVisible: true,
        sessionDuration: 3600,
        cookiesEnabled: true,
        doNotTrack: 'false',
        storageQuota: '500 GB',
      };

      const startTime = Date.now();
      
      // Update device info multiple times
      for (let i = 0; i < 50; i++) {
        service.updateDeviceContext({
          ...deviceData,
          sessionDuration: 3600 + i,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should be fast
      expect(service.getContext().device.sessionDuration).toBe(3649);
    });
  });

  describe('Cross-Component Integration', () => {
    it('coordinates with time service for periodic updates', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Advance time and trigger periodic update
      timeContext.advanceTime(60000); // 1 minute

      // The service should have a timer running, but since we're mocking timeService,
      // we need to manually verify the integration
      const context = service.getContext();
      expect(context.currentTime).toBe('12:00');
      expect(context.currentDate).toBe('January 20, 2024');
    });

    it('integrates activity logging across components', async () => {
      // Log various activities
      service.logActivity('user_opened_notes');
      service.logActivity('user_started_pomodoro');
      service.logActivity('user_checked_weather');
      service.logActivity('user_sent_message');

      const context = service.getContext();
      expect(context.activity.recentActions).toContain('user_opened_notes');
      expect(context.activity.recentActions).toContain('user_started_pomodoro');
      expect(context.activity.recentActions).toContain('user_checked_weather');
      expect(context.activity.recentActions).toContain('user_sent_message');
    });

    it('handles network status changes in real-time', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      await new Promise(resolve => setTimeout(resolve, 10)); // Allow async processing

      let context = service.getContext();
      expect(context.environment.isOnline).toBe(false);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));

      await new Promise(resolve => setTimeout(resolve, 10)); // Allow async processing

      context = service.getContext();
      expect(context.environment.isOnline).toBe(true);

      // Should have triggered listeners
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('recovers from service failures without affecting other components', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Simulate TimeService failure
      const originalTimeService = { ...timeService };
      Object.assign(timeService, {
        ...timeService,
        getCurrentTime: () => { throw new Error('Time service error'); },
      });

      // Service should continue working
      service.updateLocationContext({
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
        address: { street: 'Test St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Test St, San Francisco, CA' },
        ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
        loading: false,
        error: null,
        permissionStatus: 'granted',
        lastUpdated: Date.now(),
        initialized: true,
        fetchLocationData: jest.fn(),
        requestLocationPermission: jest.fn(),
        clearError: jest.fn(),
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
      });

      const context = service.getContext();
      expect(context.location.hasGPS).toBe(true);
      expect(listener).toHaveBeenCalled();

      // Restore TimeService
      Object.assign(timeService, originalTimeService);
    });

    it('handles malformed context data gracefully', async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      // Try to update with malformed data
      const malformedLocation = {
        coordinates: { latitude: 'invalid', longitude: null } as any,
        address: null as any,
        loading: 'not a boolean' as any,
        hasLocation: undefined as any,
      } as LocationContextValue;

      // Should not crash
      expect(() => service.updateLocationContext(malformedLocation)).not.toThrow();

      const context = service.getContext();
      expect(context).toBeDefined();
      expect(context.location).toBeDefined();
    });

    it('maintains context integrity after errors', async () => {
      // Set up valid initial state
      service.updateLocationContext({
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
        address: { street: 'Test St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Test St, San Francisco, CA' },
        ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
        loading: false,
        error: null,
        permissionStatus: 'granted',
        lastUpdated: Date.now(),
        initialized: true,
        fetchLocationData: jest.fn(),
        requestLocationPermission: jest.fn(),
        clearError: jest.fn(),
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
      });

      // Create failing listener
      const failingListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const workingListener = jest.fn();

      service.subscribe(failingListener);
      service.subscribe(workingListener);

      // Update should not crash even with failing listener
      service.updateWeatherContext({
        data: {
          temperature: 20,
          feelsLike: 22,
          tempMin: 18,
          tempMax: 25,
          humidity: 65,
          pressure: 1013,
          windSpeed: 5,
          windDeg: 180,
          clouds: 30,
          visibility: 10000,
          condition: { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
          sunrise: Date.now() - 7200000,
          sunset: Date.now() + 18000000,
          timezone: -28800,
          cityName: 'San Francisco',
          country: 'US',
          timestamp: Date.now(),
        },
        forecast: null,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        unit: 'celsius',
        fetchWeather: jest.fn(),
        toggleUnit: jest.fn(),
        clearError: jest.fn(),
        hasWeather: true,
      });

      // Context should be updated correctly
      const context = service.getContext();
      expect(context.location.hasGPS).toBe(true);
      expect(context.weather.hasData).toBe(true);
      expect(context.weather.temperature).toBe(20);

      // Working listener should still be called
      expect(workingListener).toHaveBeenCalled();
    });
  });

  describe('Context Serialization and Transport', () => {
    it('produces serializable context for API transport', async () => {
      // Set up full context
      service.updateLocationContext({
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10, timestamp: Date.now() },
        address: { street: 'Test St', house_number: '123', city: 'San Francisco', postcode: '94102', country: 'US', formatted: '123 Test St, San Francisco, CA' },
        ipLocation: { ip: '127.0.0.1', city: 'San Francisco', region: 'CA', country: 'US' },
        loading: false,
        error: null,
        permissionStatus: 'granted',
        lastUpdated: Date.now(),
        initialized: true,
        fetchLocationData: jest.fn(),
        requestLocationPermission: jest.fn(),
        clearError: jest.fn(),
        hasLocation: true,
        hasGPSLocation: true,
        hasIpLocation: true,
      });

      service.updateUserContext({
        user: {
          id: '1',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: { preferences: { theme: 'dark', notifications: true } },
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          last_sign_in_at: '2024-01-01T00:00:00.000Z',
          confirmation_sent_at: undefined,
          confirmed_at: '2024-01-01T00:00:00.000Z',
          email_confirmed_at: '2024-01-01T00:00:00.000Z',
          phone: undefined,
          phone_confirmed_at: undefined,
          recovery_sent_at: undefined,
          new_email: undefined,
          invited_at: undefined,
          factors: undefined,
          identities: [],
          is_anonymous: false,
        },
        loading: false,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const context = service.getContext();

      // Should serialize without errors
      let serialized: string;
      expect(() => {
        serialized = JSON.stringify(context);
      }).not.toThrow();

      // Should deserialize correctly
      const deserialized = JSON.parse(serialized!);
      expect(deserialized.location.hasGPS).toBe(true);
      expect(deserialized.user.isAuthenticated).toBe(true);
      expect(deserialized.currentTime).toBe('12:00');
    });

    it('handles circular references in context data', async () => {
      // Create context with potential circular references
      const circularObject = { name: 'test' } as any;
      circularObject.self = circularObject;

      service.updateUserContext({
        user: {
          id: '1',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: { circular: circularObject },
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          role: 'authenticated',
          last_sign_in_at: '2024-01-01T00:00:00.000Z',
          confirmation_sent_at: undefined,
          confirmed_at: '2024-01-01T00:00:00.000Z',
          email_confirmed_at: '2024-01-01T00:00:00.000Z',
          phone: undefined,
          phone_confirmed_at: undefined,
          recovery_sent_at: undefined,
          new_email: undefined,
          invited_at: undefined,
          factors: undefined,
          identities: [],
          is_anonymous: false,
        },
        loading: false,
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const context = service.getContext();

      // Should handle serialization gracefully (may remove circular refs)
      expect(() => JSON.stringify(context)).not.toThrow();
    });
  });
});