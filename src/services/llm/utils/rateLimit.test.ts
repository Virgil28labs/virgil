import { RateLimiter } from './rateLimit';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  let originalDateNow: () => number;

  beforeEach(() => {
    originalDateNow = Date.now;
    // Mock Date.now to have control over time
    let currentTime = 1000000;
    Date.now = jest.fn(() => currentTime);
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime++);
    
    limiter = new RateLimiter();
  });

  afterEach(() => {
    Date.now = originalDateNow;
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
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Fill up the limit
      for (let i = 0; i < 20; i++) {
        limiter.checkLimit();
        currentTime += 100;
      }
      
      // Should be blocked
      expect(limiter.checkLimit()).toBe(false);
      
      // Advance time past the window
      currentTime += 60000;
      
      // Should allow new requests
      expect(limiter.checkLimit()).toBe(true);
    });

    it('should track requests in sliding window', () => {
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Add 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        currentTime += 1000;
      }
      
      // Advance time by 30 seconds (half window)
      currentTime += 30000;
      
      // Add 10 more requests
      for (let i = 0; i < 10; i++) {
        expect(limiter.checkLimit()).toBe(true);
        currentTime += 100;
      }
      
      // Should be at limit
      expect(limiter.checkLimit()).toBe(false);
      
      // Advance time so first requests expire
      currentTime += 30000;
      
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
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Add 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        currentTime += 100;
      }
      expect(limiter.getRemainingRequests()).toBe(10);
      
      // Advance time past window
      currentTime += 61000;
      
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
      const mockNow = jest.spyOn(Date, 'now');
      const startTime = 1000000;
      mockNow.mockImplementation(() => startTime);
      
      limiter.checkLimit();
      
      const resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(startTime + 60000));
    });

    it('should update reset time as old requests expire', () => {
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Add first request
      limiter.checkLimit();
      const firstRequestTime = currentTime;
      
      // Add more requests later
      currentTime += 30000;
      limiter.checkLimit();
      const secondRequestTime = currentTime;
      
      // Reset time should be based on first request
      let resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(firstRequestTime + 60000));
      
      // Advance time past first request's window
      currentTime = firstRequestTime + 61000;
      
      // Call getRemainingRequests to trigger cleanup of expired requests
      limiter.getRemainingRequests();
      
      // Reset time should now be based on second request
      resetTime = limiter.getResetTime();
      expect(resetTime).toEqual(new Date(secondRequestTime + 60000));
    });
  });

  describe('getStats', () => {
    it('should return comprehensive stats', () => {
      const mockNow = jest.spyOn(Date, 'now');
      const currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
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
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Add requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit();
        currentTime += 100;
      }
      
      // Advance time past window
      currentTime += 61000;
      
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
      
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Fill limit
      for (let i = 0; i < 5; i++) {
        expect(fastLimiter.checkLimit()).toBe(true);
      }
      
      expect(fastLimiter.checkLimit()).toBe(false);
      
      // Wait for window to expire
      currentTime += 101;
      
      expect(fastLimiter.checkLimit()).toBe(true);
    });

    it('should handle large number of requests', () => {
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Simulate burst of requests
      for (let i = 0; i < 100; i++) {
        limiter.checkLimit();
        currentTime += 10;
      }
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(20); // Should be capped at max
    });

    it('should handle requests at exact window boundary', () => {
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      limiter.checkLimit();
      
      // Advance exactly to window boundary
      currentTime += 60000;
      
      // At exact window boundary, request is excluded (time > windowStart)
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      
      // One millisecond later, it should be gone
      currentTime += 1;
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
      const mockNow = jest.spyOn(Date, 'now');
      let currentTime = 1000000;
      mockNow.mockImplementation(() => currentTime);
      
      // Add some requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit();
        currentTime += 1000;
      }
      
      // Time goes backwards (e.g., system clock adjustment)
      currentTime -= 10000;
      
      // Should still respect the existing requests
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(5);
      expect(stats.remainingRequests).toBe(15);
    });
  });
});