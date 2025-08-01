/**
 * RateLimiter Test Suite
 * 
 * Tests request rate limiting with sliding windows, stats tracking, and time-based controls.
 * Critical for API rate limiting and preventing service abuse.
 */

import { RateLimiter } from '../rateLimit';
import { timeService } from '../../../TimeService';
// MockGlobal type import removed - not used

// Mock the TimeService
jest.mock('../../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    fromTimestamp: jest.fn(),
  },
}));

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set initial timestamp (January 20, 2024, 12:00:00 UTC)
    let currentTime = 1705748400000;
    mockTimeService.getTimestamp.mockImplementation(() => currentTime);
    
    // Mock fromTimestamp to return proper Date objects
    mockTimeService.fromTimestamp.mockImplementation((timestamp: number) => new Date(timestamp));
    
    // Helper to advance time in tests
    (global as any).advanceTime = (ms: number) => {
      currentTime += ms;
    };
    
    // Create fresh rate limiter instance with small limits for testing
    rateLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 60000, // 1 minute
    });
  });

  afterEach(() => {
    delete (global as any).advanceTime;
  });

  describe('Constructor and Configuration', () => {
    it('uses default options when none provided', () => {
      const defaultLimiter = new RateLimiter();
      const stats = defaultLimiter.getStats();
      
      expect(stats.maxRequests).toBe(20);
      expect(stats.windowMs).toBe(60000);
      expect(stats.currentRequests).toBe(0);
      expect(stats.remainingRequests).toBe(20);
    });

    it('uses provided options', () => {
      const customLimiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 30000,
      });
      
      const stats = customLimiter.getStats();
      expect(stats.maxRequests).toBe(10);
      expect(stats.windowMs).toBe(30000);
    });

    it('handles zero and negative options gracefully', () => {
      const edgeLimiter = new RateLimiter({
        maxRequests: 0,
        windowMs: -1000,
      });
      
      const stats = edgeLimiter.getStats();
      // Constructor uses default if falsy value (0 is falsy, but -1000 is not)
      expect(stats.maxRequests).toBe(20); // Uses default (0 is falsy)
      expect(stats.windowMs).toBe(-1000); // Uses provided value (-1000 is not falsy)
    });
  });

  describe('Rate Limiting (checkLimit)', () => {
    it('allows requests within limit', () => {
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      
      const stats = rateLimiter.getStats();
      expect(stats.currentRequests).toBe(3);
      expect(stats.remainingRequests).toBe(0);
    });

    it('blocks requests when limit exceeded', () => {
      // Use up all requests
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      
      // Next request should be blocked
      expect(rateLimiter.checkLimit()).toBe(false);
      expect(rateLimiter.checkLimit()).toBe(false);
      
      const stats = rateLimiter.getStats();
      expect(stats.currentRequests).toBe(3); // Should not increase
      expect(stats.remainingRequests).toBe(0);
    });

    it('allows requests after window slides', () => {
      // Use up all requests
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      
      expect(rateLimiter.checkLimit()).toBe(false);
      
      // Advance time by more than window
      (global as any).advanceTime(61000); // 61 seconds
      
      // Should allow new requests
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(false);
    });

    it('implements sliding window correctly', () => {
      // Make 2 requests at start
      expect(rateLimiter.checkLimit()).toBe(true); // t=0
      expect(rateLimiter.checkLimit()).toBe(true); // t=0
      
      // Advance 30 seconds
      (global as any).advanceTime(30000);
      
      // Make 1 more request (total 3, should be allowed)
      expect(rateLimiter.checkLimit()).toBe(true); // t=30s
      
      // Should be at limit now
      expect(rateLimiter.checkLimit()).toBe(false);
      
      // Advance another 31 seconds (total 61s from start)
      // The first 2 requests should now be outside the window
      (global as any).advanceTime(31000);
      
      // Should allow 2 new requests (3rd request from t=30s still in window)
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(false); // Would be 4th in window
    });

    it('handles rapid successive requests', () => {
      // Make multiple rapid requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(rateLimiter.checkLimit());
      }
      
      // First 3 should be allowed, rest blocked
      expect(results).toEqual([true, true, true, false, false, false, false, false, false, false]);
    });
  });

  describe('Remaining Requests', () => {
    it('returns correct remaining count', () => {
      expect(rateLimiter.getRemainingRequests()).toBe(3);
      
      rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(2);
      
      rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(1);
      
      rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
      
      // Blocked request should not affect remaining count
      rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
    });

    it('updates as window slides', () => {
      // Use all requests
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      expect(rateLimiter.getRemainingRequests()).toBe(0);
      
      // Advance time partially
      (global as any).advanceTime(30000);
      expect(rateLimiter.getRemainingRequests()).toBe(0); // All still in window
      
      // Advance past window
      (global as any).advanceTime(31000);
      expect(rateLimiter.getRemainingRequests()).toBe(3); // All expired
    });

    it('handles empty request history', () => {
      const freshLimiter = new RateLimiter({ maxRequests: 5 });
      expect(freshLimiter.getRemainingRequests()).toBe(5);
    });
  });

  describe('Reset Time', () => {
    it('returns null when no requests made', () => {
      expect(rateLimiter.getResetTime()).toBeNull();
    });

    it('returns correct reset time for oldest request', () => {
      const startTime = mockTimeService.getTimestamp();
      
      rateLimiter.checkLimit(); // t=0
      
      (global as any).advanceTime(30000);
      rateLimiter.checkLimit(); // t=30s
      
      const resetTime = rateLimiter.getResetTime();
      
      expect(mockTimeService.fromTimestamp).toHaveBeenCalledWith(startTime + 60000);
      expect(resetTime).toEqual(new Date(startTime + 60000));
    });

    it('updates reset time as oldest requests expire', () => {
      const startTime = mockTimeService.getTimestamp();
      
      rateLimiter.checkLimit(); // t=0 (oldest)
      
      (global as any).advanceTime(30000);
      rateLimiter.checkLimit(); // t=30s
      
      // Reset time should be based on oldest (t=0)
      let resetTime = rateLimiter.getResetTime();
      expect(resetTime).toEqual(new Date(startTime + 60000));
      
      // Advance past first request's window
      (global as any).advanceTime(31000); // Now at t=61s
      
      // Call getStats to trigger cleanup of expired requests
      rateLimiter.getStats();
      
      // Reset time should now be based on second request (t=30s)
      resetTime = rateLimiter.getResetTime();
      expect(resetTime).toEqual(new Date(startTime + 30000 + 60000));
    });

    it('returns null after all requests expire', () => {
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      
      expect(rateLimiter.getResetTime()).not.toBeNull();
      
      // Advance past window
      (global as any).advanceTime(61000);
      
      // Trigger cleanup by calling getStats first
      rateLimiter.getStats();
      
      // Now getResetTime should return null
      expect(rateLimiter.getResetTime()).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('provides comprehensive stats', () => {
      const stats = rateLimiter.getStats();
      
      expect(stats).toEqual({
        currentRequests: 0,
        maxRequests: 3,
        remainingRequests: 3,
        resetTime: null,
        windowMs: 60000,
      });
    });

    it('updates stats correctly during usage', () => {
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      
      const stats = rateLimiter.getStats();
      
      expect(stats.currentRequests).toBe(2);
      expect(stats.remainingRequests).toBe(1);
      expect(stats.resetTime).not.toBeNull();
    });

    it('cleans up expired requests when getting stats', () => {
      // Make requests at different times  
      rateLimiter.checkLimit(); // t=0
      
      (global as any).advanceTime(30000);
      rateLimiter.checkLimit(); // t=30s
      
      (global as any).advanceTime(31000); // t=61s, first request should expire
      
      const stats = rateLimiter.getStats();
      
      expect(stats.currentRequests).toBe(1); // Only second request remains
      expect(stats.remainingRequests).toBe(2);
    });

    it('handles edge case stats', () => {
      const zeroLimiter = new RateLimiter({ maxRequests: 0 });
      const stats = zeroLimiter.getStats();
      
      expect(stats.currentRequests).toBe(0);
      expect(stats.maxRequests).toBe(20); // Uses default value
      expect(stats.remainingRequests).toBe(20);
      expect(stats.resetTime).toBeNull();
    });
  });

  describe('Reset Functionality', () => {
    it('clears all request history', () => {
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      
      expect(rateLimiter.getRemainingRequests()).toBe(0);
      expect(rateLimiter.getResetTime()).not.toBeNull();
      
      rateLimiter.reset();
      
      expect(rateLimiter.getRemainingRequests()).toBe(3);
      expect(rateLimiter.getResetTime()).toBeNull();
      
      const stats = rateLimiter.getStats();
      expect(stats.currentRequests).toBe(0);
    });

    it('allows fresh requests after reset', () => {
      // Fill up the limiter
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      expect(rateLimiter.checkLimit()).toBe(false);
      
      rateLimiter.reset();
      
      // Should allow new requests
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(false);
    });

    it('resets empty limiter without issues', () => {
      const freshLimiter = new RateLimiter();
      
      expect(() => freshLimiter.reset()).not.toThrow();
      expect(freshLimiter.getRemainingRequests()).toBe(20);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('handles very short windows', () => {
      const shortLimiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 100, // 100ms window
      });
      
      expect(shortLimiter.checkLimit()).toBe(true);
      expect(shortLimiter.checkLimit()).toBe(true);
      expect(shortLimiter.checkLimit()).toBe(false);
      
      // Advance past short window
      (global as any).advanceTime(101);
      
      expect(shortLimiter.checkLimit()).toBe(true);
    });

    it('handles very long windows', () => {
      const longLimiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      expect(longLimiter.checkLimit()).toBe(true);
      expect(longLimiter.checkLimit()).toBe(true);
      expect(longLimiter.checkLimit()).toBe(false);
      
      // Even after an hour, should still be blocked
      (global as any).advanceTime(60 * 60 * 1000);
      expect(longLimiter.checkLimit()).toBe(false);
    });

    it('handles single request limit', () => {
      const singleLimiter = new RateLimiter({
        maxRequests: 1,
        windowMs: 1000,
      });
      
      expect(singleLimiter.checkLimit()).toBe(true);
      expect(singleLimiter.checkLimit()).toBe(false);
      expect(singleLimiter.checkLimit()).toBe(false);
      
      (global as any).advanceTime(1001);
      expect(singleLimiter.checkLimit()).toBe(true);
    });

    it('handles zero request limit', () => {
      const zeroLimiter = new RateLimiter({
        maxRequests: 0,
        windowMs: 1000,
      });
      
      // Since 0 is falsy, constructor uses default (20), so requests are allowed
      expect(zeroLimiter.checkLimit()).toBe(true);
      expect(zeroLimiter.getRemainingRequests()).toBe(19);
    });

    it('handles time going backwards gracefully', () => {
      rateLimiter.checkLimit();
      rateLimiter.checkLimit();
      
      // Simulate time going backwards (shouldn't happen in practice)
      (global as any).advanceTime(-30000);
      
      // Should still work correctly
      expect(rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.checkLimit()).toBe(false);
    });

    it('maintains accuracy with many requests over time', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 10000, // 10 seconds
      });
      
      // Make requests over time, ensuring we don't exceed rate
      for (let i = 0; i < 50; i++) {
        // Every 2 seconds, should allow 2 requests (10 requests per 10 seconds = 1 per second)
        (global as any).advanceTime(2000);
        
        expect(limiter.checkLimit()).toBe(true);
        
        // Try a second request - might be allowed depending on window state
        limiter.checkLimit();
        
        // At minimum, should have some remaining capacity or be at limit
        expect(limiter.getRemainingRequests()).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles concurrent-like rapid requests', () => {
      const results = [];
      
      // Simulate 100 rapid requests
      for (let i = 0; i < 100; i++) {
        results.push(rateLimiter.checkLimit());
      }
      
      // Only first 3 should be allowed
      const allowedCount = results.filter(r => r).length;
      expect(allowedCount).toBe(3);
      
      // All remaining should be blocked
      const blockedCount = results.filter(r => !r).length;
      expect(blockedCount).toBe(97);
    });
  });

  describe('Memory Management and Performance', () => {
    it('cleans up old requests automatically', () => {
      const limiter = new RateLimiter({
        maxRequests: 1000,
        windowMs: 60000,
      });
      
      // Make many requests over time
      for (let i = 0; i < 100; i++) {
        limiter.checkLimit();
        (global as any).advanceTime(1000); // Advance 1 second each time
      }
      
      // After 60+ seconds, early requests should be cleaned up
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBeLessThan(100); // Many should be expired
    });

    it('maintains reasonable memory usage', () => {
      const limiter = new RateLimiter();
      
      // Make a burst of requests, then wait
      for (let i = 0; i < 20; i++) {
        limiter.checkLimit();
      }
      
      // Advance past window
      (global as any).advanceTime(61000);
      
      // Accessing stats should trigger cleanup
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      
      // Should be able to make fresh requests
      expect(limiter.checkLimit()).toBe(true);
    });
  });
});