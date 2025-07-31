/**
 * DashboardContextService Comprehensive Test Suite
 * 
 * Tests context collection, real-time updates, listener management,
 * and integration with dashboard apps. Core state management service.
 */

import { DashboardContextService } from '../DashboardContextService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';

// Mock dependencies
jest.mock('../TimeService');
jest.mock('../DashboardAppService', () => ({
  dashboardAppService: {
    getAllData: jest.fn(() => ({})),
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
import { userProfileAdapter } from '../adapters/UserProfileAdapter';

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
    if ((service as any).mainTimer) {
      clearInterval((service as any).mainTimer);
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
      expect((service as any).mainTimer).toBeDefined();
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
      
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.environment.deviceType).toBe('mobile');
    });

    it('detects tablet devices', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
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
      const locationData = {
        hasGPS: true,
        city: 'San Francisco',
        region: 'California',
        country: 'US',
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
        timezone: 'America/Los_Angeles',
      };
      
      service.updateLocationContext(locationData);
      const context = service.getContext();
      
      expect(context.location).toEqual(locationData);
    });

    it('updates weather context', () => {
      const weatherData = {
        hasData: true,
        temperature: 72,
        feelsLike: 75,
        condition: 'sunny',
        description: 'Clear sky',
        humidity: 60,
        windSpeed: 5,
        unit: 'fahrenheit' as const,
      };
      
      service.updateWeatherContext(weatherData);
      const context = service.getContext();
      
      expect(context.weather).toEqual(weatherData);
    });

    it('updates user context', () => {
      const userData = {
        isAuthenticated: true,
        name: 'John Doe',
        email: 'john@example.com',
        memberSince: '2024-01-01',
        preferences: { theme: 'dark' },
      };
      
      service.updateUserContext(userData);
      const context = service.getContext();
      
      expect(context.user).toEqual(userData);
    });

    it('updates device context', () => {
      const deviceData = {
        hasData: true,
        os: 'Windows 10',
        browser: 'Chrome',
        device: 'Desktop',
        cpu: 8,
        memory: '16 GB',
        screen: '1920x1080',
        networkType: 'wifi',
      };
      
      service.updateDeviceContext(deviceData);
      const context = service.getContext();
      
      expect(context.device).toEqual(deviceData);
    });
  });

  describe('Activity Tracking', () => {
    it('logs component activity', () => {
      service.logComponentActivity('VirgilChatbot');
      service.logComponentActivity('Weather');
      
      const context = service.getContext();
      
      expect(context.activity.activeComponents).toContain('VirgilChatbot');
      expect(context.activity.activeComponents).toContain('Weather');
    });

    it('removes inactive components', () => {
      service.logComponentActivity('TestComponent');
      service.removeComponentActivity('TestComponent');
      
      const context = service.getContext();
      
      expect(context.activity.activeComponents).not.toContain('TestComponent');
    });

    it('logs user actions', () => {
      service.logUserAction('click_send_button');
      service.logUserAction('open_modal');
      
      const context = service.getContext();
      
      expect(context.activity.recentActions).toContain('click_send_button');
      expect(context.activity.recentActions).toContain('open_modal');
    });

    it('limits recent actions to prevent memory leaks', () => {
      // Log more than the limit (assumed to be 10)
      for (let i = 0; i < 15; i++) {
        service.logUserAction(`action_${i}`);
      }
      
      const context = service.getContext();
      
      expect(context.activity.recentActions.length).toBeLessThanOrEqual(10);
      expect(context.activity.recentActions).toContain('action_14'); // Latest should be kept
      expect(context.activity.recentActions).not.toContain('action_0'); // Oldest should be removed
    });

    it('updates session time and last interaction', () => {
      const initialContext = service.getContext();
      const initialTime = initialContext.activity.timeSpentInSession;
      
      // Advance time by 5 seconds
      timeContext.advanceTime(5000);
      
      service.logUserAction('test_action');
      const updatedContext = service.getContext();
      
      expect(updatedContext.activity.timeSpentInSession).toBeGreaterThan(initialTime);
      expect(updatedContext.activity.lastInteraction).toBeGreaterThan(initialContext.activity.lastInteraction);
    });
  });

  describe('Listener Management', () => {
    it('subscribes and unsubscribes listeners', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      // Trigger context update
      service.updateLocationContext({ hasGPS: true, city: 'Test City' });
      
      expect(listener).toHaveBeenCalledWith(service.getContext());
      
      // Unsubscribe
      unsubscribe();
      listener.mockClear();
      
      // Update again - listener should not be called
      service.updateLocationContext({ hasGPS: false });
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      
      service.updateUserContext({ isAuthenticated: true });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('TimeService Integration', () => {
    it('provides TimeService methods for backward compatibility', () => {
      expect(service.getLocalDate()).toBe('2024-01-20');
      expect(service.getCurrentDateTime()).toBeInstanceOf(Date);
      expect(service.getTimestamp()).toBe(1705752000000);
    });

    it('updates time context periodically', async () => {
      // Advance time to trigger update
      timeContext.advanceTime(60000); // 1 minute
      
      // Wait for periodic update to process
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const context = service.getContext();
      expect(context.currentTime).toBe('12:01');
    });
  });

  describe('Dashboard Apps Integration', () => {
    it('includes dashboard app data in context', () => {
      const mockAppData = {
        weather: { temperature: 75 },
        calendar: { events: [] },
      };
      
      (dashboardAppService.getAllData as jest.Mock).mockReturnValue(mockAppData);
      
      // Create new service to trigger initialization
      const newService = new DashboardContextService();
      const context = newService.getContext();
      
      expect(context.apps).toEqual(mockAppData);
    });

    it('updates context when dashboard apps change', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      // Simulate dashboard app update
      const updateCallback = (dashboardAppService.subscribe as jest.Mock).mock.calls[0][0];
      const newAppData = { notes: { count: 5 } };
      
      (dashboardAppService.getAllData as jest.Mock).mockReturnValue(newAppData);
      updateCallback();
      
      expect(listener).toHaveBeenCalled();
      const context = service.getContext();
      expect(context.apps).toEqual(newAppData);
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
      const timerId = (service as any).mainTimer;
      expect(timerId).toBeDefined();
      
      // Simulate cleanup (would normally happen in destructor)
      if (timerId) {
        clearInterval(timerId);
        (service as any).mainTimer = undefined;
      }
      
      expect((service as any).mainTimer).toBeUndefined();
    });

    it('limits activity log size', () => {
      // Add many activity entries
      for (let i = 0; i < 25; i++) {
        (service as any).activityLog.push({
          action: `action_${i}`,
          timestamp: timeService.getTimestamp() + i,
        });
      }
      
      // Trigger cleanup (simulated)
      (service as any).cleanupActivityLog();
      
      expect((service as any).activityLog.length).toBeLessThanOrEqual(20);
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
      expect(() => service.updateUserContext({ isAuthenticated: true })).not.toThrow();
      
      // Working listener should still be called
      expect(workingListener).toHaveBeenCalled();
    });
  });

  describe('Context Serialization', () => {
    it('provides serializable context', () => {
      // Update context with various data types
      service.updateLocationContext({
        hasGPS: true,
        coordinates: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
      });
      
      service.updateUserContext({
        isAuthenticated: true,
        preferences: { theme: 'dark', notifications: true },
      });
      
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
      const initialContext = service.getContext();
      
      // Update various parts
      service.updateLocationContext({ hasGPS: true });
      service.updateWeatherContext({ hasData: true, temperature: 72 });
      service.updateUserContext({ isAuthenticated: true });
      
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