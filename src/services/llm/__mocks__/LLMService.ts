import { EventEmitter } from '../utils/eventEmitter';

export class LLMService extends EventEmitter {
  private activeRequests: Map<string, { startTime: number }>;

  constructor(_config: Record<string, unknown> = {}) {
    super();
    // Config is used for initialization only
    this.activeRequests = new Map();
  }

  complete = jest.fn();
  completeStream = jest.fn();
  getModels = jest.fn();
  countTokens = jest.fn();
  getStats = jest.fn(() => ({
    activeRequests: this.activeRequests.size,
    cacheStats: { hits: 0, misses: 0 },
    rateLimitStats: { requests: 0, remaining: 20 },
  }));
  clearCache = jest.fn();
  destroy = jest.fn();
}
