/**
 * TimeService Comprehensive Test Suite
 * 
 * Tests all TimeService functionality that 50+ components depend on.
 * This is critical infrastructure - comprehensive coverage required.
 */

// Unmock TimeService for this specific test file
jest.unmock('../TimeService');

import { TimeService } from '../TimeService';

describe('TimeService', () => {
  let service: TimeService;

  beforeEach(() => {
    service = new TimeService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Basic Date/Time Methods', () => {
    it('getCurrentDateTime returns current date object', () => {
      const before = Date.now();
      const now = service.getCurrentDateTime();
      const after = Date.now();
      
      expect(now).toBeInstanceOf(Date);
      expect(now.getTime()).toBeGreaterThanOrEqual(before);
      expect(now.getTime()).toBeLessThanOrEqual(after);
    });

    it('getTimestamp returns milliseconds since epoch', () => {
      const before = Date.now();
      const timestamp = service.getTimestamp();
      const after = Date.now();
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('getLocalDate returns YYYY-MM-DD format', () => {
      const localDate = service.getLocalDate();
      expect(localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('getCurrentTime returns 24-hour format', () => {
      const time = service.getCurrentTime();
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('getCurrentDate returns formatted date', () => {
      const date = service.getCurrentDate();
      expect(date).toMatch(/^\w+ \d{1,2}, \d{4}$/);
    });

    it('getDayOfWeek returns lowercase day', () => {
      const day = service.getDayOfWeek();
      expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).toContain(day);
    });

    it('getTimeOfDay categorizes time periods correctly', () => {
      // We'll test the logic with specific times
      const timeOfDay = service.getTimeOfDay();
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(timeOfDay);
    });
  });

  describe('Date Formatting', () => {
    it('formatDateToLocal converts to YYYY-MM-DD', () => {
      const date = new Date('2024-01-20T15:30:00');
      const formatted = service.formatDateToLocal(date);
      expect(formatted).toBe('2024-01-20');
    });

    it('formatDate returns human-readable format', () => {
      const date = new Date('2024-01-20T15:30:00');
      const formatted = service.formatDate(date);
      expect(formatted).toBe('January 20, 2024');
    });

    it('toISOString returns UTC ISO string', () => {
      const date = new Date('2024-01-20T15:30:00Z'); // Explicit UTC
      const iso = service.toISOString(date);
      expect(iso).toBe('2024-01-20T15:30:00.000Z');
    });

    it('toISODateString returns local date string', () => {
      const date = new Date('2024-01-20T15:30:00');
      const isoDate = service.toISODateString(date);
      expect(isoDate).toBe('2024-01-20');
    });
  });

  describe('Date Arithmetic', () => {
    const baseDate = new Date('2024-01-20T12:00:00');

    it('addDays works correctly', () => {
      const tomorrow = service.addDays(baseDate, 1);
      expect(tomorrow.getDate()).toBe(21);
    });

    it('subtractDays works correctly', () => {
      const yesterday = service.subtractDays(baseDate, 1);
      expect(yesterday.getDate()).toBe(19);
    });

    it('addMonths works correctly', () => {
      const nextMonth = service.addMonths(baseDate, 1);
      expect(nextMonth.getMonth()).toBe(1); // February (0-indexed)
    });

    it('subtractMonths works correctly', () => {
      const lastMonth = service.subtractMonths(baseDate, 1);
      expect(lastMonth.getMonth()).toBe(11); // December (0-indexed)
    });

    it('addHours works correctly', () => {
      const later = service.addHours(baseDate, 2);
      expect(later.getHours()).toBe(14);
    });

    it('subtractHours works correctly', () => {
      const earlier = service.subtractHours(baseDate, 2);
      expect(earlier.getHours()).toBe(10);
    });

    it('addMinutes works correctly', () => {
      const later = service.addMinutes(baseDate, 30);
      expect(later.getMinutes()).toBe(30);
    });

    it('subtractMinutes works correctly', () => {
      const earlier = service.subtractMinutes(baseDate, 30);
      expect(earlier.getMinutes()).toBe(30);
    });
  });

  describe('Date Boundaries', () => {
    const testDate = new Date('2024-01-20T15:30:45.123');

    it('startOfDay returns beginning of day', () => {
      const start = service.startOfDay(testDate);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('endOfDay returns end of day', () => {
      const end = service.endOfDay(testDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('startOfWeek returns Monday', () => {
      const start = service.startOfWeek(testDate);
      expect(start.getDay()).toBe(1); // Monday
      expect(start.getHours()).toBe(0);
    });

    it('endOfWeek returns Sunday', () => {
      const end = service.endOfWeek(testDate);
      expect(end.getDay()).toBe(0); // Sunday
      expect(end.getHours()).toBe(23);
    });

    it('startOfMonth returns first day', () => {
      const start = service.startOfMonth(testDate);
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
    });

    it('endOfMonth returns last day', () => {
      const end = service.endOfMonth(testDate);
      expect(end.getDate()).toBe(31); // January has 31 days
      expect(end.getHours()).toBe(23);
    });
  });

  describe('Date Comparison', () => {
    it('isToday works correctly', () => {
      const today = new Date();
      const yesterday = service.subtractDays(today, 1);
      
      expect(service.isToday(today)).toBe(true);
      expect(service.isToday(yesterday)).toBe(false);
    });

    it('isSameDay works correctly', () => {
      const date1 = new Date('2024-01-20T10:00:00');
      const date2 = new Date('2024-01-20T22:00:00');
      const date3 = new Date('2024-01-21T10:00:00');
      
      expect(service.isSameDay(date1, date2)).toBe(true);
      expect(service.isSameDay(date1, date3)).toBe(false);
    });

    it('getDaysBetween calculates correctly', () => {
      const start = new Date('2024-01-20');
      const end = new Date('2024-01-25');
      
      const days = service.getDaysBetween(start, end);
      expect(days).toBe(5);
    });

    it('getHoursDifference calculates correctly', () => {
      const start = new Date('2024-01-20T10:00:00');
      const end = new Date('2024-01-20T15:30:00');
      
      const hours = service.getHoursDifference(start, end);
      expect(hours).toBe(5);
    });
  });

  describe('Relative Time Formatting', () => {
    it('getTimeAgo formats past times correctly', () => {
      const now = new Date();
      
      // 30 seconds ago
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      expect(service.getTimeAgo(thirtySecondsAgo)).toBe('just now');
      
      // 5 minutes ago
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(service.getTimeAgo(fiveMinutesAgo)).toBe('5 minutes ago');
      
      // 2 hours ago
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(service.getTimeAgo(twoHoursAgo)).toBe('2 hours ago');
    });

    it('getRelativeTime handles future and past', () => {
      // Use a fixed timestamp to avoid timing issues
      const baseTime = Date.now();
      
      // 2 hours in the future (add a small buffer to ensure we get exactly 2 hours)
      const twoHoursLater = new Date(baseTime + 2 * 60 * 60 * 1000 + 60000); // +1 minute buffer
      expect(service.getRelativeTime(twoHoursLater)).toBe('in 2 hours');
      
      // 1 day ago (subtract a small buffer to ensure we get exactly 1 day)
      const oneDayAgo = new Date(baseTime - 24 * 60 * 60 * 1000 - 60000); // -1 minute buffer
      expect(service.getRelativeTime(oneDayAgo)).toBe('1 day ago');
    });
  });

  describe('Form Input Helpers', () => {
    it('formatForDateInput returns YYYY-MM-DD', () => {
      const date = new Date('2024-01-20T15:30:00');
      const formatted = service.formatForDateInput(date);
      expect(formatted).toBe('2024-01-20');
    });

    it('formatForDateTimeInput returns datetime-local format', () => {
      const date = new Date('2024-01-20T15:30:00');
      const formatted = service.formatForDateTimeInput(date);
      expect(formatted).toBe('2024-01-20T15:30');
    });
  });

  describe('Validation & Parsing', () => {
    it('isValidDate validates correctly', () => {
      expect(service.isValidDate(new Date())).toBe(true);
      expect(service.isValidDate(new Date('invalid'))).toBe(false);
      expect(service.isValidDate('not a date' as any)).toBe(false);
    });

    it('parseDate handles various inputs', () => {
      expect(service.parseDate('2024-01-20')).toBeInstanceOf(Date);
      expect(service.parseDate('invalid')).toBeNull();
      expect(service.parseDate('')).toBeNull();
    });
  });

  describe('Time Subscription System', () => {
    it('subscribeToTimeUpdates works', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToTimeUpdates(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });
  });

  describe('Date Component Extraction', () => {
    const testDate = new Date('2024-01-20T15:30:45');

    it('extracts year correctly', () => {
      expect(service.getYear(testDate)).toBe(2024);
    });

    it('extracts month correctly', () => {
      expect(service.getMonth(testDate)).toBe(1); // January as 1, not 0
    });

    it('extracts day correctly', () => {
      expect(service.getDay(testDate)).toBe(20);
    });

    it('extracts hours correctly', () => {
      expect(service.getHours(testDate)).toBe(15);
    });

    it('extracts minutes correctly', () => {
      expect(service.getMinutes(testDate)).toBe(30);
    });

    it('extracts seconds correctly', () => {
      expect(service.getSeconds(testDate)).toBe(45);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      expect(() => service.formatDate(invalidDate)).not.toThrow();
    });

    it('handles null/undefined inputs in parseDate', () => {
      expect(service.parseDate(null as any)).toBeNull();
      expect(service.parseDate(undefined as any)).toBeNull();
    });

    it('handles timezone edge cases', () => {
      // Test around midnight
      const nearMidnight = new Date();
      nearMidnight.setHours(23, 59, 59);
      expect(service.isToday(nearMidnight)).toBe(true);
    });
  });

  describe('Performance & Caching', () => {
    it('caches repeated calls efficiently', () => {
      // Multiple calls to getLocalDate should potentially use cached value
      const date1 = service.getLocalDate();
      const date2 = service.getLocalDate();
      expect(date1).toBe(date2);
    });
  });

  describe('Additional Methods', () => {
    it('creates dates from components correctly', () => {
      const date = service.createDate(2024, 0, 20); // Month is 0-indexed
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(20);
    });

    it('creates dates from timestamps correctly', () => {
      const timestamp = Date.now();
      const date = service.fromTimestamp(timestamp);
      expect(date.getTime()).toBe(timestamp);
    });

    it('formats date and time with locale support', () => {
      const date = new Date('2024-01-20T15:30:45');
      const formatted = service.formatDateTimeToLocal(date);
      expect(formatted).toMatch(/1\/20\/2024, \d{1,2}:\d{2}:\d{2}/);
    });

    it('formats time with locale support', () => {
      const date = new Date('2024-01-20T15:30:45');
      const formatted = service.formatTimeToLocal(date);
      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });
});