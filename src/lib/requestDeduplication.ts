// Optimized request deduplication utility to prevent duplicate API calls

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private readonly maxAge: number = 5000; // 5 seconds
  private readonly maxCacheSize: number = 50; // Prevent memory leaks
  private lastCleanup: number = 0;
  private readonly cleanupInterval: number = 10000; // 10 seconds

  /**
   * Creates a numeric hash for better performance than string keys
   */
  private createHash(url: string, options?: RequestInit): number {
    const method = options?.method || "GET";
    const body = options?.body || "";
    const str = `${method}:${url}:${body}`;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Deduplicates fetch requests by caching promises
   * Optimized with periodic cleanup and size limits
   * Returns cloned responses to handle multiple readers
   */
  async dedupeFetch(url: string, options?: RequestInit): Promise<Response> {
    const key = this.createHash(url, options);
    const now = Date.now();

    // Periodic cleanup instead of every request
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Wait for the pending request and return a clone
      const response = await pending.promise;
      return response.clone();
    }

    // Enforce cache size limit
    if (this.pendingRequests.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    // Create new request
    const promise = fetch(url, options).then(response => {
      // Store the response for future cloning
      return response;
    }).finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(key);
    });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });

    // Return the original response for the first caller
    return promise;
  }

  /**
   * Evicts the oldest entry to maintain cache size
   */
  private evictOldest(): void {
    const firstKey = this.pendingRequests.keys().next().value;
    if (firstKey !== undefined) {
      this.pendingRequests.delete(firstKey);
    }
  }

  /**
   * Cleans up expired pending requests (optimized batch operation)
   */
  private cleanup(now: number): void {
    const keysToDelete: number[] = [];

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    }

    // Batch delete for better performance
    keysToDelete.forEach((key) => this.pendingRequests.delete(key));
  }

  /**
   * Clears all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Gets the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

// Convenience function for deduped fetch
export const dedupeFetch = (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  return requestDeduplicator.dedupeFetch(url, options);
};

// React hook for deduplication
export function useRequestDeduplication() {
  return {
    dedupeFetch,
    getPendingCount: () => requestDeduplicator.getPendingCount(),
    clear: () => requestDeduplicator.clear(),
  };
}
