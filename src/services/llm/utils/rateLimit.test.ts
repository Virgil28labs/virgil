import { RateLimiter } from './rateLimit';

// Mock the logger to prevent timeService usage during tests
jest.mock('../../../lib/logger', () => ({
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
jest.mock('../../../services/TimeService', () => {
  const actualMock = jest.requireActual('../../../services/__mocks__/TimeService');
  const mockInstance = actualMock.createMockTimeService('2024-01-20T12:00:00');
  
  return {
    timeService: mockInstance,
    TimeService: jest.fn(() => mockInstance),
  };
});

// Import after mocking
import { timeService } from '../../../services/TimeService';
const mockTimeService = timeService as any;

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset time to initial state
    mockTimeService.setMockDate('2024-01-20T12:00:00');
    
    limiter = new RateLimiter();
  });

  afterEach(() => {
    mockTimeService.destroy();
  });

  describe('constructor', () => {
    it('should create limiter with default options', () => {
      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(20);
      expect(stats.windowMs).toBe(60000);
      expect(stats.currentRequests).toBe(0);
    });

    it('should create limiter with custom options', () => {
      const customLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 30000,
      });
      
      const stats = customLimiter.getStats();
      expect(stats.maxRequests).toBe(10);
      expect(stats.windowMs).toBe(30000);
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 20; i++) {
        expect(limiter.checkLimit()).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      // Fill up the limit
      for (let i = 0; i < 20; i++) {
        expect(limiter.checkLimit()).toBe(true);
      }
      
      // Next request should be blocked
      expect(limiter.checkLimit()).toBe(false);
    });

    it('should allow requests after window expires', () => {
      // Fill up the limit
      for (let i = 0; i < 20; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(100);
      }
      
      // Should be blocked
      expect(limiter.checkLimit()).toBe(false);
      
      // Advance time past the window
      mockTimeService.advanceTime(60000);
      
      // Should allow new requests
      expect(limiter.checkLimit()).toBe(true);
    });

    it('should track requests in sliding window', () => {
      // Add 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(1000);
      }
      
      // Advance time by 30 seconds (half window)
      mockTimeService.advanceTime(30000);
      
      // Add 10 more requests
      for (let i = 0; i < 10; i++) {
        expect(limiter.checkLimit()).toBe(true);
        mockTimeService.advanceTime(100);
      }
      
      // Should be at limit
      expect(limiter.checkLimit()).toBe(false);
      
      // Advance time so first requests expire
      mockTimeService.advanceTime(30000);
      
      // Should allow new requests as old ones expired
      expect(limiter.checkLimit()).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return correct remaining requests', () => {
      expect(limiter.getRemainingRequests()).toBe(20);
      
      limiter.checkLimit();
      expect(limiter.getRemainingRequests()).toBe(19);
      
      for (let i = 0; i < 19; i++) {
        limiter.checkLimit();
      }
      expect(limiter.getRemainingRequests()).toBe(0);
    });

    it('should update remaining requests as window slides', () => {
      // Add 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(100);
      }
      expect(limiter.getRemainingRequests()).toBe(10);
      
      // Advance time past window
      mockTimeService.advanceTime(61000);
      
      // All requests should have expired
      expect(limiter.getRemainingRequests()).toBe(20);
    });

    it('should never return negative remaining requests', () => {
      // Fill up and exceed limit attempts
      for (let i = 0; i < 25; i++) {
        limiter.checkLimit();
      }
      
      expect(limiter.getRemainingRequests()).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('should return null when no requests', () => {
      expect(limiter.getResetTime()).toBeNull();
    });

    it('should return reset time based on oldest request', () => {
      const startTime = mockTimeService.getTimestamp();
      
      limiter.checkLimit();
      
      const resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(startTime + 60000));
    });

    it('should update reset time as old requests expire', () => {
      // Add first request
      limiter.checkLimit();
      const firstRequestTime = mockTimeService.getTimestamp();
      
      // Add more requests later
      mockTimeService.advanceTime(30000);
      limiter.checkLimit();
      const secondRequestTime = mockTimeService.getTimestamp();
      
      // Reset time should be based on first request
      let resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(firstRequestTime + 60000));
      
      // Advance time past first request's window
      mockTimeService.advanceTime(31000);
      
      // Call getRemainingRequests to trigger cleanup of expired requests
      limiter.getRemainingRequests();
      
      // Reset time should now be based on second request
      resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(secondRequestTime + 60000));
    });
  });

  describe('getStats', () => {
    it('should return comprehensive stats', () => {
      const currentTime = mockTimeService.getTimestamp();
      
      // Add some requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit();
      }
      
      const stats = limiter.getStats();
      
      expect(stats).toEqual({
        currentRequests: 5,
        maxRequests: 20,
        remainingRequests: 15,
        resetTime: new Date(currentTime + 60000),
        windowMs: 60000,
      });
    });

    it('should clean up old requests when getting stats', () => {
      // Add requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(100);
      }
      
      // Advance time past window
      mockTimeService.advanceTime(61000);
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      expect(stats.remainingRequests).toBe(20);
      expect(stats.resetTime).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all requests', () => {
      // Add requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
      }
      
      expect(limiter.getStats().currentRequests).toBe(10);
      
      limiter.reset();
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      expect(stats.remainingRequests).toBe(20);
      expect(stats.resetTime).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very small window', () => {
      const fastLimiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 100,
      });
      
      // Fill limit
      for (let i = 0; i < 5; i++) {
        expect(fastLimiter.checkLimit()).toBe(true);
      }
      
      expect(fastLimiter.checkLimit()).toBe(false);
      
      // Wait for window to expire
      mockTimeService.advanceTime(101);
      
      expect(fastLimiter.checkLimit()).toBe(true);
    });

    it('should handle large number of requests', () => {
      // Simulate burst of requests
      for (let i = 0; i < 100; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(10);
      }
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(20); // Should be capped at max
    });

    it('should handle requests at exact window boundary', () => {
      limiter.checkLimit();
      
      // Advance exactly to window boundary
      mockTimeService.advanceTime(60000);
      
      // At exact window boundary, request is excluded (time > windowStart)
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      
      // One millisecond later, it should be gone
      mockTimeService.advanceTime(1);
      const newStats = limiter.getStats();
      expect(newStats.currentRequests).toBe(0);
    });

    it('should maintain consistency under concurrent-like access', () => {
      const results: boolean[] = [];
      
      // Simulate rapid concurrent-like requests
      for (let i = 0; i < 30; i++) {
        results.push(limiter.checkLimit());
      }
      
      // First 20 should succeed
      expect(results.slice(0, 20).every(r => r === true)).toBe(true);
      
      // Rest should fail
      expect(results.slice(20).every(r => r === false)).toBe(true);
      
      // Stats should be consistent
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(20);
      expect(stats.remainingRequests).toBe(0);
    });

    it('should handle time going backwards gracefully', () => {
      // Add some requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit();
        mockTimeService.advanceTime(1000);
      }
      
      // Time goes backwards (e.g., system clock adjustment)
      mockTimeService.advanceTime(-10000);
      
      // Should still respect the existing requests
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(5);
      expect(stats.remainingRequests).toBe(15);
    });
  });
});