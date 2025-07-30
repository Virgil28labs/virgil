import { logger } from '../lib/logger';
import { timeService } from './TimeService';
import { supabase } from '../lib/supabase';

interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueuedRequest = QueuedRequest<any>;

class VectorService {
  private baseUrl: string;
  private requestQueue: AnyQueuedRequest[] = [];
  private activeRequests = 0;
  private readonly MAX_CONCURRENT_REQUESTS = 2;
  private readonly REQUEST_DELAY_MS = 100; // 100ms between requests
  private lastRequestTime = 0;
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 5;
  private circuitBreakerOpenUntil = 0;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  }

  /**
   * Get authorization headers with the current user's session token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw new Error('No active session');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Execute a request through the rate-limited queue
   */
  private async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    if (timeService.getTimestamp() < this.circuitBreakerOpenUntil) {
      throw new Error('Vector service temporarily unavailable (circuit breaker open)');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        execute: fn,
        resolve,
        reject,
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {
      return;
    }

    // Rate limiting: ensure minimum delay between requests
    const now = timeService.getTimestamp();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.REQUEST_DELAY_MS) {
      setTimeout(() => this.processQueue(), this.REQUEST_DELAY_MS - timeSinceLastRequest);
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.activeRequests++;
    this.lastRequestTime = timeService.getTimestamp();

    try {
      const result = await request.execute();
      this.consecutiveFailures = 0; // Reset on success
      request.resolve(result);
    } catch (error) {
      this.consecutiveFailures++;
      
      // Open circuit breaker if too many failures
      if (this.consecutiveFailures >= this.MAX_FAILURES) {
        this.circuitBreakerOpenUntil = timeService.getTimestamp() + 60000; // 60 seconds
        logger.warn('Vector service circuit breaker opened due to repeated failures');
      }

      request.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeRequests--;
      // Process next request in queue
      setTimeout(() => this.processQueue(), 0);
    }
  }

  async store(content: string): Promise<string> {
    return this.executeWithRateLimit(async () => {
      try {
        const headers = await this.getAuthHeaders();
        
        const response = await fetch(`${this.baseUrl}/api/v1/vector/store`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to store memory');
        }

        const data = await response.json();
        return data.id;
      } catch (error) {
        logger.error('Vector store error', error as Error, {
          component: 'VectorService',
          action: 'store',
        });
        throw error;
      }
    });
  }


  async search(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    return this.executeWithRateLimit(async () => {
      try {
        const headers = await this.getAuthHeaders();
        
        const response = await fetch(`${this.baseUrl}/api/v1/vector/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, limit }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to search memories');
        }

        const data = await response.json();
        return data.results || [];
      } catch (error) {
        logger.error('Vector search error', error as Error, {
          component: 'VectorService',
          action: 'search',
        });
        throw error;
      }
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/health`);
      const data = await response.json();
      return data.healthy || false;
    } catch (error) {
      logger.error('Vector health check error', error as Error, {
        component: 'VectorService',
        action: 'isHealthy',
      });
      return false;
    }
  }

  async getCount(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/count`);
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      logger.error('Vector count error', error as Error, {
        component: 'VectorService',
        action: 'getCount',
      });
      return 0;
    }
  }
}

export const vectorService = new VectorService();
export type { VectorSearchResult };
