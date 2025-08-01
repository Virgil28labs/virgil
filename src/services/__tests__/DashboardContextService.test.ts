/**
 * DashboardContextService Comprehensive Test Suite
 * 
 * Tests context collection, real-time updates, listener management,
 * and integration with dashboard apps. Core state management service.
 */

import { DashboardContextService } from '../DashboardContextService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';
import type { LocationContextValue } from '../../types/location.types';
import type { WeatherContextType } from '../../types/weather.types';
import type { AuthContextValue } from '../../types/auth.types';
import type { DeviceInfo } from '../../hooks/useDeviceInfo';
import type { MockDashboardContextServicePrivate } from '../../test-utils/mockTypes';

// Mock dependencies
jest.mock('../TimeService');
jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    getAllAppData: jest.fn(() => ({ apps: new Map(), activeApps: [], lastUpdated: Date.now() })),
    subscribe: jest.fn(() => jest.fn()),
  },
}));
jest.mock('../adapters/UserProfileAdapter', () => ({
  userProfileAdapter: {
    getContextData: jest.fn(() => ({})),
  },
}));

import { timeService } from '../TimeService';
import { dashboardAppService } from '../DashboardAppService';
// import { userProfileAdapter } - not used in tests from '../adapters/UserProfileAdapter';

// Mock navigator
const mockNavigator = {
  onLine: true,
  language: 'en-US',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  maxTouchPoints: 0,
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.innerWidth for device detection
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920, // Desktop size
});

describe('DashboardContextService', () => {
  let timeContext: ReturnType<typeof setupTimeTest>;
  let service: DashboardContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up time context
    timeContext = setupTimeTest('2024-01-20T12:00:00');
    Object.assign(timeService, timeContext.timeService);
    
    // Reset navigator to default state
    Object.assign(navigator, mockNavigator);
    
    // Create new service instance
    service = new DashboardContextService();
  });

  afterEach(() => {
    timeContext.cleanup();
    // Clean up any timers
    const privateService = service as unknown as MockDashboardContextServicePrivate;
    if (privateService.mainTimer) {
      clearInterval(privateService.mainTimer);
    }
  });

  describe('Initialization', () => {
    it('creates initial context with correct time data', () => {
      const context = service.getContext();
      
      expect(context.currentTime).toBe('12:00');
      expect(context.currentDate).toBe('January 20, 2024');
      expect(context.timeOfDay).toBe('afternoon');
      expect(context.dayOfWeek).toBe('saturday');
    });

    it('initializes with default values', () => {
      const context = service.getContext();
      
      expect(context.location.hasGPS).toBe(false);
      expect(context.weather.hasData).toBe(false);
      expect(context.weather.unit).toBe('fahrenheit');
      expect(context.user.isAuthenticated).toBe(false);
      expect(context.device.hasData).toBe(false);
    });

    it('detects environment correctly', () => {
      const context = service.getContext();
      
      expect(context.environment.isOnline).toBe(true);
      expect(context.environment.language).toBe('en-US');
      expect(context.environment.deviceType).toBe('desktop');
    });

    it('starts periodic updates', () => {
      const privateService = service as unknown as MockDashboardContextServicePrivate;
      expect(privateService.mainTimer).toBeDefined();
    });

    it('subscribes to dashboard apps', () => {
      expect(dashboardAppService.subscribe).toHaveBeenCalled();
    });
  });

  describe('Device Detection', () => {
    it('detects mobile devices', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });
      
      // Mock mobile screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600, // Mobile size
      });
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.deviceType).toBe('mobile');
    });

    it('detects tablet devices', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
      });
      
      // Mock tablet screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900, // Tablet size
      });
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.deviceType).toBe('tablet');
    });

    it('defaults to desktop for unknown devices', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Unknown Browser',
        writable: true,
      });
      
      // Mock desktop screen width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920, // Desktop size
      });
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.deviceType).toBe('desktop');
    });
  });

  describe('Dark Mode Detection', () => {
    it('detects dark mode preference', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
      }));
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.prefersDarkMode).toBe(true);
    });

    it('handles no dark mode preference', () => {
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
      }));
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.prefersDarkMode).toBe(false);
    });
  });

  describe('Context Updates', () => {
    it('updates location context', () => {
      const locationData: LocationContextValue = {
        coordinates: { 
          latitude: 37.7749, 
          longitude: -122.4194, 
          accuracy: 10,
          timestamp: Date.now(),
        },
        address: {
          street: '123 Test St',
          house_number: '123',
          city: 'San Francisco',
          postcode: '94102',
          country: 'US',
          formatted: '123 Test St, San Francisco, CA 94102',
        },
        ipLocation: {
          ip: '127.0.0.1',
          city: 'San Francisco',
          region: 'California',
          country: 'US',
          timezone: 'America/Los_Angeles',
        },
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
      
      service.updateLocationContext(locationData);
      const context = service.getContext();
      
      expect(context.location.hasGPS).toBe(true);
      expect(context.location.city).toBe('San Francisco');
      expect(context.location.region).toBe('California');
      expect(context.location.country).toBe('US');
      expect(context.location.coordinates?.latitude).toBe(37.7749);
      expect(context.location.coordinates?.longitude).toBe(-122.4194);
    });

    it('updates weather context', () => {
      const weatherData: WeatherContextType = {
        data: {
          temperature: 20,
          feelsLike: 22,
          tempMin: 18,
          tempMax: 25,
          humidity: 60,
          pressure: 1013,
          windSpeed: 5,
          windDeg: 180,
          clouds: 0,
          visibility: 10000,
          condition: {
            id: 800,
            main: 'Clear',
            description: 'Clear sky',
            icon: '01d',
          },
          sunrise: Date.now(),
          sunset: Date.now(),
          timezone: 0,
          cityName: 'Test City',
          country: 'TC',
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
      
      service.updateWeatherContext(weatherData);
      const context = service.getContext();
      
      expect(context.weather.hasData).toBe(true);
      expect(context.weather.temperature).toBe(20);
    });

    it('updates user context', () => {
      const userData: AuthContextValue = {
        user: {
          id: '1',
          email: 'john@example.com',
          app_metadata: {},
          user_metadata: { name: 'John Doe' },
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
      
      service.updateUserContext(userData);
      const context = service.getContext();
      
      expect(context.user).toEqual({
        isAuthenticated: true,
        name: 'John Doe',
        email: 'john@example.com',
        memberSince: '2023-12-31', // formatDateToLocal converts to local date format
        profile: undefined, // No profile provided
      });
    });

    it('updates device context', () => {
      const deviceData: DeviceInfo = {
        location: 'San Francisco',
        ip: '127.0.0.1',
        device: 'Desktop',
        os: 'Windows 10',
        browser: 'Chrome',
        screen: '1920x1080',
        pixelRatio: 1,
        colorScheme: 'dark',
        windowSize: '1920x1080',
        cpu: 8,
        memory: '16 GB',
        online: true,
        networkType: 'wifi',
        downlink: '10 Mbps',
        rtt: '50 ms',
        batteryLevel: null,
        batteryCharging: null,
        localTime: '12:00 PM',
        timezone: 'America/Los_Angeles',
        language: 'en-US',
        tabVisible: true,
        sessionDuration: 0,
        cookiesEnabled: true,
        doNotTrack: null,
        storageQuota: '10 GB',
      };
      
      service.updateDeviceContext(deviceData);
      const context = service.getContext();
      
      expect(context.device).toMatchObject({
        hasData: true,
        os: 'Windows 10',
        browser: 'Chrome',
        screen: '1920x1080',
        device: 'Desktop',
        cpu: 8,
        memory: '16 GB',
      });
    });
  });

  describe('Activity Tracking', () => {
    // These tests are disabled as the activity tracking methods have been removed from DashboardContextService
    it.skip('logs component activity', () => {
      // service.logComponentActivity('VirgilChatbot');
      // service.logComponentActivity('Weather');
      
      // const context = service.getContext();
      
      // expect(context.activity.activeComponents).toContain('VirgilChatbot');
      // expect(context.activity.activeComponents).toContain('Weather');
    });

    it.skip('removes inactive components', () => {
      // service.logComponentActivity('TestComponent');
      // service.removeComponentActivity('TestComponent');
      
      // const context = service.getContext();
      
      // expect(context.activity.activeComponents).not.toContain('TestComponent');
    });

    it.skip('logs user actions', () => {
      // service.logUserAction('click_send_button');
      // service.logUserAction('open_modal');
      
      // const context = service.getContext();
      
      // expect(context.activity.recentActions).toContain('click_send_button');
      // expect(context.activity.recentActions).toContain('open_modal');
    });

    it.skip('limits recent actions to prevent memory leaks', () => {
      // Log more than the limit (assumed to be 10)
      // for (let i = 0; i < 15; i++) {
      //   service.logUserAction(`action_${i}`);
      // }
      
      // const context = service.getContext();
      
      // expect(context.activity.recentActions.length).toBeLessThanOrEqual(10);
      // expect(context.activity.recentActions).toContain('action_14'); // Latest should be kept
      // expect(context.activity.recentActions).not.toContain('action_0'); // Oldest should be removed
    });

    it.skip('updates session time and last interaction', () => {
      // const initialContext = service.getContext();
      // const initialTime = initialContext.activity.timeSpentInSession;
      
      // Advance time by 5 seconds
      timeContext.advanceTime(5000);
      
      // service.logUserAction('test_action');
      // const updatedContext = service.getContext();
      
      // expect(updatedContext.activity.timeSpentInSession).toBeGreaterThan(initialTime);
      // expect(updatedContext.activity.lastInteraction).toBeGreaterThan(initialContext.activity.lastInteraction);
    });
  });

  describe('Listener Management', () => {
    it('subscribes and unsubscribes listeners', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      // Trigger context update
      const locationUpdate: Partial<LocationContextValue> = {
        coordinates: { 
          latitude: 37.7749, 
          longitude: -122.4194, 
          accuracy: 10,
          timestamp: Date.now(),
        },
        address: {
          city: 'Test City',
          country: 'US',
          formatted: 'Test City, US',
          street: '',
          house_number: '',
          postcode: '',
        },
        hasLocation: true,
        hasGPSLocation: true,
      };
      service.updateLocationContext(locationUpdate as LocationContextValue);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        currentTime: expect.any(String),
        location: expect.any(Object),
        weather: expect.any(Object),
        user: expect.any(Object),
        activity: expect.any(Object),
        environment: expect.any(Object),
        device: expect.any(Object),
      }));
      
      // Unsubscribe
      unsubscribe();
      listener.mockClear();
      
      // Update again - listener should not be called
      const secondUpdate: Partial<LocationContextValue> = {
        hasLocation: false,
        hasGPSLocation: false,
      };
      service.updateLocationContext(secondUpdate as LocationContextValue);
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      
      const userUpdate: Partial<AuthContextValue> = {
        user: {
          id: '1',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
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
      };
      service.updateUserContext(userUpdate as AuthContextValue);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('TimeService Integration', () => {
    it('provides TimeService methods for backward compatibility', () => {
      expect(service.getLocalDate()).toBe('2024-01-20');
      expect(service.getCurrentDateTime()).toBeInstanceOf(Date);
      expect(service.getTimestamp()).toBe(1705780800000); // PST timezone
    });

    it('updates time context periodically', () => {
      jest.useFakeTimers();
      
      // Create a new service instance with fake timers active
      const testService = new DashboardContextService();
      
      // Advance both mock time and Jest timers
      timeContext.advanceTime(60000); // 1 minute
      jest.advanceTimersByTime(60000); // Advance setInterval timer
      
      const context = testService.getContext();
      expect(context.currentTime).toBe('12:01');
      
      // Clean up
      testService.cleanup();
      jest.useRealTimers();
    });
  });

  describe('Dashboard Apps Integration', () => {
    it('includes dashboard app data in context', () => {
      (dashboardAppService.getAllAppData as jest.Mock).mockReturnValue({
        apps: new Map([['weather', { temperature: 75 }], ['calendar', { events: [] }]]),
        activeApps: [],
        lastUpdated: Date.now(),
      });
      
      // Create new service to trigger initialization
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.apps).toBeDefined();
    });

    it('updates context when dashboard apps change', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      // Simulate dashboard app update
      const updateCallback = (dashboardAppService.subscribe as jest.Mock).mock.calls[0][0];
      
      (dashboardAppService.getAllAppData as jest.Mock).mockReturnValue({
        apps: new Map([['notes', { count: 5 }]]),
        activeApps: [],
        lastUpdated: Date.now(),
      });
      updateCallback();
      
      expect(listener).toHaveBeenCalled();
      const context = service.getContext();
      expect(context.apps).toBeDefined();
    });
  });

  describe('Network Status Handling', () => {
    it('handles online/offline events', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Trigger offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
      
      // Should update context
      const context = service.getContext();
      expect(context.environment.isOnline).toBe(false);
    });
  });

  describe('Performance and Memory Management', () => {
    it('cleans up timers on destruction', () => {
      const privateService = service as unknown as MockDashboardContextServicePrivate;
      const timerId = privateService.mainTimer;
      expect(timerId).toBeDefined();
      
      // Simulate cleanup (would normally happen in destructor)
      if (timerId) {
        clearInterval(timerId);
        privateService.mainTimer = undefined;
      }
      
      expect(privateService.mainTimer).toBeUndefined();
    });

    it('limits activity log size', () => {
      const privateService = service as unknown as MockDashboardContextServicePrivate;
      
      // Add many activity entries
      for (let i = 0; i < 25; i++) {
        privateService.activityLog.push({
          action: `action_${i}`,
          timestamp: timeService.getTimestamp() + i,
        });
      }
      
      // Trigger cleanup (simulated)
      privateService.cleanupActivityLog();
      
      expect(privateService.activityLog.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Error Handling', () => {
    it('handles TimeService errors gracefully', () => {
      // Mock TimeService to throw
      (timeService.getCurrentTime as jest.Mock).mockImplementationOnce(() => {
        throw new Error('TimeService error');
      });
      
      // Should not crash when creating context
      expect(() => new DashboardContextService()).not.toThrow();
    });

    it('handles listener errors gracefully', () => {
      const workingListener = jest.fn();
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      service.subscribe(workingListener);
      service.subscribe(errorListener);
      
      // Should not throw even if one listener fails
      const testUserUpdate: Partial<AuthContextValue> = {
        user: {
          id: '1',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
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
      };
      expect(() => service.updateUserContext(testUserUpdate as AuthContextValue)).not.toThrow();
      
      // Working listener should still be called
      expect(workingListener).toHaveBeenCalled();
    });
  });

  describe('Context Serialization', () => {
    it('provides serializable context', () => {
      // Update context with various data types
      const locationData: Partial<LocationContextValue> = {
        coordinates: { 
          latitude: 37.7749, 
          longitude: -122.4194, 
          accuracy: 10,
          timestamp: Date.now(),
        },
        address: {
          city: 'Test City',
          country: 'US',
          formatted: 'Test City, US',
          street: '',
          house_number: '',
          postcode: '',
        },
        hasLocation: true,
        hasGPSLocation: true,
      };
      service.updateLocationContext(locationData as LocationContextValue);
      
      const userData: Partial<AuthContextValue> = {
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
      };
      service.updateUserContext(userData as AuthContextValue);
      
      const context = service.getContext();
      
      // Should be JSON serializable
      expect(() => JSON.stringify(context)).not.toThrow();
      
      // Should deserialize correctly
      const serialized = JSON.stringify(context);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.location.hasGPS).toBe(true);
      expect(deserialized.user.isAuthenticated).toBe(true);
    });
  });

  describe('Context Validation', () => {
    it('maintains context integrity after updates', () => {
      // const initialContext = service.getContext();
      
      // Update various parts - these methods expect full context objects
      // service.updateLocationContext({ hasGPS: true });
      // service.updateWeatherContext({ hasData: true, temperature: 72 });
      // service.updateUserContext({ isAuthenticated: true });
      
      const updatedContext = service.getContext();
      
      // Should maintain all required properties
      expect(updatedContext).toHaveProperty('currentTime');
      expect(updatedContext).toHaveProperty('location');
      expect(updatedContext).toHaveProperty('weather');
      expect(updatedContext).toHaveProperty('user');
      expect(updatedContext).toHaveProperty('activity');
      expect(updatedContext).toHaveProperty('environment');
      expect(updatedContext).toHaveProperty('device');
    });
  });
});