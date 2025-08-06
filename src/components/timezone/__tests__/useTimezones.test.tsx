/**
 * useTimezones Hook Test Suite
 * 
 * Tests the timezone management hook including:
 * - State initialization and localStorage integration
 * - Timezone addition with validation
 * - Timezone removal and reordering
 * - Label editing and updates  
 * - Real-time updates and time service integration
 * - LocalStorage persistence and error handling
 * - Maximum timezone limits
 * - Invalid timezone handling
 * - Formatters hook functionality
 */

import { renderHook, act } from '@testing-library/react';
import type { DateTime } from 'luxon';
import { useTimezones, useTimezoneFormatters } from '../useTimezones';
import { getDefaultTimezones, generateTimezoneId, getTimezoneInfo } from '../timezoneData';
import { dashboardContextService } from '../../../services/DashboardContextService';
import { logger } from '../../../lib/logger';

// Mock dependencies
jest.mock('../timezoneData');
jest.mock('../../../services/DashboardContextService');
jest.mock('../../../lib/logger');
jest.mock('../../../services/AppDataService', () => ({
  appDataService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const mockGetDefaultTimezones = getDefaultTimezones as jest.MockedFunction<typeof getDefaultTimezones>;
const mockGenerateTimezoneId = generateTimezoneId as jest.MockedFunction<typeof generateTimezoneId>;
const mockGetTimezoneInfo = getTimezoneInfo as jest.MockedFunction<typeof getTimezoneInfo>;
const mockDashboardContextService = dashboardContextService as jest.Mocked<typeof dashboardContextService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockAppDataService = jest.requireMock('../../../services/AppDataService').appDataService;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Luxon DateTime with proper timezone support
jest.mock('luxon', () => {
  const actual = jest.requireActual('luxon');
  return {
    ...actual,
    DateTime: {
      ...actual.DateTime,
      fromJSDate: jest.fn((date) => ({
        ...actual.DateTime.fromJSDate(date),
        setZone: jest.fn().mockReturnValue({
          toFormat: jest.fn().mockReturnValue('12:00'),
          isValid: true,
          diff: jest.fn().mockReturnValue({ hours: 0 }),
          toJSDate: jest.fn().mockReturnValue(date),
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
      })),
      fromISO: jest.fn((isoString) => ({
        setZone: jest.fn().mockReturnValue({
          toFormat: jest.fn().mockReturnValue('12:00'),
          isValid: true,
          diff: jest.fn().mockReturnValue({ hours: 0 }),
          toJSDate: jest.fn().mockReturnValue(new Date(isoString)),
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
        diff: jest.fn().mockReturnValue({ hours: 0 }),
      })),
    },
  };
});

describe('useTimezones', () => {
  const mockCurrentDateTime = new Date('2023-12-01T12:00:00Z');
  const mockDefaultTimezones = [
    {
      id: 'default-1',
      timezone: 'America/New_York',
      label: 'New York',
      order: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock default implementations
    mockGetDefaultTimezones.mockReturnValue(mockDefaultTimezones);
    mockGenerateTimezoneId.mockReturnValue('new-timezone-id');
    mockGetTimezoneInfo.mockReturnValue({
      timezone: 'Europe/London',
      city: 'London',
      country: 'United Kingdom',
      region: 'GMT',
      popular: true,
      searchTerms: ['london', 'uk', 'britain', 'gmt'],
    });

    // Mock appDataService
    mockAppDataService.get.mockResolvedValue(null);
    mockAppDataService.set.mockResolvedValue(true);
    
    mockDashboardContextService.getCurrentDateTime.mockReturnValue(mockCurrentDateTime);
    mockDashboardContextService.subscribeToTimeUpdates.mockReturnValue(jest.fn());
  });

  describe('initialization', () => {
    it('should initialize with default timezones when localStorage is empty', () => {
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.selectedTimezones).toEqual(mockDefaultTimezones);
      expect(mockGetDefaultTimezones).toHaveBeenCalled();
    });

    it('should initialize with timezones from localStorage', () => {
      const storedTimezones = [
        {
          id: 'stored-1',
          timezone: 'Europe/London',
          label: 'London',
          order: 0,
        },
        {
          id: 'stored-2',
          timezone: 'Asia/Tokyo',
          label: 'Tokyo',
          order: 1,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedTimezones));
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.selectedTimezones).toEqual(storedTimezones);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('virgil_selected_timezones');
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.selectedTimezones).toEqual(mockDefaultTimezones);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load timezones from localStorage',
        expect.objectContaining({
          component: 'useTimezones',
          action: 'loadFromStorage',
        }),
      );
    });

    it('should validate localStorage data structure', () => {
      const invalidData = [
        { id: 'test', timezone: 'America/New_York' }, // Missing label and order
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidData));
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.selectedTimezones).toEqual(mockDefaultTimezones);
    });

    it('should sort timezones by order from localStorage', () => {
      const unsortedTimezones = [
        {
          id: 'tz-3',
          timezone: 'Asia/Tokyo',
          label: 'Tokyo',
          order: 2,
        },
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(unsortedTimezones));
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.selectedTimezones[0].id).toBe('tz-1');
      expect(result.current.selectedTimezones[1].id).toBe('tz-2');
      expect(result.current.selectedTimezones[2].id).toBe('tz-3');
    });
  });

  describe('time service integration', () => {
    it('should subscribe to time updates on mount', () => {
      renderHook(() => useTimezones());
      
      expect(mockDashboardContextService.subscribeToTimeUpdates).toHaveBeenCalled();
    });

    it('should update current time when time service emits', () => {
      const mockUnsubscribe = jest.fn();
      let timeUpdateCallback: (time: { currentTime: string; currentDate: string; dateObject: Date; }) => void;
      
      mockDashboardContextService.subscribeToTimeUpdates.mockImplementation((callback) => {
        timeUpdateCallback = callback;
        return mockUnsubscribe;
      });
      
      const { result } = renderHook(() => useTimezones());
      
      const newTime = new Date('2023-12-01T13:00:00Z');
      
      act(() => {
        timeUpdateCallback({ 
          currentTime: '13:00:00',
          currentDate: '2023-12-01',
          dateObject: newTime, 
        });
      });
      
      // Check that timezones with time are updated
      expect(result.current.timezonesWithTime[0].currentTime.toJSDate()).toEqual(
        expect.any(Date),
      );
    });

    it('should cleanup subscription on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockDashboardContextService.subscribeToTimeUpdates.mockReturnValue(mockUnsubscribe);
      
      const { unmount } = renderHook(() => useTimezones());
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('timezones with time computation', () => {
    it('should compute current time for each timezone', () => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.timezonesWithTime).toHaveLength(2);
      expect(result.current.timezonesWithTime[0].timezone).toBe('America/New_York');
      expect(result.current.timezonesWithTime[0].currentTime).toBeDefined();
      expect(result.current.timezonesWithTime[0].isValid).toBe(true);
    });

    it('should handle invalid timezones gracefully', () => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'Invalid/Timezone',
          label: 'Invalid',
          order: 0,
        },
      ];
      
      // Mock DateTime setZone to throw error for invalid timezone
      const { DateTime } = require('luxon');
      DateTime.fromJSDate.mockImplementation((date: Date) => ({
        setZone: jest.fn((tz) => {
          if (tz === 'Invalid/Timezone') {
            throw new Error('Invalid timezone');
          }
          return {
            toFormat: jest.fn().mockReturnValue('12:00'),
            isValid: true,
            diff: jest.fn().mockReturnValue({ hours: 0 }),
            toJSDate: jest.fn().mockReturnValue(date),
          };
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
      }));
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.timezonesWithTime[0].isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid timezone: Invalid/Timezone',
        expect.objectContaining({
          component: 'useTimezones',
          action: 'updateTimezonesWithTime',
        }),
      );
    });
  });

  describe('adding timezones', () => {
    it('should add valid timezone successfully', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Europe/London');
        expect(success).toBe(true);
      });
      
      expect(result.current.selectedTimezones).toHaveLength(2);
      expect(result.current.selectedTimezones[1].timezone).toBe('Europe/London');
      expect(result.current.selectedTimezones[1].label).toBe('London');
      expect(mockGenerateTimezoneId).toHaveBeenCalled();
    });

    it('should add timezone with custom label', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Europe/London', 'Custom London');
        expect(success).toBe(true);
      });
      
      expect(result.current.selectedTimezones[1].label).toBe('Custom London');
    });

    it('should reject duplicate timezones', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('America/New_York'); // Already exists
        expect(success).toBe(false);
      });
      
      expect(result.current.selectedTimezones).toHaveLength(1); // No change
    });

    it('should reject adding when at maximum limit', () => {
      const maxTimezones = Array.from({ length: 5 }, (_, i) => ({
        id: `tz-${i}`,
        timezone: `America/Timezone_${i}`,
        label: `Timezone ${i}`,
        order: i,
      }));
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(maxTimezones));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Europe/London');
        expect(success).toBe(false);
      });
      
      expect(result.current.selectedTimezones).toHaveLength(5); // No change
    });

    it('should validate timezone using time service', () => {
      // Mock invalid timezone in setZone
      const { DateTime } = require('luxon');
      DateTime.fromJSDate.mockImplementation((date: Date) => ({
        setZone: jest.fn((tz) => {
          if (tz === 'Invalid/Timezone') {
            return { isValid: false };
          }
          return {
            toFormat: jest.fn().mockReturnValue('12:00'),
            isValid: true,
            diff: jest.fn().mockReturnValue({ hours: 0 }),
            toJSDate: jest.fn().mockReturnValue(date),
          };
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
      }));
      
      mockDashboardContextService.getCurrentDateTime.mockReturnValue(mockCurrentDateTime);
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Invalid/Timezone');
        expect(success).toBe(false);
      });
      
      expect(result.current.selectedTimezones).toHaveLength(1); // No change
    });

    it('should handle timezone validation errors', () => {
      // Mock DateTime to throw error in setZone
      const { DateTime } = require('luxon');
      DateTime.fromJSDate.mockImplementation((date: Date) => ({
        setZone: jest.fn((tz) => {
          if (tz === 'Bad/Timezone') {
            throw new Error('Invalid timezone');
          }
          return {
            toFormat: jest.fn().mockReturnValue('12:00'),
            isValid: true,
            diff: jest.fn().mockReturnValue({ hours: 0 }),
            toJSDate: jest.fn().mockReturnValue(date),
          };
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
      }));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Bad/Timezone');
        expect(success).toBe(false);
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid timezone: Bad/Timezone',
        expect.objectContaining({
          component: 'useTimezones',
          action: 'addTimezone',
        }),
      );
    });

    it('should use timezone fallback when no city info available', () => {
      mockGetTimezoneInfo.mockReturnValue(undefined);
      
      // Mock valid DateTime for timezone validation
      const { DateTime } = require('luxon');
      DateTime.fromJSDate.mockImplementation((date: Date) => ({
        setZone: jest.fn().mockReturnValue({
          toFormat: jest.fn().mockReturnValue('12:00'),
          isValid: true,
          diff: jest.fn().mockReturnValue({ hours: 0 }),
          toJSDate: jest.fn().mockReturnValue(date),
        }),
        toFormat: jest.fn().mockReturnValue('12:00'),
        isValid: true,
      }));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        const success = result.current.addTimezone('Unknown/Timezone');
        expect(success).toBe(true);
      });
      
      expect(result.current.selectedTimezones[1].label).toBe('Unknown/Timezone');
    });
  });

  describe('removing timezones', () => {
    it('should remove timezone by id', () => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.removeTimezone('tz-1');
      });
      
      expect(result.current.selectedTimezones).toHaveLength(1);
      expect(result.current.selectedTimezones[0].id).toBe('tz-2');
      expect(result.current.selectedTimezones[0].order).toBe(0); // Reordered
    });

    it('should reorder remaining timezones after removal', () => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
        {
          id: 'tz-3',
          timezone: 'Asia/Tokyo',
          label: 'Tokyo',
          order: 2,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.removeTimezone('tz-2'); // Remove middle timezone
      });
      
      expect(result.current.selectedTimezones).toHaveLength(2);
      expect(result.current.selectedTimezones[0].order).toBe(0);
      expect(result.current.selectedTimezones[1].order).toBe(1);
    });

    it('should handle removing non-existent timezone', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.removeTimezone('non-existent');
      });
      
      expect(result.current.selectedTimezones).toHaveLength(1); // No change
    });
  });

  describe('updating timezone labels', () => {
    it('should update timezone label', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.updateTimezoneLabel('default-1', 'Custom NYC');
      });
      
      expect(result.current.selectedTimezones[0].label).toBe('Custom NYC');
    });

    it('should trim whitespace from labels', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.updateTimezoneLabel('default-1', '  Trimmed Label  ');
      });
      
      expect(result.current.selectedTimezones[0].label).toBe('Trimmed Label');
    });

    it('should ignore empty or whitespace-only labels', () => {
      const { result } = renderHook(() => useTimezones());
      const originalLabel = result.current.selectedTimezones[0].label;
      
      act(() => {
        result.current.updateTimezoneLabel('default-1', '   ');
      });
      
      expect(result.current.selectedTimezones[0].label).toBe(originalLabel); // No change
    });

    it('should handle updating non-existent timezone', () => {
      const { result } = renderHook(() => useTimezones());
      const originalLabel = result.current.selectedTimezones[0].label;
      
      act(() => {
        result.current.updateTimezoneLabel('non-existent', 'New Label');
      });
      
      expect(result.current.selectedTimezones[0].label).toBe(originalLabel); // No change
    });
  });

  describe('reordering timezones', () => {
    beforeEach(() => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
        {
          id: 'tz-3',
          timezone: 'Asia/Tokyo',
          label: 'Tokyo',
          order: 2,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
    });

    it('should reorder timezones from lower to higher index', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.reorderTimezones(0, 2); // Move first to last
      });
      
      expect(result.current.selectedTimezones[0].id).toBe('tz-2');
      expect(result.current.selectedTimezones[1].id).toBe('tz-3');
      expect(result.current.selectedTimezones[2].id).toBe('tz-1');
      
      // Check order values are updated
      expect(result.current.selectedTimezones[0].order).toBe(0);
      expect(result.current.selectedTimezones[1].order).toBe(1);
      expect(result.current.selectedTimezones[2].order).toBe(2);
    });

    it('should reorder timezones from higher to lower index', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.reorderTimezones(2, 0); // Move last to first
      });
      
      expect(result.current.selectedTimezones[0].id).toBe('tz-3');
      expect(result.current.selectedTimezones[1].id).toBe('tz-1');
      expect(result.current.selectedTimezones[2].id).toBe('tz-2');
    });

    it('should ignore reorder when indices are the same', () => {
      const { result } = renderHook(() => useTimezones());
      const originalOrder = result.current.selectedTimezones.map(tz => tz.id);
      
      act(() => {
        result.current.reorderTimezones(1, 1);
      });
      
      const newOrder = result.current.selectedTimezones.map(tz => tz.id);
      expect(newOrder).toEqual(originalOrder);
    });

    it('should ignore invalid indices', () => {
      const { result } = renderHook(() => useTimezones());
      const originalOrder = result.current.selectedTimezones.map(tz => tz.id);
      
      act(() => {
        result.current.reorderTimezones(-1, 1); // Invalid fromIndex
      });
      
      act(() => {
        result.current.reorderTimezones(1, 5); // Invalid toIndex
      });
      
      const newOrder = result.current.selectedTimezones.map(tz => tz.id);
      expect(newOrder).toEqual(originalOrder);
    });
  });

  describe('clearing all timezones', () => {
    it('should clear all timezones', () => {
      const timezones = [
        {
          id: 'tz-1',
          timezone: 'America/New_York',
          label: 'New York',
          order: 0,
        },
        {
          id: 'tz-2',
          timezone: 'Europe/London',
          label: 'London',
          order: 1,
        },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(timezones));
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.clearAllTimezones();
      });
      
      expect(result.current.selectedTimezones).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should save to localStorage when timezones change', () => {
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.addTimezone('Europe/London');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'virgil_selected_timezones',
        expect.stringContaining('Europe/London'),
      );
    });

    it('should handle localStorage save errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const { result } = renderHook(() => useTimezones());
      
      act(() => {
        result.current.addTimezone('Europe/London');
      });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to save timezones to localStorage',
        expect.objectContaining({
          component: 'useTimezones',
          action: 'saveToStorage',
        }),
      );
    });
  });

  describe('computed properties', () => {
    it('should compute canAddMoreTimezones correctly', () => {
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.canAddMoreTimezones).toBe(true);
      
      // Add 4 more timezones to reach the limit
      act(() => {
        result.current.addTimezone('Europe/London');
        result.current.addTimezone('Asia/Tokyo');
        result.current.addTimezone('Australia/Sydney');
        result.current.addTimezone('America/Los_Angeles');
      });
      
      expect(result.current.canAddMoreTimezones).toBe(false);
    });

    it('should track isUpdating state during time updates', () => {
      let timeUpdateCallback: (time: { currentTime: string; currentDate: string; dateObject: Date; }) => void;
      
      mockDashboardContextService.subscribeToTimeUpdates.mockImplementation((callback) => {
        timeUpdateCallback = callback;
        return jest.fn();
      });
      
      const { result } = renderHook(() => useTimezones());
      
      expect(result.current.isUpdating).toBe(false);
      
      act(() => {
        timeUpdateCallback({ 
          currentTime: '12:00:00',
          currentDate: '2023-12-01',
          dateObject: new Date('2023-12-01T12:00:00'), 
        });
      });
      
      // After async setTimeout, isUpdating should be false again
      setTimeout(() => {
        expect(result.current.isUpdating).toBe(false);
      }, 10);
    });
  });
});

describe('useTimezoneFormatters', () => {
  // Note: These DateTime objects were used for reference but are no longer needed
  // as we now mock the DateTime objects directly in each test
  // const _mockDateTime1 = DateTime.fromISO('2023-12-01T12:00:00Z');
  // const _mockDateTime2 = DateTime.fromISO('2023-12-01T15:00:00Z'); // 3 hours ahead
  // const _mockDateTime3 = DateTime.fromISO('2023-12-01T09:00:00Z'); // 3 hours behind

  describe('formatTime', () => {
    it('should format time in 24-hour format', () => {
      // Mock the specific DateTime object used in test
      const mockDateTimeWithFormat = {
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatTime(mockDateTimeWithFormat as unknown as DateTime as DateTime);
      expect(formatted).toBe('12:00');
      expect(mockDateTimeWithFormat.toFormat).toHaveBeenCalledWith('HH:mm');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Same time" for identical times', () => {
      // Mock identical dateTime objects
      const mockDT = {
        diff: jest.fn().mockReturnValue({ hours: 0 }),
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatRelativeTime(mockDT as unknown as DateTime, mockDT as unknown as DateTime);
      expect(formatted).toBe('Same time');
      expect(mockDT.diff).toHaveBeenCalledWith(mockDT, 'hours');
    });

    it('should format hours ahead correctly', () => {
      // Mock dateTime objects with diff method
      const mockDT1 = {
        diff: jest.fn().mockReturnValue({ hours: 3 }),
        toFormat: jest.fn().mockReturnValue('15:00'),
      };
      const mockDT2 = {
        diff: jest.fn().mockReturnValue({ hours: 0 }),
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatRelativeTime(mockDT1 as unknown as DateTime, mockDT2 as unknown as DateTime);
      expect(formatted).toBe('3h ahead');
      expect(mockDT1.diff).toHaveBeenCalledWith(mockDT2, 'hours');
    });

    it('should format hours behind correctly', () => {
      // Mock dateTime objects with diff method returning negative hours
      const mockDT1 = {
        diff: jest.fn().mockReturnValue({ hours: -3 }),
        toFormat: jest.fn().mockReturnValue('09:00'),
      };
      const mockDT2 = {
        diff: jest.fn().mockReturnValue({ hours: 0 }),
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatRelativeTime(mockDT1 as unknown as DateTime, mockDT2 as unknown as DateTime);
      expect(formatted).toBe('3h behind');
      expect(mockDT1.diff).toHaveBeenCalledWith(mockDT2, 'hours');
    });

    it('should handle fractional hours', () => {
      // Mock dateTime objects with fractional hour difference
      const mockDT1 = {
        diff: jest.fn().mockReturnValue({ hours: 0.5 }),
        toFormat: jest.fn().mockReturnValue('12:30'),
      };
      const mockDT2 = {
        diff: jest.fn().mockReturnValue({ hours: 0 }),
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatRelativeTime(mockDT1 as unknown as DateTime, mockDT2 as unknown as DateTime);
      expect(formatted).toBe('0h ahead'); // Should floor to 0
      expect(mockDT1.diff).toHaveBeenCalledWith(mockDT2, 'hours');
    });

    it('should handle large time differences', () => {
      // Mock dateTime objects with large hour difference
      const mockDT1 = {
        diff: jest.fn().mockReturnValue({ hours: 12 }),
        toFormat: jest.fn().mockReturnValue('00:00'),
      };
      const mockDT2 = {
        diff: jest.fn().mockReturnValue({ hours: 0 }),
        toFormat: jest.fn().mockReturnValue('12:00'),
      };
      
      const { result } = renderHook(() => useTimezoneFormatters());
      
      const formatted = result.current.formatRelativeTime(mockDT1 as unknown as DateTime, mockDT2 as unknown as DateTime);
      expect(formatted).toBe('12h ahead');
      expect(mockDT1.diff).toHaveBeenCalledWith(mockDT2, 'hours');
    });
  });

  describe('memoization', () => {
    it('should be memoized and return stable references', () => {
      const { result, rerender } = renderHook(() => useTimezoneFormatters());
      
      const firstFormatters = result.current;
      
      rerender();
      
      const secondFormatters = result.current;
      
      expect(firstFormatters).toBe(secondFormatters);
      expect(firstFormatters.formatTime).toBe(secondFormatters.formatTime);
      expect(firstFormatters.formatRelativeTime).toBe(secondFormatters.formatRelativeTime);
    });
  });
});