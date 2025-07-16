import { ResponseCache } from './cache'

describe('ResponseCache', () => {
  let cache: ResponseCache

  beforeEach(() => {
    jest.useFakeTimers()
    cache = new ResponseCache()
  })

  afterEach(() => {
    jest.useRealTimers()
    cache.destroy()
  })

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const stats = cache.getStats()
      expect(stats.ttl).toBe(3600)
      expect(stats.maxSize).toBe(100)
      expect(stats.size).toBe(0)
    })

    it('should create cache with custom options', () => {
      const customCache = new ResponseCache({ ttl: 1800, maxSize: 50 })
      const stats = customCache.getStats()
      expect(stats.ttl).toBe(1800)
      expect(stats.maxSize).toBe(50)
    })
  })

  describe('generateKey', () => {
    it('should generate key from object', () => {
      const key = cache.generateKey({ a: 1, b: 'test' })
      expect(key).toBe('{"a":1,"b":"test"}')
    })

    it('should generate key from string', () => {
      const key = cache.generateKey('test')
      expect(key).toBe('"test"')
    })

    it('should generate key from number', () => {
      const key = cache.generateKey(123)
      expect(key).toBe('123')
    })

    it('should generate key from array', () => {
      const key = cache.generateKey([1, 2, 3])
      expect(key).toBe('[1,2,3]')
    })

    it('should generate consistent keys for same data', () => {
      const key1 = cache.generateKey({ a: 1, b: 2 })
      const key2 = cache.generateKey({ a: 1, b: 2 })
      expect(key1).toBe(key2)
    })
  })

  describe('get and set', () => {
    it('should store and retrieve value', async () => {
      await cache.set('key1', 'value1')
      const value = await cache.get('key1')
      expect(value).toBe('value1')
    })

    it('should return null for non-existent key', async () => {
      const value = await cache.get('nonexistent')
      expect(value).toBeNull()
    })

    it('should store complex objects', async () => {
      const complexObject = { 
        name: 'test', 
        data: [1, 2, 3], 
        nested: { a: 1, b: 2 } 
      }
      await cache.set('complex', complexObject)
      const retrieved = await cache.get('complex')
      expect(retrieved).toEqual(complexObject)
    })

    it('should update existing value', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key1', 'value2')
      const value = await cache.get('key1')
      expect(value).toBe('value2')
    })

    it('should use custom TTL', async () => {
      await cache.set('key1', 'value1', 60) // 60 seconds
      
      // Should still be available after 30 seconds
      jest.advanceTimersByTime(30 * 1000)
      let value = await cache.get('key1')
      expect(value).toBe('value1')
      
      // Should be expired after 61 seconds
      jest.advanceTimersByTime(31 * 1000)
      value = await cache.get('key1')
      expect(value).toBeNull()
    })
  })

  describe('expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1')
      
      // Should be available before expiration
      let value = await cache.get('key1')
      expect(value).toBe('value1')
      
      // Advance time past TTL
      jest.advanceTimersByTime(3601 * 1000) // 1 hour + 1 second
      
      value = await cache.get('key1')
      expect(value).toBeNull()
    })

    it('should clean up expired entries on access', async () => {
      await cache.set('key1', 'value1')
      
      // Advance time past TTL
      jest.advanceTimersByTime(3601 * 1000)
      
      // Access should trigger cleanup
      await cache.get('key1')
      
      const stats = cache.getStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used item when cache is full', async () => {
      const smallCache = new ResponseCache({ maxSize: 3 })
      
      // Fill cache
      await smallCache.set('key1', 'value1')
      await smallCache.set('key2', 'value2')
      await smallCache.set('key3', 'value3')
      
      // Access key1 and key2 to make them more recent
      jest.advanceTimersByTime(100)
      await smallCache.get('key1')
      jest.advanceTimersByTime(100)
      await smallCache.get('key2')
      
      // Add new item - should evict key3
      await smallCache.set('key4', 'value4')
      
      // key3 should be evicted
      const value3 = await smallCache.get('key3')
      expect(value3).toBeNull()
      
      // Others should still exist
      expect(await smallCache.get('key1')).toBe('value1')
      expect(await smallCache.get('key2')).toBe('value2')
      expect(await smallCache.get('key4')).toBe('value4')
    })

    it('should not evict when updating existing key', async () => {
      const smallCache = new ResponseCache({ maxSize: 2 })
      
      await smallCache.set('key1', 'value1')
      await smallCache.set('key2', 'value2')
      
      // Update existing key - should not trigger eviction
      await smallCache.set('key1', 'newValue1')
      
      expect(await smallCache.get('key1')).toBe('newValue1')
      expect(await smallCache.get('key2')).toBe('value2')
    })
  })

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1')
      
      // Hit
      await cache.get('key1')
      
      // Misses
      await cache.get('nonexistent1')
      await cache.get('nonexistent2')
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(2)
      expect(stats.hitRate).toBe('33.33%')
    })

    it('should handle zero hit rate', () => {
      const stats = cache.getStats()
      expect(stats.hitRate).toBe('0%')
    })

    it('should reset stats on clear', async () => {
      await cache.set('key1', 'value1')
      await cache.get('key1')
      await cache.get('nonexistent')
      
      cache.clear()
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  describe('clear', () => {
    it('should remove all entries', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')
      
      const cleared = cache.clear()
      expect(cleared).toBe(3)
      
      const stats = cache.getStats()
      expect(stats.size).toBe(0)
      
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBeNull()
    })

    it('should return 0 when clearing empty cache', () => {
      const cleared = cache.clear()
      expect(cleared).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      await cache.set('key1', 'value1', 60) // expires in 60s
      await cache.set('key2', 'value2', 120) // expires in 120s
      await cache.set('key3', 'value3', 180) // expires in 180s
      
      // Advance time to expire first entry
      jest.advanceTimersByTime(61 * 1000)
      
      const cleaned = cache.cleanup()
      expect(cleaned).toBe(1)
      
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBe('value2')
      expect(await cache.get('key3')).toBe('value3')
    })

    it('should remove multiple expired entries', async () => {
      await cache.set('key1', 'value1', 60)
      await cache.set('key2', 'value2', 60)
      await cache.set('key3', 'value3', 120)
      
      jest.advanceTimersByTime(61 * 1000)
      
      const cleaned = cache.cleanup()
      expect(cleaned).toBe(2)
      
      const stats = cache.getStats()
      expect(stats.size).toBe(1)
    })

    it('should return 0 when no entries are expired', async () => {
      await cache.set('key1', 'value1')
      
      const cleaned = cache.cleanup()
      expect(cleaned).toBe(0)
    })
  })

  describe('destroy', () => {
    it('should clear all data', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      
      cache.destroy()
      
      const stats = cache.getStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle circular references in generateKey', () => {
      const obj: any = { a: 1 }
      obj.self = obj
      
      expect(() => cache.generateKey(obj)).toThrow()
    })

    it('should handle concurrent access', async () => {
      const promises = []
      
      // Set values concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`))
      }
      
      await Promise.all(promises)
      
      // Get values concurrently
      const getPromises = []
      for (let i = 0; i < 10; i++) {
        getPromises.push(cache.get(`key${i}`))
      }
      
      const values = await Promise.all(getPromises)
      
      values.forEach((value, i) => {
        expect(value).toBe(`value${i}`)
      })
    })

    it('should handle very large cache size', async () => {
      const largeCache = new ResponseCache({ maxSize: 1000 })
      
      // Add many items
      for (let i = 0; i < 100; i++) {
        await largeCache.set(`key${i}`, `value${i}`)
      }
      
      const stats = largeCache.getStats()
      expect(stats.size).toBe(100)
    })

    it('should update access time on successful get', async () => {
      const smallCache = new ResponseCache({ maxSize: 2 })
      
      await smallCache.set('key1', 'value1')
      jest.advanceTimersByTime(1000)
      await smallCache.set('key2', 'value2')
      
      // Access key1 to update its access time
      jest.advanceTimersByTime(1000)
      await smallCache.get('key1')
      
      // Add new item - should evict key2 (older access time)
      await smallCache.set('key3', 'value3')
      
      expect(await smallCache.get('key1')).toBe('value1')
      expect(await smallCache.get('key2')).toBeNull()
      expect(await smallCache.get('key3')).toBe('value3')
    })
  })
})