/**
 * Example test file demonstrating the proper TimeService mock pattern
 * 
 * This example shows how to properly mock TimeService in tests after
 * the Phase 1 migration. Use this as a reference for updating other tests.
 */

import { timeService } from '../TimeService';
import { logger } from '../../lib/logger';

// Mock dependencies that use TimeService
jest.mock('../../lib/logger');

// Mock TimeService with all necessary methods
jest.mock('../TimeService', () => {
  // Use the actual mock implementation
  const actualMock = jest.requireActual('../__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

describe('TimeService Migration Example', () => {
  // Get the mocked instance
  const mockTimeService = timeService as any;
  
  beforeEach(() => {
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockTimeService.destroy();
  });

  describe('Basic Time Operations', () => {
    it('should provide consistent time values', () => {
      expect(mockTimeService.getTimestamp()).toBe(1705780800000);
      expect(mockTimeService.getLocalDate()).toBe('2024-01-20');
      expect(mockTimeService.getCurrentTime()).toBe('12:00');
      expect(mockTimeService.getDayOfWeek()).toBe('saturday');
      expect(mockTimeService.getTimeOfDay()).toBe('afternoon');
    });

    it('should format dates correctly', () => {
      const date = mockTimeService.getCurrentDateTime();
      expect(mockTimeService.formatDate(date)).toBe('January 20, 2024');
      expect(mockTimeService.toISOString(date)).toBe('2024-01-20T20:00:00.000Z'); // Note: UTC conversion
      expect(mockTimeService.toISODateString(date)).toBe('2024-01-20');
    });
  });

  describe('Time Travel', () => {
    it('should advance time correctly', () => {
      const initialTime = mockTimeService.getTimestamp();
      
      // Advance by 1 hour
      mockTimeService.advanceTime(60 * 60 * 1000);
      
      expect(mockTimeService.getTimestamp()).toBe(initialTime + 60 * 60 * 1000);
      expect(mockTimeService.getCurrentTime()).toBe('13:00');
    });

    it('should set specific dates', () => {
      mockTimeService.setMockDate('2024-12-25T08:00:00');
      
      expect(mockTimeService.getLocalDate()).toBe('2024-12-25');
      expect(mockTimeService.getDayOfWeek()).toBe('wednesday');
      expect(mockTimeService.getTimeOfDay()).toBe('morning');
    });

    it('should freeze and unfreeze time', () => {
      mockTimeService.freezeTime();
      const frozenTime = mockTimeService.getTimestamp();
      
      // Try to advance - should not change
      mockTimeService.advanceTime(1000);
      expect(mockTimeService.getTimestamp()).toBe(frozenTime);
      
      // Unfreeze and advance
      mockTimeService.unfreezeTime();
      mockTimeService.advanceTime(1000);
      expect(mockTimeService.getTimestamp()).toBe(frozenTime + 1000);
    });
  });

  describe('Date Arithmetic', () => {
    it('should add and subtract days', () => {
      const baseDate = mockTimeService.getCurrentDateTime();
      
      const tomorrow = mockTimeService.addDays(baseDate, 1);
      expect(mockTimeService.formatDateToLocal(tomorrow)).toBe('2024-01-21');
      
      const yesterday = mockTimeService.subtractDays(baseDate, 1);
      expect(mockTimeService.formatDateToLocal(yesterday)).toBe('2024-01-19');
    });

    it('should handle month boundaries', () => {
      mockTimeService.setMockDate('2024-01-31T12:00:00');
      const date = mockTimeService.getCurrentDateTime();
      
      const nextMonth = mockTimeService.addMonths(date, 1);
      expect(mockTimeService.formatDateToLocal(nextMonth)).toBe('2024-02-29'); // Leap year
      
      const nextYear = mockTimeService.addYears(date, 1);
      expect(mockTimeService.formatDateToLocal(nextYear)).toBe('2025-01-31');
    });
  });

  describe('Relative Time', () => {
    it('should calculate time ago correctly', () => {
      const now = mockTimeService.getCurrentDateTime();
      
      // 5 minutes ago
      const fiveMinAgo = mockTimeService.subtractMinutes(now, 5);
      expect(mockTimeService.getTimeAgo(fiveMinAgo)).toBe('5 minutes ago');
      
      // 2 hours ago
      const twoHoursAgo = mockTimeService.subtractHours(now, 2);
      expect(mockTimeService.getTimeAgo(twoHoursAgo)).toBe('2 hours ago');
      
      // 3 days ago
      const threeDaysAgo = mockTimeService.subtractDays(now, 3);
      expect(mockTimeService.getTimeAgo(threeDaysAgo)).toBe('3 days ago');
    });

    it('should calculate relative time for future dates', () => {
      const now = mockTimeService.getCurrentDateTime();
      
      // In 30 minutes
      const future = mockTimeService.addMinutes(now, 30);
      expect(mockTimeService.getRelativeTime(future)).toBe('in 30 minutes');
      
      // In 2 days
      const twoDaysLater = mockTimeService.addDays(now, 2);
      expect(mockTimeService.getRelativeTime(twoDaysLater)).toBe('in 2 days');
    });
  });

  describe('Time Subscriptions', () => {
    it('should notify subscribers of time updates', () => {
      const callback = jest.fn();
      const unsubscribe = mockTimeService.subscribeToTimeUpdates(callback);
      
      // Should get initial call
      expect(callback).toHaveBeenCalledWith({
        currentTime: '12:00',
        currentDate: 'January 20, 2024',
        dateObject: expect.any(Date),
      });
      
      // Advance time and trigger update
      mockTimeService.advanceTime(60 * 1000);
      mockTimeService['notifyListeners'](); // Private method access for testing
      
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith({
        currentTime: '12:01',
        currentDate: 'January 20, 2024',
        dateObject: expect.any(Date),
      });
      
      // Cleanup
      unsubscribe();
    });
  });

  describe('Date Boundaries', () => {
    it('should calculate day boundaries', () => {
      mockTimeService.setMockDate('2024-01-20T14:30:45');
      
      const startOfDay = mockTimeService.startOfDay();
      expect(mockTimeService.formatDateTimeToLocal(startOfDay)).toContain('00:00:00');
      
      const endOfDay = mockTimeService.endOfDay();
      expect(mockTimeService.formatDateTimeToLocal(endOfDay)).toContain('23:59:59');
    });

    it('should calculate week boundaries', () => {
      mockTimeService.setMockDate('2024-01-20T12:00:00'); // Saturday
      
      const startOfWeek = mockTimeService.startOfWeek();
      expect(mockTimeService.formatDateToLocal(startOfWeek)).toBe('2024-01-15'); // Monday
      
      const endOfWeek = mockTimeService.endOfWeek();
      expect(mockTimeService.formatDateToLocal(endOfWeek)).toBe('2024-01-21'); // Sunday
    });

    it('should calculate month boundaries', () => {
      mockTimeService.setMockDate('2024-01-20T12:00:00');
      
      const startOfMonth = mockTimeService.startOfMonth();
      expect(mockTimeService.formatDateToLocal(startOfMonth)).toBe('2024-01-01');
      
      const endOfMonth = mockTimeService.endOfMonth();
      expect(mockTimeService.formatDateToLocal(endOfMonth)).toBe('2024-01-31');
    });
  });

  describe('Integration with Other Services', () => {
    it('should work with services that depend on TimeService', () => {
      // Example: Testing a cache that uses timestamps
      class SimpleCache {
        private cache = new Map<string, { value: any; timestamp: number }>();
        private ttl = 60 * 1000; // 1 minute
        
        set(key: string, value: any) {
          this.cache.set(key, {
            value,
            timestamp: timeService.getTimestamp(),
          });
        }
        
        get(key: string) {
          const entry = this.cache.get(key);
          if (!entry) return null;
          
          const age = timeService.getTimestamp() - entry.timestamp;
          if (age > this.ttl) {
            this.cache.delete(key);
            return null;
          }
          
          return entry.value;
        }
      }
      
      const cache = new SimpleCache();
      cache.set('key1', 'value1');
      
      // Should retrieve immediately
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past TTL
      mockTimeService.advanceTime(61 * 1000);
      
      // Should be expired
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('Common Test Patterns', () => {
    it('should handle time-based retries', async () => {
      let attempts = 0;
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second
      
      async function operationWithRetry() {
        while (attempts < maxRetries) {
          attempts++;
          
          if (attempts < maxRetries) {
            // Simulate failure
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            mockTimeService.advanceTime(retryDelay);
            continue;
          }
          
          // Success on last attempt
          return 'success';
        }
        throw new Error('Max retries exceeded');
      }
      
      jest.useFakeTimers();
      const promise = operationWithRetry();
      
      // Fast-forward through retries
      jest.advanceTimersByTime(retryDelay * 2);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      
      jest.useRealTimers();
    });

    it('should test rate limiting', () => {
      class RateLimiter {
        private requests: number[] = [];
        private windowMs = 60 * 1000; // 1 minute
        private maxRequests = 10;
        
        canMakeRequest(): boolean {
          const now = timeService.getTimestamp();
          const windowStart = now - this.windowMs;
          
          // Remove old requests
          this.requests = this.requests.filter(time => time > windowStart);
          
          if (this.requests.length >= this.maxRequests) {
            return false;
          }
          
          this.requests.push(now);
          return true;
        }
      }
      
      const limiter = new RateLimiter();
      
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        expect(limiter.canMakeRequest()).toBe(true);
      }
      
      // 11th request should fail
      expect(limiter.canMakeRequest()).toBe(false);
      
      // Advance time past window
      mockTimeService.advanceTime(61 * 1000);
      
      // Should be able to make requests again
      expect(limiter.canMakeRequest()).toBe(true);
    });
  });
});