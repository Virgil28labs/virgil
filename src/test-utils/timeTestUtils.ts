/* eslint-disable no-undef */
/**
 * Time Test Utilities
 * 
 * Helper functions for testing time-dependent code with TimeService.
 * Provides time travel, freezing, and common test scenarios.
 */

/* eslint-env jest */
/* global expect, beforeEach, afterEach */

import 'jest';
import { createMockTimeService, type MockTimeService } from '../services/__mocks__/TimeService';

export interface TimeTestContext {
  timeService: MockTimeService;
  advanceTime: (ms: number) => void;
  setTime: (date: Date | string) => void;
  freezeTime: () => void;
  unfreezeTime: () => void;
  expectTimeAgo: (date: Date, expected: string) => void;
  expectRelativeTime: (date: Date, expected: string) => void;
  cleanup: () => void;
}

/**
 * Create a time test context with utilities
 */
export function setupTimeTest(initialDate?: Date | string): TimeTestContext {
  const timeService = createMockTimeService(initialDate);
  
  return {
    timeService,
    
    advanceTime: (ms: number) => {
      timeService.advanceTime(ms);
      jest.advanceTimersByTime(ms);
    },
    
    setTime: (date: Date | string) => {
      timeService.setMockDate(date);
    },
    
    freezeTime: () => {
      timeService.freezeTime();
      jest.useFakeTimers();
    },
    
    unfreezeTime: () => {
      timeService.unfreezeTime();
      jest.useRealTimers();
    },
    
    expectTimeAgo: (date: Date, expected: string) => {
      expect(timeService.getTimeAgo(date)).toBe(expected);
    },
    
    expectRelativeTime: (date: Date, expected: string) => {
      expect(timeService.getRelativeTime(date)).toBe(expected);
    },
    
    cleanup: () => {
      timeService.destroy();
      jest.useRealTimers();
    },
  };
}

/**
 * Time travel helper for testing time-based features
 */
export class TimeTravel {
  constructor(private timeService: MockTimeService) {}
  
  // Common time jumps
  forward = {
    seconds: (n: number) => this.timeService.advanceTime(n * 1000),
    minutes: (n: number) => this.timeService.advanceTime(n * 60 * 1000),
    hours: (n: number) => this.timeService.advanceTime(n * 60 * 60 * 1000),
    days: (n: number) => this.timeService.advanceTime(n * 24 * 60 * 60 * 1000),
    weeks: (n: number) => this.timeService.advanceTime(n * 7 * 24 * 60 * 60 * 1000),
    months: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      if (typeof this.timeService.addMonths === 'function') {
        this.timeService.setMockDate(this.timeService.addMonths(current, n));
      } else {
        throw new Error('MockTimeService.addMonths is required for month jumps');
      }
    },
    years: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      if (typeof this.timeService.addYears === 'function') {
        this.timeService.setMockDate(this.timeService.addYears(current, n));
      } else {
        throw new Error('MockTimeService.addYears is required for year jumps');
      }
    },
  };
  
  backward = {
    seconds: (n: number) => this.timeService.advanceTime(-n * 1000),
    minutes: (n: number) => this.timeService.advanceTime(-n * 60 * 1000),
    hours: (n: number) => this.timeService.advanceTime(-n * 60 * 60 * 1000),
    days: (n: number) => this.timeService.advanceTime(-n * 24 * 60 * 60 * 1000),
    weeks: (n: number) => this.timeService.advanceTime(-n * 7 * 24 * 60 * 60 * 1000),
    months: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      if (typeof this.timeService.addMonths === 'function') {
        this.timeService.setMockDate(this.timeService.addMonths(current, -n));
      } else {
        throw new Error('MockTimeService.addMonths is required for month jumps');
      }
    },
    years: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      if (typeof this.timeService.addYears === 'function') {
        this.timeService.setMockDate(this.timeService.addYears(current, -n));
      } else {
        throw new Error('MockTimeService.addYears is required for year jumps');
      }
    },
  };
  
  to = {
    // Jump to specific times of day
    morning: () => this.timeService.setMockDate(this.timeService.addHours(this.timeService.startOfDay(), 8)),
    noon: () => this.timeService.setMockDate(this.timeService.addHours(this.timeService.startOfDay(), 12)),
    afternoon: () => this.timeService.setMockDate(this.timeService.addHours(this.timeService.startOfDay(), 15)),
    evening: () => this.timeService.setMockDate(this.timeService.addHours(this.timeService.startOfDay(), 19)),
    night: () => this.timeService.setMockDate(this.timeService.addHours(this.timeService.startOfDay(), 23)),
    midnight: () => this.timeService.setMockDate(this.timeService.startOfDay()),
    
    // Jump to specific dates
    startOfDay: () => {
      this.timeService.setMockDate(this.timeService.startOfDay());
    },
    endOfDay: () => {
      this.timeService.setMockDate(this.timeService.endOfDay());
    },
    startOfWeek: () => {
      this.timeService.setMockDate(this.timeService.startOfWeek());
    },
    endOfWeek: () => {
      this.timeService.setMockDate(this.timeService.endOfWeek());
    },
    startOfMonth: () => {
      this.timeService.setMockDate(this.timeService.startOfMonth());
    },
    endOfMonth: () => {
      this.timeService.setMockDate(this.timeService.endOfMonth());
    },
    
    // Jump to specific date
    date: (date: Date | string) => {
      this.timeService.setMockDate(date);
    },
  };
}

/**
 * Common test scenarios for time-based features
 */
export const timeScenarios = {
  // Cache expiry testing
  cacheExpiry: (timeService: MockTimeService, cacheDuration: number) => {
    return {
      justBeforeExpiry: () => timeService.advanceTime(cacheDuration - 1),
      exactlyAtExpiry: () => timeService.advanceTime(cacheDuration),
      afterExpiry: () => timeService.advanceTime(cacheDuration + 1),
    };
  },
  
  // Session timeout testing
  sessionTimeout: (timeService: MockTimeService, timeout: number) => {
    return {
      halfwayThrough: () => timeService.advanceTime(timeout / 2),
      almostExpired: () => timeService.advanceTime(timeout * 0.9),
      justExpired: () => timeService.advanceTime(timeout + 1),
    };
  },
  
  // Animation frame testing
  animationFrames: (timeService: MockTimeService, fps: number = 60) => {
    const frameTime = 1000 / fps;
    return {
      nextFrame: () => timeService.advanceTime(frameTime),
      skipFrames: (n: number) => timeService.advanceTime(frameTime * n),
      oneSecond: () => timeService.advanceTime(1000),
    };
  },
  
  // Rate limiting testing
  rateLimiting: (timeService: MockTimeService, windowMs: number) => {
    return {
      withinWindow: () => timeService.advanceTime(windowMs - 1),
      nextWindow: () => timeService.advanceTime(windowMs),
      skipWindows: (n: number) => timeService.advanceTime(windowMs * n),
    };
  },
};

/**
 * Test helper for timezone scenarios
 */
export function withTimezone(_timeService: MockTimeService, _timezone: string, fn: () => void): void {
  // Note: This is a simplified version. In real implementation,
  // we'd need to mock Intl.DateTimeFormat to respect timezone
  const originalFormat = Intl.DateTimeFormat;
  
  try {
    // Execute test with timezone context
    fn();
  } finally {
    // Restore original
    (global as unknown as { Intl: { DateTimeFormat: typeof Intl.DateTimeFormat } }).Intl.DateTimeFormat = originalFormat;
  }
}

/**
 * Assertion helpers for time-based tests
 */
export const timeAssertions = {
  expectSameDay: (timeService: MockTimeService, date1: Date, date2: Date) => {
    expect(timeService.isSameDay(date1, date2)).toBe(true);
  },
  
  expectDifferentDay: (timeService: MockTimeService, date1: Date, date2: Date) => {
    expect(timeService.isSameDay(date1, date2)).toBe(false);
  },
  
  expectToday: (timeService: MockTimeService, date: Date) => {
    expect(timeService.isToday(date)).toBe(true);
  },
  
  expectNotToday: (timeService: MockTimeService, date: Date) => {
    expect(timeService.isToday(date)).toBe(false);
  },
  
  expectTimeOfDay: (timeService: MockTimeService, expected: 'morning' | 'afternoon' | 'evening' | 'night') => {
    expect(timeService.getTimeOfDay()).toBe(expected);
  },
  
  expectDayOfWeek: (timeService: MockTimeService, expected: string) => {
    expect(timeService.getDayOfWeek()).toBe(expected.toLowerCase());
  },
};

/**
 * Mock timer utilities
 */
export function mockTimers() {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  
  return {
    tick: (ms: number) => jest.advanceTimersByTime(ms),
    runAll: () => jest.runAllTimers(),
    runPending: () => jest.runOnlyPendingTimers(),
  };
}