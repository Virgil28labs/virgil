/**
 * Request Deduplication Tests
 * 
 * Tests the request deduplication utility including:
 * - Request deduplication with identical URLs and options
 * - Response cloning for multiple consumers
 * - Hash generation for request keys
 * - Cache size management and eviction
 * - Cleanup of expired requests
 * - Performance optimizations (periodic cleanup, numeric hashes)
 * - Memory leak prevention
 * - React hook functionality
 * - Edge cases and error handling
 * - Concurrent request handling
 */

import { renderHook } from '@testing-library/react';
import { requestDeduplicator, dedupeFetch, useRequestDeduplication } from '../requestDeduplication';
import { timeService } from '../../services/TimeService';

// Mock dependencies
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test helpers
const createMockResponse = (data: string, status = 200) => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    clone: jest.fn(),
    json: jest.fn().mockResolvedValue({ data }),
    text: jest.fn().mockResolvedValue(data),
  };
  response.clone.mockReturnValue({ ...response });
  return response;
};

describe('RequestDeduplicator', () => {
  const baseTimestamp = 1640995200000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getTimestamp.mockReturnValue(baseTimestamp);
    requestDeduplicator.clear();
    mockFetch.mockReset();
  });

  describe('Request deduplication', () => {
    it('should deduplicate identical requests', async () => {
      const mockResponse = createMockResponse('test data');
      mockFetch.mockResolvedValue(mockResponse);

      const url = 'https://api.example.com/data';
      
      // Make multiple simultaneous requests
      const promise1 = requestDeduplicator.dedupeFetch(url);
      const promise2 = requestDeduplicator.dedupeFetch(url);
      const promise3 = requestDeduplicator.dedupeFetch(url);

      const [response1, response2, response3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // Should only make one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(url, undefined);

      // All responses should be valid (cloned)
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(response3).toBeDefined();

      // Should have cloned responses for subsequent requests
      expect(mockResponse.clone).toHaveBeenCalledTimes(2); // 2 clones for requests 2 and 3
    });

    it('should handle different URLs as separate requests', async () => {
      const mockResponse1 = createMockResponse('data1');
      const mockResponse2 = createMockResponse('data2');
      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const url1 = 'https://api.example.com/data1';
      const url2 = 'https://api.example.com/data2';

      const [response1, response2] = await Promise.all([
        requestDeduplicator.dedupeFetch(url1),
        requestDeduplicator.dedupeFetch(url2),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, url1, undefined);
      expect(mockFetch).toHaveBeenNthCalledWith(2, url2, undefined);
      
      expect(response1).toBe(mockResponse1);
      expect(response2).toBe(mockResponse2);
    });

    it('should handle different HTTP methods as separate requests', async () => {
      const mockGetResponse = createMockResponse('get data');
      const mockPostResponse = createMockResponse('post data');
      mockFetch.mockResolvedValueOnce(mockGetResponse).mockResolvedValueOnce(mockPostResponse);

      const url = 'https://api.example.com/data';
      const getOptions = { method: 'GET' };
      const postOptions = { method: 'POST' };

      const [getResponse, postResponse] = await Promise.all([
        requestDeduplicator.dedupeFetch(url, getOptions),
        requestDeduplicator.dedupeFetch(url, postOptions),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, url, getOptions);
      expect(mockFetch).toHaveBeenNthCalledWith(2, url, postOptions);
      
      expect(getResponse).toBe(mockGetResponse);
      expect(postResponse).toBe(mockPostResponse);
    });

    it('should handle different request bodies as separate requests', async () => {
      const mockResponse1 = createMockResponse('response1');
      const mockResponse2 = createMockResponse('response2');
      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const url = 'https://api.example.com/data';
      const options1 = { method: 'POST', body: 'data1' };
      const options2 = { method: 'POST', body: 'data2' };

      const [response1, response2] = await Promise.all([
        requestDeduplicator.dedupeFetch(url, options1),
        requestDeduplicator.dedupeFetch(url, options2),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response1).toBe(mockResponse1);
      expect(response2).toBe(mockResponse2);
    });
  });

  describe('Hash generation', () => {
    it('should create consistent hashes for identical requests', async () => {
      // Access private method via any for testing
      const deduplicator = requestDeduplicator as any;
      
      const url = 'https://api.example.com/data';
      const options = { method: 'POST', body: 'test' };

      const hash1 = deduplicator.createHash(url, options);
      const hash2 = deduplicator.createHash(url, options);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
    });

    it('should create different hashes for different requests', async () => {
      const deduplicator = requestDeduplicator as any;
      
      const hash1 = deduplicator.createHash('https://api.example.com/data1');
      const hash2 = deduplicator.createHash('https://api.example.com/data2');
      const hash3 = deduplicator.createHash('https://api.example.com/data1', { method: 'POST' });

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it('should handle empty and undefined options', async () => {
      const deduplicator = requestDeduplicator as any;
      
      const url = 'https://api.example.com/data';
      const hash1 = deduplicator.createHash(url);
      const hash2 = deduplicator.createHash(url, {});
      const hash3 = deduplicator.createHash(url, undefined);

      // Should produce the same hash for all (defaults to GET with empty body)
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });
  });

  describe('Cache management', () => {
    it('should track pending request count', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      expect(requestDeduplicator.getPendingCount()).toBe(0);

      const promise1 = requestDeduplicator.dedupeFetch('https://api.example.com/data1');
      expect(requestDeduplicator.getPendingCount()).toBe(1);

      const promise2 = requestDeduplicator.dedupeFetch('https://api.example.com/data2');
      expect(requestDeduplicator.getPendingCount()).toBe(2);

      // Complete requests
      mockFetch.mockResolvedValue(createMockResponse('test'));
      await Promise.all([promise1, promise2]);

      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });

    it('should evict oldest entries when cache size limit is reached', async () => {
      const deduplicator = requestDeduplicator as any;
      const maxCacheSize = deduplicator.maxCacheSize;

      // Mock responses that never resolve to keep requests in cache
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Fill cache to limit
      const promises = [];
      for (let i = 0; i < maxCacheSize; i++) {
        promises.push(requestDeduplicator.dedupeFetch(`https://api.example.com/data${i}`));
      }

      expect(requestDeduplicator.getPendingCount()).toBe(maxCacheSize);

      // Add one more request - should evict oldest
      requestDeduplicator.dedupeFetch('https://api.example.com/overflow');
      
      expect(requestDeduplicator.getPendingCount()).toBe(maxCacheSize);
    });

    it('should clear all pending requests', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      requestDeduplicator.dedupeFetch('https://api.example.com/data1');
      requestDeduplicator.dedupeFetch('https://api.example.com/data2');

      expect(requestDeduplicator.getPendingCount()).toBe(2);

      requestDeduplicator.clear();

      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });
  });

  describe('Cleanup and expiration', () => {
    it('should clean up expired requests', async () => {
      const deduplicator = requestDeduplicator as any;
      const maxAge = deduplicator.maxAge;
      const cleanupInterval = deduplicator.cleanupInterval;

      // Mock requests that never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Make initial request
      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp);
      requestDeduplicator.dedupeFetch('https://api.example.com/data1');
      expect(requestDeduplicator.getPendingCount()).toBe(1);

      // Advance time past maxAge but not past cleanup interval
      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp + maxAge + 1000);
      requestDeduplicator.dedupeFetch('https://api.example.com/data2'); // Should not trigger cleanup
      expect(requestDeduplicator.getPendingCount()).toBe(2);

      // Advance time past cleanup interval
      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp + cleanupInterval + 1000);
      requestDeduplicator.dedupeFetch('https://api.example.com/data3'); // Should trigger cleanup

      // First request should be cleaned up, others should remain
      expect(requestDeduplicator.getPendingCount()).toBe(2);
    });

    it('should not clean up requests within maxAge', async () => {
      const deduplicator = requestDeduplicator as any;
      const maxAge = deduplicator.maxAge;
      const cleanupInterval = deduplicator.cleanupInterval;

      mockFetch.mockImplementation(() => new Promise(() => {}));

      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp);
      requestDeduplicator.dedupeFetch('https://api.example.com/data1');

      // Advance time but stay within maxAge
      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp + maxAge - 1000);
      requestDeduplicator.dedupeFetch('https://api.example.com/data2');

      // Force cleanup by advancing past cleanup interval
      mockTimeService.getTimestamp.mockReturnValue(baseTimestamp + cleanupInterval + 1000);
      requestDeduplicator.dedupeFetch('https://api.example.com/data3');

      // All requests should still be present (none expired)
      expect(requestDeduplicator.getPendingCount()).toBe(3);
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors correctly', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(
        requestDeduplicator.dedupeFetch('https://api.example.com/error'),
      ).rejects.toThrow('Network error');

      // Request should be removed from cache after error
      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });

    it('should handle multiple consumers of failed requests', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      const url = 'https://api.example.com/error';
      const promise1 = requestDeduplicator.dedupeFetch(url);
      const promise2 = requestDeduplicator.dedupeFetch(url);

      await expect(promise1).rejects.toThrow('Network error');
      await expect(promise2).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });

    it('should handle response cloning errors', async () => {
      const mockResponse = createMockResponse('test data');
      mockResponse.clone.mockImplementation(() => {
        throw new Error('Clone error');
      });
      mockFetch.mockResolvedValue(mockResponse);

      const url = 'https://api.example.com/data';
      const promise1 = requestDeduplicator.dedupeFetch(url);
      const promise2 = requestDeduplicator.dedupeFetch(url);

      const response1 = await promise1; // Should succeed (original response)
      expect(response1).toBe(mockResponse);

      await expect(promise2).rejects.toThrow('Clone error'); // Should fail (clone error)
    });
  });

  describe('Concurrent requests', () => {
    it('should handle many concurrent identical requests', async () => {
      const mockResponse = createMockResponse('test data');
      mockFetch.mockResolvedValue(mockResponse);

      const url = 'https://api.example.com/data';
      const concurrentRequests = 100;

      const promises = Array.from({ length: concurrentRequests }, () =>
        requestDeduplicator.dedupeFetch(url),
      );

      const responses = await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(responses).toHaveLength(concurrentRequests);
      expect(mockResponse.clone).toHaveBeenCalledTimes(concurrentRequests - 1);
    });

    it('should handle mixed concurrent requests', async () => {
      const mockResponse1 = createMockResponse('response1');
      const mockResponse2 = createMockResponse('response2');
      mockFetch.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const promises = [
        requestDeduplicator.dedupeFetch('https://api.example.com/data1'),
        requestDeduplicator.dedupeFetch('https://api.example.com/data1'), // Duplicate
        requestDeduplicator.dedupeFetch('https://api.example.com/data2'),
        requestDeduplicator.dedupeFetch('https://api.example.com/data2'), // Duplicate
        requestDeduplicator.dedupeFetch('https://api.example.com/data1'), // Another duplicate
      ];

      const responses = await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(2); // Only unique requests
      expect(responses).toHaveLength(5);
      
      // Check responses match expected values
      expect(responses[0]).toBe(mockResponse1);
      expect(responses[2]).toBe(mockResponse2);
      
      // Check cloning occurred for duplicates
      expect(mockResponse1.clone).toHaveBeenCalledTimes(2); // Requests 1 and 4
      expect(mockResponse2.clone).toHaveBeenCalledTimes(1); // Request 3
    });
  });

  describe('Memory management', () => {
    it('should prevent memory leaks by cleaning up completed requests', async () => {
      const mockResponse = createMockResponse('test data');
      mockFetch.mockResolvedValue(mockResponse);

      // Make request and wait for completion
      await requestDeduplicator.dedupeFetch('https://api.example.com/data');

      // Request should be removed from cache after completion
      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });

    it('should handle cache size limits under heavy load', async () => {
      const deduplicator = requestDeduplicator as any;
      const maxCacheSize = deduplicator.maxCacheSize;

      // Create slow responses to keep requests in cache
      mockFetch.mockImplementation(url => 
        new Promise(resolve => 
          setTimeout(() => resolve(createMockResponse(`response for ${url}`)), 100),
        ),
      );

      // Exceed cache size limit
      const promises = [];
      for (let i = 0; i < maxCacheSize + 10; i++) {
        promises.push(requestDeduplicator.dedupeFetch(`https://api.example.com/data${i}`));
      }

      // Cache should never exceed limit
      expect(requestDeduplicator.getPendingCount()).toBeLessThanOrEqual(maxCacheSize);

      // Complete all requests
      await Promise.all(promises);
      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });
  });
});

describe('dedupeFetch convenience function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getTimestamp.mockReturnValue(1640995200000);
    requestDeduplicator.clear();
  });

  it('should work as a convenience wrapper', async () => {
    const mockResponse = createMockResponse('test data');
    mockFetch.mockResolvedValue(mockResponse);

    const response = await dedupeFetch('https://api.example.com/data');

    expect(response).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);
  });

  it('should deduplicate requests when used directly', async () => {
    const mockResponse = createMockResponse('test data');
    mockFetch.mockResolvedValue(mockResponse);

    const url = 'https://api.example.com/data';
    const [response1, response2] = await Promise.all([
      dedupeFetch(url),
      dedupeFetch(url),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(response1).toBe(mockResponse);
    expect(response2).toBeDefined();
    expect(mockResponse.clone).toHaveBeenCalledTimes(1);
  });
});

describe('useRequestDeduplication React hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getTimestamp.mockReturnValue(1640995200000);
    requestDeduplicator.clear();
  });

  it('should provide deduplication functionality', () => {
    const { result } = renderHook(() => useRequestDeduplication());

    expect(result.current.dedupeFetch).toBe(dedupeFetch);
    expect(typeof result.current.getPendingCount).toBe('function');
    expect(typeof result.current.clear).toBe('function');
  });

  it('should provide current pending count', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

    const { result } = renderHook(() => useRequestDeduplication());

    expect(result.current.getPendingCount()).toBe(0);

    result.current.dedupeFetch('https://api.example.com/data');
    
    expect(result.current.getPendingCount()).toBe(1);
  });

  it('should allow clearing pending requests', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

    const { result } = renderHook(() => useRequestDeduplication());

    result.current.dedupeFetch('https://api.example.com/data1');
    result.current.dedupeFetch('https://api.example.com/data2');
    
    expect(result.current.getPendingCount()).toBe(2);

    result.current.clear();
    
    expect(result.current.getPendingCount()).toBe(0);
  });

  it('should work with async operations', async () => {
    const mockResponse = createMockResponse('hook data');
    mockFetch.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRequestDeduplication());

    const response = await result.current.dedupeFetch('https://api.example.com/hook-test');

    expect(response).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/hook-test', undefined);
  });
});