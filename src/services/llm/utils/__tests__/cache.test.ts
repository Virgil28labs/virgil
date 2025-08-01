/**
 * ResponseCache Test Suite
 * 
 * Tests LLM response caching with TTL, LRU eviction, and statistics.
 * Critical for performance optimization and reducing API calls.
 */

import { ResponseCache } from '../cache';
import { timeService } from '../../../TimeService';
import type { MockGlobal } from '../../../../test-utils/mockTypes';

// Mock the TimeService
jest.mock('../../../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));

describe('ResponseCache', () => {
  let cache: ResponseCache;
  const mockTimeService = timeService as jest.Mocked<typeof timeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set initial timestamp (January 20, 2024, 12:00:00 UTC)
    let currentTime = 1705748400000;
    mockTimeService.getTimestamp.mockImplementation(() => currentTime);
    
    // Helper to advance time in tests
    (global as MockGlobal).advanceTime = (ms: number) => {
      currentTime += ms;
    };
    
    // Create fresh cache instance
    cache = new ResponseCache({
      ttl: 300, // 5 minutes
      maxSize: 3, // Small size for testing LRU
    });
  });

  afterEach(() => {
    cache.destroy();
    delete (global as MockGlobal).advanceTime;
  });

  describe('Constructor and Configuration', () => {
    it('uses default options when none provided', () => {
      const defaultCache = new ResponseCache();
      const stats = defaultCache.getStats();
      
      expect(stats.maxSize).toBe(100);
      expect(stats.ttl).toBe(3600);
      expect(stats.size).toBe(0);
      
      defaultCache.destroy();
    });

    it('uses provided options', () => {
      const customCache = new ResponseCache({
        ttl: 600,
        maxSize: 50,
      });
      
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(50);
      expect(stats.ttl).toBe(600);
      
      customCache.destroy();
    });
  });

  describe('Key Generation', () => {
    it('generates consistent keys for same data', () => {
      const data = { messages: [{ role: 'user', content: 'test' }] };
      
      const key1 = cache.generateKey(data);
      const key2 = cache.generateKey(data);
      
      expect(key1).toBe(key2);
    });

    it('generates different keys for different data', () => {
      const data1 = { messages: [{ role: 'user', content: 'test1' }] };
      const data2 = { messages: [{ role: 'user', content: 'test2' }] };
      
      const key1 = cache.generateKey(data1);
      const key2 = cache.generateKey(data2);
      
      expect(key1).not.toBe(key2);
    });

    it('handles various data types', () => {
      expect(() => cache.generateKey('string')).not.toThrow();
      expect(() => cache.generateKey(123)).not.toThrow();
      expect(() => cache.generateKey({ nested: { data: true } })).not.toThrow();
      expect(() => cache.generateKey([1, 2, 3])).not.toThrow();
    });
  });

  describe('Cache Operations', () => {
    it('stores and retrieves values', async () => {
      const key = 'test-key';
      const value = { response: 'Hello World' };
      
      await cache.set(key, value);
      const retrieved = await cache.get(key);
      
      expect(retrieved).toEqual(value);
    });

    it('returns null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('updates existing values', async () => {
      const key = 'update-test';
      const value1 = { response: 'First' };
      const value2 = { response: 'Second' };
      
      await cache.set(key, value1);
      await cache.set(key, value2);
      
      const retrieved = await cache.get(key);
      expect(retrieved).toEqual(value2);
    });

    it('handles different value types', async () => {
      // Test within cache size limit (3)
      await cache.set('string', 'test string');
      await cache.set('number', 42);
      await cache.set('boolean', true);
      
      expect(await cache.get('string')).toBe('test string');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('expires entries after TTL', async () => {
      const key = 'expire-test';
      const value = { data: 'expires' };
      
      await cache.set(key, value, 1); // 1 second TTL
      
      // Should be available immediately
      expect(await cache.get(key)).toEqual(value);
      
      // Advance time by 2 seconds
      (global as MockGlobal).advanceTime(2000);
      
      // Should be expired
      expect(await cache.get(key)).toBeNull();
    });

    it('uses custom TTL per entry', async () => {
      const shortKey = 'short-ttl';
      const longKey = 'long-ttl';
      
      await cache.set(shortKey, 'short', 1); // 1 second
      await cache.set(longKey, 'long', 10); // 10 seconds
      
      // Advance time by 2 seconds
      (global as MockGlobal).advanceTime(2000);
      
      expect(await cache.get(shortKey)).toBeNull();
      expect(await cache.get(longKey)).toBe('long');
    });

    it('uses default TTL when not specified', async () => {
      const key = 'default-ttl';
      await cache.set(key, 'value'); // Uses cache default (300s)
      
      // Should still be valid after 200 seconds
      (global as MockGlobal).advanceTime(200000);
      expect(await cache.get(key)).toBe('value');
      
      // Should expire after 400 seconds total
      (global as MockGlobal).advanceTime(200000);
      expect(await cache.get(key)).toBeNull();
    });
  });

  describe('LRU Eviction', () => {
    it('evicts entries when cache is full', async () => {
      // Fill cache to max size (3)
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      expect(cache.getStats().size).toBe(3);
      
      // Add key4, should evict one entry
      await cache.set('key4', 'value4');
      
      expect(cache.getStats().size).toBe(3); // Still at max size
      expect(await cache.get('key4')).toBe('value4'); // New entry exists
    });

    it('tracks access order correctly', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      // Access key1
      await cache.get('key1');
      
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
    });

    it('does not evict when updating existing entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      // Update existing entry - should not trigger eviction
      await cache.set('key2', 'updated');
      
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('updated');
      expect(await cache.get('key3')).toBe('value3');
    });
  });

  describe('Statistics', () => {
    it('tracks hits and misses correctly', async () => {
      await cache.set('key1', 'value1');
      
      // Hit
      await cache.get('key1');
      
      // Miss
      await cache.get('nonexistent');
      
      // Another hit
      await cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('counts expired entries as misses', async () => {
      await cache.set('key1', 'value1', 1); // 1 second TTL
      
      // Hit before expiration
      await cache.get('key1');
      
      // Advance time to expire entry
      (global as MockGlobal).advanceTime(2000);
      
      // Should count as miss
      await cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('calculates hit rate correctly', async () => {
      // No operations yet
      expect(cache.getStats().hitRate).toBe('0%');
      
      await cache.set('key1', 'value1');
      
      // 100% hit rate
      await cache.get('key1');
      expect(cache.getStats().hitRate).toBe('100.00%');
      
      // 50% hit rate
      await cache.get('nonexistent');
      expect(cache.getStats().hitRate).toBe('50.00%');
    });

    it('tracks cache size correctly', async () => {
      expect(cache.getStats().size).toBe(0);
      
      await cache.set('key1', 'value1');
      expect(cache.getStats().size).toBe(1);
      
      await cache.set('key2', 'value2');
      expect(cache.getStats().size).toBe(2);
      
      // Update existing (should not increase size)
      await cache.set('key1', 'updated');
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('clears all entries and resets stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const clearedCount = cache.clear();
      
      expect(clearedCount).toBe(2);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('removes only expired entries during cleanup', async () => {
      await cache.set('short', 'value1', 1); // 1 second TTL
      await cache.set('long', 'value2', 10); // 10 second TTL
      await cache.set('default', 'value3'); // Default TTL
      
      // Advance time to expire only short entry
      (global as MockGlobal).advanceTime(2000);
      
      const cleanedCount = cache.cleanup();
      
      expect(cleanedCount).toBe(1);
      expect(await cache.get('short')).toBeNull();
      expect(await cache.get('long')).toBe('value2');
      expect(await cache.get('default')).toBe('value3');
    });

    it('returns count of cleaned entries', async () => {
      await cache.set('expire1', 'value1', 1);
      await cache.set('expire2', 'value2', 1);
      await cache.set('keep', 'value3', 10);
      
      (global as MockGlobal).advanceTime(2000);
      
      const cleanedCount = cache.cleanup();
      expect(cleanedCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cache operations gracefully', async () => {
      // Fresh cache should have zero stats
      let stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      // This get should record a miss
      expect(await cache.get('any-key')).toBeNull();
      
      // Check that miss was recorded before clearing
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      
      // Operations on empty cache should return 0
      expect(cache.clear()).toBe(0);
      expect(cache.cleanup()).toBe(0);
      
      // After clear, stats should be reset
      stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0); // clear() resets all stats
    });

    it('handles null and undefined values', async () => {
      await cache.set('null-value', null);
      await cache.set('undefined-value', undefined);
      
      expect(await cache.get('null-value')).toBeNull();
      expect(await cache.get('undefined-value')).toBeUndefined();
    });

    it('handles very large objects', async () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        nested: {
          array: new Array(1000).fill('item'),
        },
      };
      
      await cache.set('large', largeObject);
      const retrieved = await cache.get('large');
      
      expect(retrieved).toEqual(largeObject);
    });

    it('handles zero TTL correctly', async () => {
      await cache.set('zero-ttl', 'value', 0);
      
      // With zero TTL, entry expires immediately (expiresAt = now + 0)
      // Advance time slightly to ensure expiration
      (global as MockGlobal).advanceTime(1);
      
      expect(await cache.get('zero-ttl')).toBeNull();
    });

    it('destroys cache cleanly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.destroy();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});