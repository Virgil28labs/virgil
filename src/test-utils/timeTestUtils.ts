/**
 * Time Test Utilities
 * 
 * Helper functions for testing time-dependent code with TimeService.
 * Provides time travel, freezing, and common test scenarios.
 */

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
      const future = new Date(current);
      future.setMonth(future.getMonth() + n);
      this.timeService.setMockDate(future);
    },
    years: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      const future = new Date(current);
      future.setFullYear(future.getFullYear() + n);
      this.timeService.setMockDate(future);
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
      const past = new Date(current);
      past.setMonth(past.getMonth() - n);
      this.timeService.setMockDate(past);
    },
    years: (n: number) => {
      const current = this.timeService.getCurrentDateTime();
      const past = new Date(current);
      past.setFullYear(past.getFullYear() - n);
      this.timeService.setMockDate(past);
    },
  };
  
  to = {
    // Jump to specific times of day
    morning: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(8, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    noon: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(12, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    afternoon: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(15, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    evening: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(19, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    night: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(23, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    midnight: () => {
      const date = new Date(this.timeService.getCurrentDateTime());
      date.setHours(0, 0, 0, 0);
      this.timeService.setMockDate(date);
    },
    
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
export function withTimezone(timeService: MockTimeService, timezone: string, fn: () => void): void {
  // Note: This is a simplified version. In real implementation,
  // we'd need to mock Intl.DateTimeFormat to respect timezone
  const originalFormat = Intl.DateTimeFormat;
  
  try {
    // Execute test with timezone context
    fn();
  } finally {
    // Restore original
    (global as any).Intl.DateTimeFormat = originalFormat;
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