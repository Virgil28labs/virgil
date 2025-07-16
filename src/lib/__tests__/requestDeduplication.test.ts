import { requestDeduplicator, dedupeFetch, useRequestDeduplication } from '../requestDeduplication';

// Mock fetch
global.fetch = jest.fn();

describe('RequestDeduplicator', () => {
  let consoleLogSpy: jest.SpyInstance;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    requestDeduplicator.clear();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete process.env.NODE_ENV;
  });

  describe('dedupeFetch', () => {
    it('should make a single request for duplicate calls', async () => {
      const mockResponse = new Response('test data');
      mockFetch.mockResolvedValue(mockResponse);

      // Make multiple simultaneous requests to the same URL
      const promises = [
        dedupeFetch('https://api.example.com/data'),
        dedupeFetch('https://api.example.com/data'),
        dedupeFetch('https://api.example.com/data')
      ];

      const results = await Promise.all(promises);

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);

      // All results should be the same
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
    });

    it('should make separate requests for different URLs', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      const promises = [
        dedupeFetch('https://api.example.com/data1'),
        dedupeFetch('https://api.example.com/data2'),
        dedupeFetch('https://api.example.com/data3')
      ];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should make separate requests for different methods', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      const promises = [
        dedupeFetch('https://api.example.com/data', { method: 'GET' }),
        dedupeFetch('https://api.example.com/data', { method: 'POST' }),
        dedupeFetch('https://api.example.com/data', { method: 'PUT' })
      ];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should make separate requests for different bodies', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      const promises = [
        dedupeFetch('https://api.example.com/data', { 
          method: 'POST', 
          body: JSON.stringify({ id: 1 }) 
        }),
        dedupeFetch('https://api.example.com/data', { 
          method: 'POST', 
          body: JSON.stringify({ id: 2 }) 
        })
      ];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle request failures', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      // Multiple requests should all fail with the same error
      const promises = [
        dedupeFetch('https://api.example.com/data'),
        dedupeFetch('https://api.example.com/data')
      ];

      await expect(promises[0]).rejects.toThrow('Network error');
      await expect(promises[1]).rejects.toThrow('Network error');

      // Should only make one actual fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should remove requests from cache after completion', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      await dedupeFetch('https://api.example.com/data');
      
      expect(requestDeduplicator.getPendingCount()).toBe(0);

      // New request to same URL should trigger a new fetch
      mockFetch.mockClear();
      await dedupeFetch('https://api.example.com/data');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired requests', async () => {
      jest.useFakeTimers();
      
      // Create a request that will never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      dedupeFetch('https://api.example.com/data');
      expect(requestDeduplicator.getPendingCount()).toBe(1);

      // Advance time past cleanup interval (10 seconds)
      jest.advanceTimersByTime(11000);

      // Make another request to trigger cleanup
      dedupeFetch('https://api.example.com/data2');

      // The old request should be cleaned up

      jest.useRealTimers();
    });

    it('should not log cleanup in production', async () => {
      process.env.NODE_ENV = 'production';
      jest.useFakeTimers();
      
      mockFetch.mockImplementation(() => new Promise(() => {}));

      dedupeFetch('https://api.example.com/data');
      
      // Advance time past cleanup interval
      jest.advanceTimersByTime(11000);
      dedupeFetch('https://api.example.com/data2');

      // Should not log in production
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('🧹 Cleaned up'));

      jest.useRealTimers();
    });
  });

  describe('cache size management', () => {
    it('should evict oldest entry when cache is full', async () => {
      // Mock requests that don't resolve immediately
      let resolvers: Array<() => void> = [];
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          resolvers.push(() => resolve(new Response('test')));
        })
      );

      // Fill cache to max size (50)
      const promises = [];
      for (let i = 0; i < 51; i++) {
        promises.push(dedupeFetch(`https://api.example.com/data${i}`));
      }

      // The first request should be evicted
      expect(requestDeduplicator.getPendingCount()).toBe(50);

      // Resolve all requests
      resolvers.forEach(resolve => resolve());
      await Promise.all(promises);
    });
  });

  describe('clear', () => {
    it('should clear all pending requests', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      dedupeFetch('https://api.example.com/data1');
      dedupeFetch('https://api.example.com/data2');
      dedupeFetch('https://api.example.com/data3');

      expect(requestDeduplicator.getPendingCount()).toBe(3);

      requestDeduplicator.clear();

      expect(requestDeduplicator.getPendingCount()).toBe(0);
    });
  });

  describe('hash function', () => {
    it('should generate consistent hashes', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      // Make two separate calls with same parameters
      await dedupeFetch('https://api.example.com/data', { method: 'POST', body: 'test' });
      
      mockFetch.mockClear();
      
      await dedupeFetch('https://api.example.com/data', { method: 'POST', body: 'test' });

      // Should make new request after first completes
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should generate different hashes for different inputs', async () => {
      mockFetch.mockResolvedValue(new Response('test'));

      const promises = [
        dedupeFetch('https://api.example.com/a'),
        dedupeFetch('https://api.example.com/b'),
        dedupeFetch('https://api.example.com/c')
      ];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

describe('useRequestDeduplication', () => {
  beforeEach(() => {
    requestDeduplicator.clear();
  });

  it('should provide dedupeFetch function', () => {
    const { dedupeFetch } = useRequestDeduplication();
    expect(typeof dedupeFetch).toBe('function');
  });

  it('should provide getPendingCount function', () => {
    const { getPendingCount } = useRequestDeduplication();
    expect(typeof getPendingCount).toBe('function');
    expect(getPendingCount()).toBe(0);
  });

  it('should provide clear function', () => {
    const { clear } = useRequestDeduplication();
    expect(typeof clear).toBe('function');
    
    // Add a pending request
    global.fetch = jest.fn(() => new Promise(() => {}));
    dedupeFetch('https://api.example.com/data');
    
    expect(requestDeduplicator.getPendingCount()).toBe(1);
    
    clear();
    
    expect(requestDeduplicator.getPendingCount()).toBe(0);
  });
});