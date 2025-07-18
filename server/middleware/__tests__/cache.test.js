const { ResponseCache, cache, cacheMiddleware, cacheRoutes } = require('../cache');
const request = require('supertest');
const express = require('express');

describe('ResponseCache', () => {
  let responseCache;

  beforeEach(() => {
    responseCache = new ResponseCache({
      ttl: 2, // 2 seconds for faster tests
      maxSize: 3
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    responseCache.destroy();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('generateKey', () => {
    it('should generate consistent hash for same data', () => {
      const data = { method: 'GET', path: '/test', query: { id: 1 } };
      const key1 = responseCache.generateKey(data);
      const key2 = responseCache.generateKey(data);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it('should generate different hashes for different data', () => {
      const data1 = { method: 'GET', path: '/test1' };
      const data2 = { method: 'GET', path: '/test2' };
      
      const key1 = responseCache.generateKey(data1);
      const key2 = responseCache.generateKey(data2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      await responseCache.set(key, value);
      const retrieved = await responseCache.get(key);
      
      expect(retrieved).toEqual(value);
      expect(responseCache.hits).toBe(1);
      expect(responseCache.misses).toBe(0);
    });

    it('should return null for non-existent keys', async () => {
      const result = await responseCache.get('non-existent');
      
      expect(result).toBeNull();
      expect(responseCache.misses).toBe(1);
      expect(responseCache.hits).toBe(0);
    });

    it('should respect TTL expiration', async () => {
      const key = 'expiring-key';
      const value = { data: 'will-expire' };
      
      await responseCache.set(key, value, 1); // 1 second TTL
      
      // Should exist initially
      expect(await responseCache.get(key)).toEqual(value);
      
      // Fast forward past TTL
      jest.advanceTimersByTime(1500);
      
      // Should be expired
      expect(await responseCache.get(key)).toBeNull();
      expect(responseCache.cache.has(key)).toBe(false);
    });

    it('should update lastAccessed on get', async () => {
      const key = 'access-test';
      await responseCache.set(key, 'value');
      
      const initialEntry = responseCache.cache.get(key);
      const initialTime = initialEntry.lastAccessed;
      
      jest.advanceTimersByTime(100);
      await responseCache.get(key);
      
      const updatedEntry = responseCache.cache.get(key);
      expect(updatedEntry.lastAccessed).toBeGreaterThan(initialTime);
    });
  });

  describe('evictLRU', () => {
    it('should evict least recently used entry when cache is full', async () => {
      // Fill cache to max size
      await responseCache.set('key1', 'value1');
      jest.advanceTimersByTime(100);
      await responseCache.set('key2', 'value2');
      jest.advanceTimersByTime(100);
      await responseCache.set('key3', 'value3');
      
      // Access key2 to make it more recent than key1
      await responseCache.get('key2');
      
      // Add one more item, should evict key1 (least recently used)
      await responseCache.set('key4', 'value4');
      
      expect(responseCache.cache.size).toBe(3);
      expect(responseCache.cache.has('key1')).toBe(false);
      expect(responseCache.cache.has('key2')).toBe(true);
      expect(responseCache.cache.has('key3')).toBe(true);
      expect(responseCache.cache.has('key4')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      await responseCache.set('key1', 'value1', 1); // 1 second TTL
      await responseCache.set('key2', 'value2', 3); // 3 seconds TTL
      await responseCache.set('key3', 'value3', 1); // 1 second TTL
      
      expect(responseCache.cache.size).toBe(3);
      
      // Advance past first TTL
      jest.advanceTimersByTime(1500);
      responseCache.cleanup();
      
      expect(responseCache.cache.size).toBe(1);
      expect(responseCache.cache.has('key2')).toBe(true);
      expect(responseCache.cache.has('key1')).toBe(false);
      expect(responseCache.cache.has('key3')).toBe(false);
    });

    it('should run cleanup automatically on interval', async () => {
      await responseCache.set('expiring', 'value', 1);
      
      // Fast forward past cleanup interval
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
      
      expect(responseCache.cache.has('expiring')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries and reset stats', async () => {
      await responseCache.set('key1', 'value1');
      await responseCache.set('key2', 'value2');
      await responseCache.get('key1');
      await responseCache.get('non-existent');
      
      const cleared = responseCache.clear();
      
      expect(cleared).toBe(2);
      expect(responseCache.cache.size).toBe(0);
      expect(responseCache.hits).toBe(0);
      expect(responseCache.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await responseCache.set('key1', 'value1');
      await responseCache.set('key2', 'value2');
      await responseCache.get('key1'); // hit
      await responseCache.get('key2'); // hit
      await responseCache.get('key3'); // miss
      
      const stats = responseCache.getStats();
      
      expect(stats).toEqual({
        size: 2,
        maxSize: 3,
        hits: 2,
        misses: 1,
        hitRate: '66.67%',
        ttl: 2
      });
    });

    it('should handle zero hit/miss scenario', () => {
      const stats = responseCache.getStats();
      
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('destroy', () => {
    it('should clear cache and stop cleanup interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      responseCache.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(responseCache.cleanupInterval);
      expect(responseCache.cache.size).toBe(0);
    });
  });
});

describe('cacheMiddleware', () => {
  let app;
  let testRouter;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    testRouter = express.Router();
    testRouter.get('/test', cacheMiddleware, (req, res) => {
      res.json({ message: 'test response', timestamp: Date.now() });
    });
    testRouter.post('/complete', cacheMiddleware, (req, res) => {
      res.json({ result: req.body.input });
    });
    testRouter.post('/other', cacheMiddleware, (req, res) => {
      res.json({ data: 'not cached' });
    });
    
    app.use('/api', testRouter);
    
    // Clear cache before each test
    cache.clear();
    
    // Enable caching
    process.env.VITE_ENABLE_CACHE = 'true';
  });

  afterEach(() => {
    delete process.env.VITE_ENABLE_CACHE;
  });

  it('should cache GET requests', async () => {
    // First request - should not be cached
    const response1 = await request(app)
      .get('/api/test')
      .expect(200);
    
    expect(response1.body).toHaveProperty('message', 'test response');
    expect(response1.body).toHaveProperty('timestamp');
    
    const timestamp1 = response1.body.timestamp;
    
    // Second request - should be cached
    const response2 = await request(app)
      .get('/api/test')
      .expect(200);
    
    expect(response2.body.timestamp).toBe(timestamp1); // Same timestamp = cached
  });

  it('should cache specific POST endpoints', async () => {
    const response1 = await request(app)
      .post('/api/complete')
      .send({ input: 'test' })
      .expect(200);
    
    const response2 = await request(app)
      .post('/api/complete')
      .send({ input: 'test' })
      .expect(200);
    
    expect(response1.body).toEqual(response2.body);
    expect(cache.getStats().hits).toBe(1);
  });

  it('should not cache other POST endpoints', async () => {
    await request(app)
      .post('/api/other')
      .send({ data: 'test' })
      .expect(200);
    
    await request(app)
      .post('/api/other')
      .send({ data: 'test' })
      .expect(200);
    
    expect(cache.getStats().hits).toBe(0);
    expect(cache.getStats().misses).toBe(0);
  });

  it('should generate different cache keys for different requests', async () => {
    await request(app).get('/api/test?id=1').expect(200);
    await request(app).get('/api/test?id=2').expect(200);
    
    expect(cache.getStats().size).toBe(2);
    expect(cache.getStats().hits).toBe(0);
  });

  it('should not cache when caching is disabled', async () => {
    delete process.env.VITE_ENABLE_CACHE;
    
    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(200);
    
    expect(cache.getStats().size).toBe(0);
  });

  it('should not cache error responses', async () => {
    const errorRouter = express.Router();
    errorRouter.get('/error', cacheMiddleware, (req, res) => {
      res.status(500).json({ error: 'Server error' });
    });
    app.use('/api', errorRouter);
    
    await request(app).get('/api/error').expect(500);
    await request(app).get('/api/error').expect(500);
    
    expect(cache.getStats().size).toBe(0);
  });

  it('should not cache large responses', async () => {
    const largeRouter = express.Router();
    largeRouter.get('/large', cacheMiddleware, (req, res) => {
      const largeData = 'x'.repeat(100001); // > 100KB
      res.json({ data: largeData });
    });
    app.use('/api', largeRouter);
    
    await request(app).get('/api/large').expect(200);
    
    expect(cache.getStats().size).toBe(0);
  });

  it('should set cached flag in response locals', async () => {
    let cachedFlag;
    
    const flagRouter = express.Router();
    flagRouter.get('/flag', cacheMiddleware, (req, res) => {
      cachedFlag = res.locals.cached;
      res.json({ message: 'test' });
    });
    app.use('/api', flagRouter);
    
    // First request
    await request(app).get('/api/flag').expect(200);
    expect(cachedFlag).toBeUndefined();
    
    // Second request (cached)
    await request(app).get('/api/flag').expect(200);
    expect(cachedFlag).toBe(true);
  });
});

describe('cacheRoutes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/cache', cacheRoutes);
    cache.clear();
  });

  describe('GET /cache/stats', () => {
    it('should return cache statistics', async () => {
      // Add some test data
      await cache.set('test1', 'value1');
      await cache.set('test2', 'value2');
      await cache.get('test1');
      await cache.get('non-existent');
      
      const response = await request(app)
        .get('/cache/stats')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        data: {
          size: 2,
          maxSize: 1000,
          hits: 1,
          misses: 1,
          hitRate: '50.00%',
          ttl: 3600
        }
      });
    });
  });

  describe('DELETE /cache/clear', () => {
    it('should clear all cache entries', async () => {
      // Add test data
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      const response = await request(app)
        .delete('/cache/clear')
        .expect(200);
      
      expect(response.body).toEqual({
        success: true,
        message: 'Cleared 3 cache entries'
      });
      
      expect(cache.getStats().size).toBe(0);
    });
  });
});