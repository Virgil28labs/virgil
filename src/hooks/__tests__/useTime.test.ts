/**
 * Tests for useTime hooks
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useCurrentTime,
  useTimeAgo,
  useRelativeTime,
  useDateFormatter,
  useDateMath,
  useDateBoundaries,
  useDateValidation,
  useTimeHelpers,
} from '../useTime';

// Mock TimeService
jest.mock('../../services/TimeService');

// Import the mocked service
import { timeService } from '../../services/TimeService';
import { createMockTimeService } from '../../services/__mocks__/TimeService';

describe('useTime hooks', () => {
  const mockDate = new Date('2024-01-20T12:00:00');
  let mockTimeService: ReturnType<typeof createMockTimeService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    
    // Create a fresh mock instance
    mockTimeService = createMockTimeService(mockDate);
    
    // Apply all methods to the mocked timeService
    Object.assign(timeService, mockTimeService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useCurrentTime', () => {
    it('should return current time information', () => {
      const { result } = renderHook(() => useCurrentTime());
      
      expect(result.current).toEqual({
        currentTime: '12:00',
        currentDate: 'January 20, 2024',
        dateObject: mockDate,
      });
    });

    it('should subscribe to time updates', () => {
      const { unmount } = renderHook(() => useCurrentTime());
      
      expect(timeService.subscribeToTimeUpdates).toHaveBeenCalled();
      
      unmount();
      // Should call unsubscribe
      expect(timeService.subscribeToTimeUpdates).toHaveBeenCalledTimes(1);
    });

    it('should update on interval', () => {
      const { result } = renderHook(() => useCurrentTime(1000));
      
      expect(result.current.currentTime).toBe('12:00');
      
      // Advance time
      act(() => {
        mockTimeService.advanceTime(60 * 1000); // 1 minute
        jest.advanceTimersByTime(1000);
      });
      
      expect(result.current.currentTime).toBe('12:01');
    });
  });

  describe('useTimeAgo', () => {
    it('should return empty string for null date', () => {
      const { result } = renderHook(() => useTimeAgo(null));
      expect(result.current).toBe('');
    });

    it('should return time ago string for valid date', () => {
      const pastDate = new Date('2024-01-20T10:00:00');
      
      const { result } = renderHook(() => useTimeAgo(pastDate));
      expect(result.current).toBe('2 hours ago');
    });

    it('should update on interval', () => {
      const pastDate = new Date('2024-01-20T10:00:00');
      
      const { result } = renderHook(() => useTimeAgo(pastDate, 1000));
      
      expect(result.current).toBe('2 hours ago');
      
      // Advance mock time
      act(() => {
        mockTimeService.advanceTime(60 * 60 * 1000); // 1 hour
        jest.advanceTimersByTime(1000);
      });
      
      // Should now be 3 hours ago
      expect(result.current).toBe('3 hours ago');
    });
  });

  describe('useRelativeTime', () => {
    it('should return empty string for null date', () => {
      const { result } = renderHook(() => useRelativeTime(null));
      expect(result.current).toBe('');
    });

    it('should return relative time string for valid date', () => {
      const futureDate = new Date('2024-01-20T14:00:00');
      
      const { result } = renderHook(() => useRelativeTime(futureDate));
      expect(result.current).toBe('in 2 hours');
    });
  });

  describe('useDateFormatter', () => {
    it('should provide formatting functions', () => {
      const { result } = renderHook(() => useDateFormatter());
      
      expect(result.current).toHaveProperty('formatDate');
      expect(result.current).toHaveProperty('formatDateToLocal');
      expect(result.current).toHaveProperty('formatTime');
      expect(result.current).toHaveProperty('formatDateTime');
      expect(result.current).toHaveProperty('toISOString');
      expect(result.current).toHaveProperty('toISODateString');
    });

    it('should call timeService methods correctly', () => {
      const { result } = renderHook(() => useDateFormatter());
      
      expect(result.current.formatDate(mockDate)).toBe('January 20, 2024');
      expect(result.current.formatDateToLocal(mockDate)).toBe('2024-01-20');
    });
  });

  describe('useDateMath', () => {
    it('should provide date arithmetic functions', () => {
      const { result } = renderHook(() => useDateMath());
      
      expect(result.current).toHaveProperty('addDays');
      expect(result.current).toHaveProperty('subtractDays');
      expect(result.current).toHaveProperty('addMonths');
      expect(result.current).toHaveProperty('subtractMonths');
      expect(result.current).toHaveProperty('addHours');
      expect(result.current).toHaveProperty('subtractHours');
      expect(result.current).toHaveProperty('getDaysBetween');
      expect(result.current).toHaveProperty('getHoursDifference');
    });

    it('should call timeService methods correctly', () => {
      const { result } = renderHook(() => useDateMath());
      
      const tomorrow = result.current.addDays(mockDate, 1);
      expect(tomorrow.toISOString()).toBe('2024-01-21T12:00:00.000Z');
      
      const yesterday = result.current.subtractDays(mockDate, 1);
      expect(yesterday.toISOString()).toBe('2024-01-19T12:00:00.000Z');
    });
  });

  describe('useDateBoundaries', () => {
    it('should provide date boundary functions', () => {
      const { result } = renderHook(() => useDateBoundaries());
      
      expect(result.current).toHaveProperty('startOfDay');
      expect(result.current).toHaveProperty('endOfDay');
      expect(result.current).toHaveProperty('startOfWeek');
      expect(result.current).toHaveProperty('endOfWeek');
      expect(result.current).toHaveProperty('startOfMonth');
      expect(result.current).toHaveProperty('endOfMonth');
    });

    it('should call timeService methods correctly', () => {
      const { result } = renderHook(() => useDateBoundaries());
      
      const startOfDay = result.current.startOfDay(mockDate);
      expect(startOfDay.toISOString()).toBe('2024-01-20T00:00:00.000Z');
      
      const endOfDay = result.current.endOfDay(mockDate);
      expect(endOfDay.toISOString()).toBe('2024-01-20T23:59:59.999Z');
    });
  });

  describe('useDateValidation', () => {
    it('should provide validation functions', () => {
      const { result } = renderHook(() => useDateValidation());
      
      expect(result.current).toHaveProperty('isValidDate');
      expect(result.current).toHaveProperty('parseDate');
      expect(result.current).toHaveProperty('isToday');
      expect(result.current).toHaveProperty('isSameDay');
    });

    it('should validate dates correctly', () => {
      const { result } = renderHook(() => useDateValidation());
      
      expect(result.current.isValidDate(mockDate)).toBe(true);
      expect(result.current.isValidDate('invalid')).toBe(false);
      
      const parsed = result.current.parseDate('2024-01-20');
      expect(parsed).toBeInstanceOf(Date);
      expect(result.current.isToday(mockDate)).toBe(true);
    });
  });

  describe('useTimeHelpers', () => {
    it('should provide common time values', () => {
      const { result } = renderHook(() => useTimeHelpers());
      
      expect(result.current.localDate).toBe('2024-01-20');
      expect(result.current.timeOfDay).toBe('afternoon');
      expect(result.current.dayOfWeek).toBe('saturday');
      expect(result.current).toHaveProperty('getCurrentDateTime');
      expect(result.current).toHaveProperty('getTimestamp');
    });

    it('should update values on interval', () => {
      const { result } = renderHook(() => useTimeHelpers());
      
      // Initial values
      expect(result.current.localDate).toBe('2024-01-20');
      expect(result.current.timeOfDay).toBe('afternoon');
      
      // Advance to evening
      act(() => {
        mockTimeService.setMockDate(new Date('2024-01-20T19:00:00'));
        jest.advanceTimersByTime(60000);
      });
      
      // Values should be updated
      expect(result.current.timeOfDay).toBe('evening');
    });
  });
});