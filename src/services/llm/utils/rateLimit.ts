interface RateLimiterOptions {
  maxRequests?: number;
  windowMs?: number;
}

interface RateLimiterStats {
  currentRequests: number;
  maxRequests: number;
  remainingRequests: number;
  resetTime: Date | null;
  windowMs: number;
}

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];

  constructor(options: RateLimiterOptions = {}) {
    this.maxRequests = options.maxRequests || 20;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.requests = [];
  }

  checkLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);
    
    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    this.requests.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime(): Date | null {
    if (this.requests.length === 0) {
      return null;
    }
    
    // Get the oldest request time
    const oldestRequest = Math.min(...this.requests);
    return new Date(oldestRequest + this.windowMs);
  }

  getStats(): RateLimiterStats {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(time => time > windowStart);
    
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      remainingRequests: this.getRemainingRequests(),
      resetTime: this.getResetTime(),
      windowMs: this.windowMs,
    };
  }

  reset(): void {
    this.requests = [];
  }
}