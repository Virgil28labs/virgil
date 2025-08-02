/**
 * Persistence Tests
 * 
 * Tests for the persistence functionality including TTL validation,
 * storage utilities, and store persistence.
 */

import { renderHook, act } from '@testing-library/react';
import { useContextStore } from '../ContextStore';
import { useWeatherCacheStore } from '../WeatherCacheStore';
import { useLocationCacheStore } from '../LocationCacheStore';
import { usePreferencesStore } from '../PreferencesStore';
import { 
  STORAGE_CONFIG, 
  createTTLData, 
  isTTLExpired, 
  getTTLData, 
  storage,
  storageDebug, 
} from '../utils/persistence';

// Mock TimeService
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getCurrentTime: jest.fn(() => '12:00'),
    getCurrentDate: jest.fn(() => 'January 20, 2024'),
    getTimeOfDay: jest.fn(() => 'afternoon'),
    getDayOfWeek: jest.fn(() => 'saturday'),
    getTimestamp: jest.fn(() => Date.now()),
    getCurrentDateTime: jest.fn(() => new Date('2024-01-20T12:00:00')),
    subscribeToTimeUpdates: jest.fn(() => jest.fn()),
  },
}));

// Mock localStorage with better isolation
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  const mock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    
    // Add access to internal store for debugging
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };

  return mock;
};

const localStorageMock = createLocalStorageMock();

// Mock localStorage globally
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Persistence Utilities', () => {
  beforeEach(() => {
    // Reset localStorage state
    localStorageMock.clear();
    localStorageMock._setStore({});
    
    // Reset all mock implementations to original behavior
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      const store = localStorageMock._getStore();
      store[key] = value;
    });
    
    localStorageMock.getItem.mockImplementation((key: string) => {
      const store = localStorageMock._getStore();
      return store[key] || null;
    });
    
    localStorageMock.removeItem.mockImplementation((key: string) => {
      const store = localStorageMock._getStore();
      delete store[key];
    });
    
    // Clear call history
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('TTL Data Management', () => {
    it('should create TTL data with correct expiration', () => {
      const testData = { value: 'test' };
      const ttl = 1000; // 1 second
      
      const ttlData = createTTLData(testData, ttl);
      
      expect(ttlData.data).toEqual(testData);
      expect(ttlData.timestamp).toBeCloseTo(Date.now(), -2);
      expect(ttlData.expiresAt).toBeCloseTo(Date.now() + ttl, -2);
    });

    it('should detect expired TTL data', () => {
      const testData = { value: 'test' };
      const expiredTTL = createTTLData(testData, -1000); // Expired 1 second ago
      
      expect(isTTLExpired(expiredTTL)).toBe(true);
    });

    it('should detect valid TTL data', () => {
      const testData = { value: 'test' };
      const validTTL = createTTLData(testData, 60000); // Valid for 1 minute
      
      expect(isTTLExpired(validTTL)).toBe(false);
    });

    it('should return null for expired TTL data', () => {
      const testData = { value: 'test' };
      const expiredTTL = createTTLData(testData, -1000);
      
      expect(getTTLData(expiredTTL)).toBeNull();
    });

    it('should return data for valid TTL data', () => {
      const testData = { value: 'test' };
      const validTTL = createTTLData(testData, 60000);
      
      expect(getTTLData(validTTL)).toEqual(testData);
    });
  });

  describe('Storage Operations', () => {
    it('should save and retrieve data from localStorage', () => {
      const testData = { name: 'Ben', age: 30 };
      
      const success = storage.set('test-key', testData);
      expect(success).toBe(true);
      
      const retrieved = storage.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle localStorage errors gracefully', () => {
      // Create a temporary mock that throws an error
      const throwingMock = jest.fn((_key: string, _value: string) => {
        throw new Error('Storage quota exceeded');
      });
      
      // Temporarily replace setItem with error-throwing mock
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = throwingMock;
      
      const success = storage.set('test-key', { data: 'test' });
      expect(success).toBe(false);
      
      // Restore original implementation
      localStorageMock.setItem = originalSetItem;
    });

    it('should remove items from localStorage', () => {
      // Set item using storage API first
      const setResult = storage.set('test-key', { data: 'test' });
      expect(setResult).toBe(true); // Ensure set succeeded
      
      const retrieved = storage.get('test-key');
      expect(retrieved).toBeTruthy();
      expect(retrieved).toEqual({ data: 'test' });
      
      const success = storage.remove('test-key');
      expect(success).toBe(true);
      expect(storage.get('test-key')).toBeNull();
    });

    it('should clear all Virgil storage', () => {
      // Set some test data
      Object.values(STORAGE_CONFIG.keys).forEach((key, index) => {
        storage.set(key, { data: `test-${index}` });
      });
      
      storage.clearAll();
      
      // Verify all keys are cleared
      Object.values(STORAGE_CONFIG.keys).forEach((key) => {
        expect(storage.get(key)).toBeNull();
      });
    });

    it('should calculate storage usage', () => {
      // Use storage API to ensure data is stored properly
      const userResult = storage.set(STORAGE_CONFIG.keys.user, { name: 'Ben' });
      const prefResult = storage.set(STORAGE_CONFIG.keys.preferences, { theme: 'dark' });
      
      expect(userResult).toBe(true);
      expect(prefResult).toBe(true);
      
      // Verify data was actually stored
      expect(storage.get(STORAGE_CONFIG.keys.user)).toEqual({ name: 'Ben' });
      expect(storage.get(STORAGE_CONFIG.keys.preferences)).toEqual({ theme: 'dark' });
      
      const usage = storage.getUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
    });
  });

  describe('Storage Debug', () => {
    it('should log storage data in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      
      storage.set(STORAGE_CONFIG.keys.user, { name: 'Ben' });
      storageDebug.logAll();
      
      expect(consoleSpy).toHaveBeenCalledWith('📦 Virgil Storage Debug');
      
      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('should not log in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      
      storageDebug.logAll();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Restore
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});

describe('Store Persistence', () => {
  beforeEach(() => {
    // Reset localStorage state
    localStorageMock.clear();
    
    // Reset all mock implementations
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('User Store Persistence', () => {
    it('should persist user data', async () => {
      const { result } = renderHook(() => useContextStore((state) => state.user));
      
      // Set user data
      act(() => {
        result.current.setUser({
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
      
      // Verify the data is set in the store
      expect(result.current.user?.name).toBe('Ben');
      expect(result.current.user?.dob).toBe('28-11-1982');
      expect(result.current.user?.username).toBe('Ben28');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Weather Cache Persistence', () => {
    it('should cache and retrieve weather data', () => {
      const { result } = renderHook(() => useWeatherCacheStore());
      
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
        result.current.setCachedWeather(weatherData, { lat: 37.7749, lon: -122.4194 });
      });
      
      const cachedWeather = result.current.getCachedWeather();
      expect(cachedWeather).toEqual(weatherData);
    });

    it('should validate weather cache by location', () => {
      const { result } = renderHook(() => useWeatherCacheStore());
      
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
      
      const location = { lat: 37.7749, lon: -122.4194 };
      
      act(() => {
        result.current.setCachedWeather(weatherData, location);
      });
      
      // Same location should be valid
      expect(result.current.isWeatherCacheValid(location)).toBe(true);
      
      // Different location should be invalid
      const differentLocation = { lat: 40.7128, lon: -74.0060 }; // NYC
      expect(result.current.isWeatherCacheValid(differentLocation)).toBe(false);
    });
  });

  describe('Location Cache Persistence', () => {
    it('should cache and retrieve IP location data', () => {
      const { result } = renderHook(() => useLocationCacheStore());
      
      const ipLocation = {
        ip: '192.168.1.1',
        city: 'San Francisco',
        region: 'CA',
        country: 'US',
        timezone: 'America/Los_Angeles',
        lat: 37.7749,
        lon: -122.4194,
      };
      
      act(() => {
        result.current.setCachedIpLocation(ipLocation, ipLocation.ip);
      });
      
      const cached = result.current.getCachedIpLocation();
      expect(cached).toEqual(ipLocation);
    });

    it('should validate IP location cache by IP address', () => {
      const { result } = renderHook(() => useLocationCacheStore());
      
      const ipLocation = {
        ip: '192.168.1.1',
        city: 'San Francisco',
        region: 'CA',
        country: 'US',
      };
      
      act(() => {
        result.current.setCachedIpLocation(ipLocation, ipLocation.ip);
      });
      
      // Same IP should be valid
      expect(result.current.isIpLocationCacheValid('192.168.1.1')).toBe(true);
      
      // Different IP should be invalid
      expect(result.current.isIpLocationCacheValid('10.0.0.1')).toBe(false);
    });
  });

  describe('Preferences Persistence', () => {
    it('should persist user preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());
      
      act(() => {
        result.current.setTheme('dark');
        result.current.setTemperatureUnit('celsius');
      });
      
      expect(result.current.theme).toBe('dark');
      expect(result.current.temperatureUnit).toBe('celsius');
      
      // Verify data can be exported
      const exported = result.current.exportPreferences();
      expect(exported.theme).toBe('dark');
      expect(exported.temperatureUnit).toBe('celsius');
    });

    it('should import and export preferences', () => {
      const { result } = renderHook(() => usePreferencesStore());
      
      const customPreferences = {
        theme: 'dark' as const,
        temperatureUnit: 'celsius' as const,
        notifications: {
          weather: false,
          location: true,
          general: true,
        },
      };
      
      act(() => {
        result.current.importPreferences(customPreferences);
      });
      
      const exported = result.current.exportPreferences();
      expect(exported.theme).toBe('dark');
      expect(exported.temperatureUnit).toBe('celsius');
      expect(exported.notifications.weather).toBe(false);
    });

    it('should reset preferences to defaults', () => {
      const { result } = renderHook(() => usePreferencesStore());
      
      // Change some preferences
      act(() => {
        result.current.setTheme('dark');
        result.current.setTemperatureUnit('celsius');
      });
      
      // Reset to defaults
      act(() => {
        result.current.resetPreferences();
      });
      
      expect(result.current.theme).toBe('auto');
      expect(result.current.temperatureUnit).toBe('fahrenheit');
    });
  });
});