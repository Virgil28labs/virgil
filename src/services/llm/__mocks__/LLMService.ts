import { EventEmitter } from "../utils/eventEmitter";

export class LLMService extends EventEmitter {
  private _config: any;
  private activeRequests: Map<string, { startTime: number }>;

  constructor(config: any = {}) {
    super();
    this._config = {
      apiUrl: "http://localhost:5002/api/v1",
      defaultModel: "gpt-4o-mini",
      enableCache: false,
      cacheTTL: 3600,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
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
