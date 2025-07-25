import { DashboardContextService } from '../DashboardContextService';
import { dashboardAppService } from '../DashboardAppService';
import { userProfileAdapter } from '../adapters/UserProfileAdapter';

jest.mock('../DashboardAppService');
jest.mock('../adapters/UserProfileAdapter');

// Mock the logger to prevent timeService usage during tests
jest.mock('../../lib/logger', () => ({
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
jest.mock('../TimeService', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const actualMock = require('../__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-15T10:30:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../TimeService';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockTimeService = timeService as any;

// Mock window properties
const mockMatchMedia = {
  matches: false,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

describe('DashboardContextService', () => {
  let service: DashboardContextService;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-15T10:30:00');
    
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => mockMatchMedia),
    });
    
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
    
    Object.defineProperty(navigator, 'language', {
      writable: true,
      configurable: true,
      value: 'en-US',
    });
    
    // Spy on event listeners
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    // Create new service instance
    service = new DashboardContextService();
  });

  afterEach(() => {
    service.destroy();
    mockTimeService.destroy();
    jest.clearAllTimers();
    jest.useRealTimers();
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('constructor and initialization', () => {
    it('initializes with correct default context', () => {
      const context = service.getContext();
      
      expect(context.currentTime).toBe('10:30');
      expect(context.currentDate).toBe('January 15, 2024');
      expect(context.timeOfDay).toBe('morning');
      expect(context.dayOfWeek).toBe('monday');
      expect(context.location.hasGPS).toBe(false);
      expect(context.weather.hasData).toBe(false);
      expect(context.weather.unit).toBe('fahrenheit');
      expect(context.user.isAuthenticated).toBe(false);
      expect(context.environment.isOnline).toBe(true);
      expect(context.environment.deviceType).toBe('desktop');
      expect(context.environment.language).toBe('en-US');
      expect(context.device.hasData).toBe(false);
    });

    it('starts periodic updates', () => {
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it('subscribes to online/offline events', () => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('subscribes to dashboard apps', () => {
      expect(dashboardAppService.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('time context methods', () => {
    it('detects correct time of day', () => {
      const testCases = [
        { hour: 6, expected: 'morning' },
        { hour: 14, expected: 'afternoon' },
        { hour: 19, expected: 'evening' },
        { hour: 23, expected: 'night' },
        { hour: 2, expected: 'night' },
      ];

      testCases.forEach(({ hour, expected }) => {
        const testDate = new Date('2024-01-15');
        testDate.setHours(hour);
        mockTimeService.setMockDate(testDate);
        
        const testService = new DashboardContextService();
        const context = testService.getContext();
        expect(context.timeOfDay).toBe(expected);
        testService.destroy();
      });
    });
  });

  describe('device detection', () => {
    it('detects device type based on window width', () => {
      const testCases = [
        { width: 400, expected: 'mobile' },
        { width: 768, expected: 'mobile' },
        { width: 800, expected: 'tablet' },
        { width: 1024, expected: 'tablet' },
        { width: 1920, expected: 'desktop' },
      ];

      testCases.forEach(({ width, expected }) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        
        const testService = new DashboardContextService();
        const context = testService.getContext();
        expect(context.environment.deviceType).toBe(expected);
        testService.destroy();
      });
    });

    it('detects dark mode preference', () => {
      mockMatchMedia.matches = true;
      
      const testService = new DashboardContextService();
      const context = testService.getContext();
      expect(context.environment.prefersDarkMode).toBe(true);
      testService.destroy();
    });
  });

  describe('updateLocationContext', () => {
    it('updates location with GPS data', () => {
      const locationData = {
        hasGPSLocation: true,
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        address: {
          city: 'New York',
          country: 'USA',
          formatted: '123 Main St, New York, NY',
          postcode: '10001',
        },
        ipLocation: {
          ip: '192.168.1.1',
          city: 'New York',
          region: 'NY',
          country: 'US',
          timezone: 'America/New_York',
          isp: 'Test ISP',
          org: 'Test Org',
          postal: '10001',
        },
        loading: false,
      };

      service.updateLocationContext(locationData);
      const context = service.getContext();

      expect(context.location.hasGPS).toBe(true);
      expect(context.location.city).toBe('New York');
      expect(context.location.region).toBe('NY');
      expect(context.location.country).toBe('US');
      expect(context.location.coordinates).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
      });
      expect(context.location.timezone).toBe('America/New_York');
      expect(context.location.address).toBe('123 Main St, New York, NY');
      expect(context.location.ipAddress).toBe('192.168.1.1');
      expect(context.location.isp).toBe('Test ISP');
      expect(context.location.postal).toBe('10001');
    });

    it('updates location with IP data only', () => {
      const locationData = {
        hasGPSLocation: false,
        ipLocation: {
          ip: '192.168.1.1',
          city: 'San Francisco',
          region: 'CA',
          country: 'US',
          timezone: 'America/Los_Angeles',
        },
        loading: false,
      };

      service.updateLocationContext(locationData);
      const context = service.getContext();

      expect(context.location.hasGPS).toBe(false);
      expect(context.location.city).toBe('San Francisco');
      expect(context.location.coordinates).toBeUndefined();
    });
  });

  describe('updateWeatherContext', () => {
    it('updates weather with data', () => {
      const weatherData = {
        data: {
          temperature: 72,
          feelsLike: 75,
          condition: {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
          },
          humidity: 45,
          windSpeed: 10,
        },
        unit: 'fahrenheit' as const,
        loading: false,
        error: null,
        forecast: null,
        hasWeather: true,
        toggleUnit: jest.fn(),
      };

      service.updateWeatherContext(weatherData);
      const context = service.getContext();

      expect(context.weather.hasData).toBe(true);
      expect(context.weather.temperature).toBe(72);
      expect(context.weather.feelsLike).toBe(75);
      expect(context.weather.condition).toBe('Clear');
      expect(context.weather.description).toBe('clear sky');
      expect(context.weather.humidity).toBe(45);
      expect(context.weather.windSpeed).toBe(10);
      expect(context.weather.unit).toBe('fahrenheit');
    });

    it('updates weather without data', () => {
      const weatherData = {
        data: null,
        unit: 'celsius' as const,
        loading: false,
        error: 'Failed to fetch',
        forecast: null,
        hasWeather: false,
        toggleUnit: jest.fn(),
      };

      service.updateWeatherContext(weatherData);
      const context = service.getContext();

      expect(context.weather.hasData).toBe(false);
      expect(context.weather.unit).toBe('celsius');
      expect(context.weather.temperature).toBeUndefined();
    });
  });

  describe('updateUserContext', () => {
    it('updates user context with auth data', () => {
      const userData = {
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
          },
          created_at: '2023-01-01T00:00:00.000Z',
        },
        signIn: jest.fn(),
        signOut: jest.fn(),
      };

      const userProfile = {
        id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        nickname: 'Tester',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
        maritalStatus: 'single' as const,
        uniqueId: 'TEST123',
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'TC',
          zip: '12345',
          country: 'Test Country',
        },
      };

      service.updateUserContext(userData, userProfile);
      const context = service.getContext();

      expect(context.user.isAuthenticated).toBe(true);
      expect(context.user.name).toBe('Test User');
      expect(context.user.email).toBe('test@example.com');
      expect(context.user.memberSince).toBe('January 1, 2023');
      expect(context.user.profile).toEqual(userProfile);
      
      expect(userProfileAdapter.updateProfile).toHaveBeenCalledWith(userProfile, userData);
      expect(dashboardAppService.registerAdapter).toHaveBeenCalledWith(userProfileAdapter);
    });

    it('updates user context without profile', () => {
      const userData = {
        user: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
      };

      service.updateUserContext(userData);
      const context = service.getContext();

      expect(context.user.isAuthenticated).toBe(false);
      expect(context.user.name).toBeUndefined();
      expect(context.user.profile).toBeUndefined();
    });
  });

  describe('updateDeviceContext', () => {
    it('updates device context with full data', () => {
      const deviceInfo = {
        os: 'Windows 10',
        browser: 'Chrome 120',
        device: 'Desktop',
        cpu: 8,
        memory: '16 GB',
        screen: '1920x1080',
        pixelRatio: 2,
        windowSize: '1920x945',
        networkType: '4g',
        downlink: '10 Mbps',
        rtt: '50ms',
        batteryLevel: 85,
        batteryCharging: true,
        storageQuota: '10 GB',
        cookiesEnabled: true,
        doNotTrack: null,
        tabVisible: true,
        sessionDuration: 3600000,
      };

      service.updateDeviceContext(deviceInfo);
      const context = service.getContext();

      expect(context.device.hasData).toBe(true);
      expect(context.device.os).toBe('Windows 10');
      expect(context.device.browser).toBe('Chrome 120');
      expect(context.device.cpu).toBe(8);
      expect(context.device.batteryLevel).toBe(85);
      expect(context.device.batteryCharging).toBe(true);
    });

    it('updates device context without data', () => {
      service.updateDeviceContext(null);
      const context = service.getContext();

      expect(context.device.hasData).toBe(false);
      expect(context.device.os).toBeUndefined();
    });
  });

  describe('logActivity', () => {
    it('logs activity and updates context', () => {
      service.logActivity('clicked button', 'Notes');
      
      const context = service.getContext();
      expect(context.activity.recentActions).toContain('clicked button');
      expect(context.activity.activeComponents).toContain('Notes');
      expect(context.activity.lastInteraction).toBe(mockTimeService.getTimestamp());
    });

    it('adds component only once', () => {
      service.logActivity('action1', 'Notes');
      service.logActivity('action2', 'Notes');
      
      const context = service.getContext();
      expect(context.activity.activeComponents).toEqual(['Notes']);
    });

    it('filters old activities', () => {
      // Log an old activity
      service.logActivity('old action');
      
      // Advance time by 11 minutes
      mockTimeService.advanceTime(11 * 60 * 1000);
      
      // Log a recent activity
      service.logActivity('recent action');
      
      const context = service.getContext();
      expect(context.activity.recentActions).toEqual(['recent action']);
    });
  });

  describe('periodic updates', () => {
    it('updates time context every minute', () => {
      const callback = jest.fn();
      service.subscribe(callback);
      callback.mockClear();

      // Fast-forward 1 minute
      jest.advanceTimersByTime(60000);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        currentTime: '10:30',
        currentDate: 'January 15, 2024',
        timeOfDay: 'morning',
        dayOfWeek: 'monday',
      }));
    });

    it('updates online status on events', () => {
      const callback = jest.fn();
      service.subscribe(callback);
      callback.mockClear();

      // Get the event handlers
      const onlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'online')?.[1];
      const offlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'offline')?.[1];

      // Trigger offline event
      if (offlineHandler) {
        (offlineHandler as EventListener)(new Event('offline'));
      }

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        environment: expect.objectContaining({
          isOnline: false,
        }),
      }));

      // Trigger online event
      if (onlineHandler) {
        (onlineHandler as EventListener)(new Event('online'));
      }

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        environment: expect.objectContaining({
          isOnline: true,
        }),
      }));
    });
  });

  describe('getContextForPrompt', () => {
    it('generates comprehensive context string', () => {
      // Set up rich context
      service.updateLocationContext({
        hasGPSLocation: true,
        coordinates: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        address: { city: 'New York', country: 'USA', formatted: '123 Main St', postcode: '10001' },
        ipLocation: { ip: '192.168.1.1', city: 'New York', region: 'NY', timezone: 'America/New_York', isp: 'Test ISP' },
        loading: false,
      });

      service.updateWeatherContext({
        data: {
          temperature: 72,
          feelsLike: 75,
          condition: { id: 800, main: 'Clear', description: 'clear sky' },
          humidity: 45,
          windSpeed: 10,
        },
        unit: 'fahrenheit',
        loading: false,
        error: null,
        forecast: null,
        hasWeather: true,
        toggleUnit: jest.fn(),
      });

      service.updateUserContext({
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { name: 'Test User' },
          created_at: '2023-01-01',
        },
        signIn: jest.fn(),
        signOut: jest.fn(),
      }, {
        id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
        nickname: 'Tester',
        uniqueId: 'TEST123',
        dateOfBirth: '1990-01-01',
      });

      service.logActivity('using Notes', 'Notes');

      const contextString = service.getContextForPrompt();

      expect(contextString).toContain('CURRENT CONTEXT:');
      expect(contextString).toContain('Current time: 10:30');
      expect(contextString).toContain('Current date: January 15, 2024 (monday)');
      expect(contextString).toContain('Time of day: morning');
      
      expect(contextString).toContain('LOCATION:');
      expect(contextString).toContain('Current location: New York, NY, USA');
      expect(contextString).toContain('Timezone: America/New_York');
      
      expect(contextString).toContain('WEATHER:');
      expect(contextString).toContain('Temperature: 72°F (feels like 75°F)');
      expect(contextString).toContain('Conditions: clear sky');
      
      expect(contextString).toContain('USER:');
      expect(contextString).toContain('Name: Tester');
      expect(contextString).toContain('Unique ID: TEST123');
      expect(contextString).toContain('Age: 34 years old');
      
      expect(contextString).toContain('ACTIVE FEATURES:');
      expect(contextString).toContain('Currently using: Notes');
      
      expect(contextString).toContain('ENVIRONMENT:');
      expect(contextString).toContain('Device: desktop');
    });

    it('handles minimal context gracefully', () => {
      const contextString = service.getContextForPrompt();
      
      expect(contextString).toContain('CURRENT CONTEXT:');
      expect(contextString).not.toContain('LOCATION:');
      expect(contextString).not.toContain('WEATHER:');
      expect(contextString).not.toContain('USER:');
      expect(contextString).not.toContain('ACTIVE FEATURES:');
      expect(contextString).toContain('ENVIRONMENT:');
    });
  });

  describe('generateSuggestions', () => {
    it('generates morning greeting suggestion', () => {
      const suggestions = service.generateSuggestions();
      
      const morningSuggestion = suggestions.find(s => s.id === 'morning-greeting');
      // We're in morning time (10:30 AM)
      expect(morningSuggestion).toBeDefined();
      expect(morningSuggestion?.content).toContain('Good morning');
      expect(morningSuggestion?.priority).toBe('medium');
    });

    it('generates cold weather suggestion', () => {
      service.updateWeatherContext({
        data: {
          temperature: 30,
          condition: { id: 600, main: 'Snow', description: 'light snow' },
        },
        unit: 'fahrenheit',
        loading: false,
        error: null,
        forecast: null,
        hasWeather: true,
        toggleUnit: jest.fn(),
      });

      const suggestions = service.generateSuggestions();
      
      const coldSuggestion = suggestions.find(s => s.id === 'cold-weather');
      expect(coldSuggestion).toBeDefined();
      expect(coldSuggestion?.content).toContain("It's quite cold today");
      expect(coldSuggestion?.content).toContain('warm coat');
    });

    it('generates hot weather suggestion', () => {
      service.updateWeatherContext({
        data: {
          temperature: 85,
          condition: { id: 800, main: 'Clear', description: 'clear sky' },
        },
        unit: 'fahrenheit',
        loading: false,
        error: null,
        forecast: null,
        hasWeather: true,
        toggleUnit: jest.fn(),
      });

      const suggestions = service.generateSuggestions();
      
      const hotSuggestion = suggestions.find(s => s.id === 'hot-weather');
      expect(hotSuggestion).toBeDefined();
      expect(hotSuggestion?.content).toContain("It's warm today");
      expect(hotSuggestion?.content).toContain('outdoor activities');
    });

    it('generates location-aware suggestion', () => {
      service.updateLocationContext({
        hasGPSLocation: false,
        ipLocation: { city: 'San Francisco', region: 'CA' },
        loading: false,
      });

      const suggestions = service.generateSuggestions();
      
      const locationSuggestion = suggestions.find(s => s.id === 'location-aware');
      expect(locationSuggestion).toBeDefined();
      expect(locationSuggestion?.content).toContain('San Francisco, CA');
    });

    it('sorts suggestions by priority', () => {
      // Set up context for multiple suggestions
      service.updateWeatherContext({
        data: { temperature: 30, condition: { id: 600, main: 'Snow', description: 'snow' } },
        unit: 'fahrenheit',
        loading: false,
        error: null,
        forecast: null,
        hasWeather: true,
        toggleUnit: jest.fn(),
      });
      
      service.updateLocationContext({
        hasGPSLocation: false,
        ipLocation: { city: 'Boston' },
        loading: false,
      });

      const suggestions = service.generateSuggestions();
      
      // Should be sorted by priority (high > medium > low)
      for (let i = 1; i < suggestions.length; i++) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const prevPriority = priorityOrder[suggestions[i - 1].priority];
        const currPriority = priorityOrder[suggestions[i].priority];
        expect(prevPriority).toBeGreaterThanOrEqual(currPriority);
      }
    });
  });

  describe('subscription system', () => {
    it('notifies subscribers on context changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const unsubscribe1 = service.subscribe(callback1);
      service.subscribe(callback2);

      // Clear initial calls
      callback1.mockClear();
      callback2.mockClear();

      // Update context
      service.logActivity('test action');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith(expect.objectContaining({
        activity: expect.objectContaining({
          recentActions: ['test action'],
        }),
      }));

      // Unsubscribe first callback
      unsubscribe1();
      service.logActivity('another action');

      expect(callback1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('subscribes to dashboard apps updates', () => {
      const mockAppData = {
        apps: new Map(),
        activeApps: [],
        lastUpdated: mockTimeService.getTimestamp(),
      };

      // Get the callback passed to dashboardAppService.subscribe
      const dashboardCallback = (dashboardAppService.subscribe as jest.Mock).mock.calls[0][0];
      
      const contextCallback = jest.fn();
      service.subscribe(contextCallback);
      contextCallback.mockClear();

      // Trigger dashboard update
      dashboardCallback(mockAppData);

      expect(contextCallback).toHaveBeenCalledWith(expect.objectContaining({
        apps: mockAppData,
      }));
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      const callback = jest.fn();
      service.subscribe(callback);
      
      service.destroy();
      
      // Should clear listeners
      service.logActivity('test');
      expect(callback).not.toHaveBeenCalled();
      
      // Should destroy dashboard app service
      expect(dashboardAppService.destroy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles missing navigation properties gracefully', () => {
      // Remove navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const testService = new DashboardContextService();
      const context = testService.getContext();
      
      expect(context.environment.language).toBe('en-US');
      testService.destroy();
    });

    it('handles dashboard app service integration', () => {
      (dashboardAppService.getAppData as jest.Mock).mockReturnValue(null);
      (dashboardAppService.getContextSummary as jest.Mock).mockReturnValue('Test apps summary');

      service.updateUserContext({
        user: { id: '123', email: 'test@example.com' },
        signIn: jest.fn(),
        signOut: jest.fn(),
      }, {
        id: '123',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      // Should check if adapter is already registered
      expect(dashboardAppService.getAppData).toHaveBeenCalledWith('userProfile');
      expect(dashboardAppService.registerAdapter).toHaveBeenCalledWith(userProfileAdapter);
    });

    it('generates context string with device info', () => {
      service.updateDeviceContext({
        os: 'macOS',
        browser: 'Safari',
        device: 'MacBook',
        screen: '2560x1600',
        pixelRatio: 2,
        windowSize: '1920x1080',
        cpu: '8 cores',
        memory: '16 GB',
        networkType: 'wifi',
        downlink: '100 Mbps',
        batteryLevel: 85,
        batteryCharging: false,
        storageQuota: '50 GB',
      });

      const contextString = service.getContextForPrompt();
      
      expect(contextString).toContain('DEVICE INFO:');
      expect(contextString).toContain('Browser: Safari');
      expect(contextString).toContain('Operating System: macOS');
      expect(contextString).toContain('Device Type: MacBook');
      expect(contextString).toContain('Screen Resolution: 2560x1600 @2x');
      expect(contextString).toContain('CPU: 8 cores');
      expect(contextString).toContain('Battery: 85% (not charging)');
    });
  });
});