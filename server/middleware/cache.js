const crypto = require('crypto');

class ResponseCache {
  constructor(options = {}) {
    this.ttl = options.ttl || parseInt(process.env.VITE_CACHE_TTL) || 3600;
    this.maxSize = options.maxSize || 1000;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  generateKey(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  async get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  async set(key, value, ttl = this.ttl) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000),
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      // Cache cleanup: removed expired entries
    }
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    return size;
  }

  getStats() {
    const hitRate = this.hits + this.misses > 0 
      ? (this.hits / (this.hits + this.misses) * 100).toFixed(2)
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      ttl: this.ttl
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create singleton instance
const cache = new ResponseCache();

// Middleware function
const cacheMiddleware = async (req, res, next) => {
  // Only cache GET requests and specific POST endpoints
  const isCacheable = req.method === 'GET' || 
    (req.method === 'POST' && req.path.includes('/complete'));

  if (!isCacheable || process.env.VITE_ENABLE_CACHE !== 'true') {
    return next();
  }

  // Generate cache key from request
  const cacheKey = cache.generateKey({
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  });

  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.locals.cached = true;
    return res.json(cached);
  }

  // Store original json method
  const originalJson = res.json;

  // Override json method to cache successful responses
  res.json = function(data) {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Don't cache streaming responses or large responses
      const responseSize = JSON.stringify(data).length;
      if (responseSize < 100000) { // 100KB limit
        cache.set(cacheKey, data).catch(err => {
          console.error('Cache set error:', err);
        });
      }
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

// Cache management endpoints
const cacheRoutes = require('express').Router();

cacheRoutes.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: cache.getStats()
  });
});

cacheRoutes.delete('/clear', (req, res) => {
  const cleared = cache.clear();
  res.json({
    success: true,
    message: `Cleared ${cleared} cache entries`
  });
});

module.exports = {
  cache,
  cacheMiddleware,
  cacheRoutes,
  ResponseCache
};