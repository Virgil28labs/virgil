interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
  ttl: number;
}

export class ResponseCache {
  private ttl: number;
  private maxSize: number;
  private cache: Map<string, CacheEntry<any>>;
  private accessOrder: Map<string, number>;
  private hits: number;
  private misses: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 3600; // seconds
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
    this.accessOrder = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  generateKey(data: any): string {
    // Simple string-based key generation
    return JSON.stringify(data);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.misses++;
      return null;
    }

    // Update access time for LRU
    this.accessOrder.set(key, Date.now());
    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttl: number = this.ttl): Promise<void> {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
    });

    this.accessOrder.set(key, Date.now());
  }

  private evictLRU(): void {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.hits = 0;
    this.misses = 0;
    return size;
  }

  getStats(): CacheStats {
    const hitRate =
      this.hits + this.misses > 0
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(2)
        : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      ttl: this.ttl,
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  destroy(): void {
    this.clear();
  }
}
