const { RequestQueue, PriorityQueue } = require('../queue');

describe('RequestQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new RequestQueue({
      maxConcurrent: 2,
      timeout: 1000,
      retryAttempts: 2,
      retryDelay: 100
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultQueue = new RequestQueue();
      
      expect(defaultQueue.maxConcurrent).toBe(10);
      expect(defaultQueue.timeout).toBe(30000);
      expect(defaultQueue.retryAttempts).toBe(3);
      expect(defaultQueue.retryDelay).toBe(1000);
      expect(defaultQueue.queue).toEqual([]);
      expect(defaultQueue.active).toBe(0);
      expect(defaultQueue.processed).toBe(0);
      expect(defaultQueue.errors).toBe(0);
    });

    it('should initialize with custom options', () => {
      expect(queue.maxConcurrent).toBe(2);
      expect(queue.timeout).toBe(1000);
      expect(queue.retryAttempts).toBe(2);
      expect(queue.retryDelay).toBe(100);
    });
  });

  describe('add', () => {
    it('should add request to queue and process it', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      const promise = queue.add(fn);
      
      // Let the event loop process
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(queue.processed).toBe(1);
    });

    it('should emit enqueue event when adding request', async () => {
      const enqueueSpy = jest.fn();
      queue.on('enqueue', enqueueSpy);
      
      const fn = jest.fn().mockResolvedValue('result');
      queue.add(fn);
      
      expect(enqueueSpy).toHaveBeenCalledWith({
        queueLength: 1,
        active: 0
      });
    });

    it('should handle priority ordering', async () => {
      const results = [];
      const fn1 = jest.fn().mockImplementation(() => {
        results.push('low');
        return Promise.resolve('low');
      });
      const fn2 = jest.fn().mockImplementation(() => {
        results.push('high');
        return Promise.resolve('high');
      });
      const fn3 = jest.fn().mockImplementation(() => {
        results.push('normal');
        return Promise.resolve('normal');
      });
      
      // Add with different priorities
      queue.add(fn1, { priority: 1 }); // low
      queue.add(fn2, { priority: 10 }); // high
      queue.add(fn3, { priority: 5 }); // normal
      
      await jest.runAllTimersAsync();
      await queue.drain();
      
      // Should process in priority order
      expect(results).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('process', () => {
    it('should respect maxConcurrent limit', async () => {
      let activeCount = 0;
      let maxActive = 0;
      
      const createSlowFn = () => jest.fn().mockImplementation(() => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        return new Promise(resolve => {
          setTimeout(() => {
            activeCount--;
            resolve('done');
          }, 200);
        });
      });
      
      // Add 4 requests (max concurrent is 2)
      const promises = [
        queue.add(createSlowFn()),
        queue.add(createSlowFn()),
        queue.add(createSlowFn()),
        queue.add(createSlowFn())
      ];
      
      jest.advanceTimersByTime(50);
      expect(maxActive).toBe(2); // Should not exceed maxConcurrent
      
      jest.advanceTimersByTime(500);
      await Promise.all(promises);
      
      expect(queue.processed).toBe(4);
    });

    it('should emit success event on successful execution', async () => {
      const successSpy = jest.fn();
      queue.on('success', successSpy);
      
      const fn = jest.fn().mockResolvedValue('result');
      await queue.add(fn);
      
      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          queueLength: 0,
          active: 0
        })
      );
    });
  });

  describe('executeWithTimeout', () => {
    it('should complete when function finishes before timeout', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const request = {
        fn,
        timeout: 1000
      };
      
      const resultPromise = queue.executeWithTimeout(request);
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      
      expect(result).toBe('success');
    });

    it('should timeout when function takes too long', async () => {
      const fn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('too late'), 2000))
      );
      
      const request = {
        fn,
        timeout: 500
      };
      
      const promise = queue.executeWithTimeout(request);
      jest.advanceTimersByTime(600);
      
      await expect(promise).rejects.toThrow('Request timeout after 500ms');
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      const retrySpy = jest.fn();
      queue.on('retry', retrySpy);
      
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success');
      });
      
      const promise = queue.add(fn);
      
      // Process initial attempt
      await jest.runAllTimersAsync();
      
      // Should emit retry event
      expect(retrySpy).toHaveBeenCalledWith({
        attempts: 1,
        delay: 100,
        error: 'Temporary failure'
      });
      
      // Process retry
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for retries', async () => {
      const retrySpy = jest.fn();
      queue.on('retry', retrySpy);
      
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      queue.add(fn, { retryAttempts: 3 });
      
      await jest.runAllTimersAsync();
      
      // First retry: 100ms
      expect(retrySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        attempts: 1,
        delay: 100
      }));
      
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();
      
      // Second retry: 200ms
      expect(retrySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
        attempts: 2,
        delay: 200
      }));
    });

    it('should emit error event when max retries reached', async () => {
      const errorSpy = jest.fn();
      queue.on('error', errorSpy);
      
      const fn = jest.fn().mockRejectedValue(new Error('Permanent failure'));
      
      const promise = queue.add(fn);
      
      // Process all retry attempts
      await jest.runAllTimersAsync();
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();
      jest.advanceTimersByTime(200);
      await jest.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Permanent failure');
      
      expect(errorSpy).toHaveBeenCalledWith({
        attempts: 2,
        error: 'Permanent failure',
        duration: expect.any(Number)
      });
      
      expect(queue.errors).toBe(1);
    });
  });

  describe('drain', () => {
    it('should wait for all requests to complete', async () => {
      const fn1 = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('1'), 100))
      );
      const fn2 = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('2'), 200))
      );
      
      queue.add(fn1);
      queue.add(fn2);
      
      const drainPromise = queue.drain();
      
      jest.advanceTimersByTime(300);
      await drainPromise;
      
      expect(queue.active).toBe(0);
      expect(queue.queue.length).toBe(0);
      expect(queue.processed).toBe(2);
    });

    it('should resolve immediately when queue is empty', async () => {
      const start = Date.now();
      await queue.drain();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50);
      expect(queue.active).toBe(0);
      expect(queue.queue.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all pending requests', async () => {
      const clearSpy = jest.fn();
      queue.on('clear', clearSpy);
      
      const fn1 = jest.fn().mockResolvedValue('1');
      const fn2 = jest.fn().mockResolvedValue('2');
      const fn3 = jest.fn().mockResolvedValue('3');
      
      // Add requests
      const promise1 = queue.add(fn1);
      const promise2 = queue.add(fn2);
      const promise3 = queue.add(fn3);
      
      // Clear before processing
      const cleared = queue.clear();
      
      expect(cleared).toBe(3);
      expect(clearSpy).toHaveBeenCalledWith({ cleared: 3 });
      expect(queue.queue.length).toBe(0);
      
      // All promises should be rejected
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');
      await expect(promise3).rejects.toThrow('Queue cleared');
    });

    it('should only clear pending requests, not active ones', async () => {
      const activeFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('active'), 200))
      );
      const pendingFn = jest.fn().mockResolvedValue('pending');
      
      // Start one request
      const activePromise = queue.add(activeFn);
      
      // Let it become active
      await jest.runAllTimersAsync();
      
      // Add more requests that will be pending
      const pendingPromise = queue.add(pendingFn);
      
      // Clear the queue
      const cleared = queue.clear();
      
      expect(cleared).toBe(1); // Only the pending request
      expect(queue.active).toBe(1); // Active request still running
      
      // Active request should complete normally
      jest.advanceTimersByTime(200);
      const result = await activePromise;
      expect(result).toBe('active');
      
      // Pending request should be rejected
      await expect(pendingPromise).rejects.toThrow('Queue cleared');
    });
  });

  describe('getStats', () => {
    it('should return current queue statistics', async () => {
      const fn1 = jest.fn().mockResolvedValue('1');
      const fn2 = jest.fn().mockResolvedValue('2');
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Process some requests
      await queue.add(fn1);
      await queue.add(fn2);
      
      // Add a failing request
      try {
        await queue.add(failFn, { retryAttempts: 1 });
      } catch {
        // Expected
      }
      
      const stats = queue.getStats();
      
      expect(stats).toEqual({
        queueLength: 0,
        active: 0,
        processed: 2,
        errors: 1,
        maxConcurrent: 2
      });
    });
  });
});

describe('PriorityQueue', () => {
  let priorityQueue;

  beforeEach(() => {
    priorityQueue = new PriorityQueue({
      maxConcurrent: 1 // Process one at a time to test priority
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('priority levels', () => {
    it('should have predefined priority levels', () => {
      expect(priorityQueue.priorityLevels).toEqual({
        HIGH: 10,
        NORMAL: 5,
        LOW: 1
      });
    });
  });

  describe('priority methods', () => {
    it('should add high priority requests', async () => {
      const fn = jest.fn().mockResolvedValue('high');
      const result = await priorityQueue.addHigh(fn);
      
      expect(result).toBe('high');
      expect(fn).toHaveBeenCalled();
    });

    it('should add normal priority requests', async () => {
      const fn = jest.fn().mockResolvedValue('normal');
      const result = await priorityQueue.addNormal(fn);
      
      expect(result).toBe('normal');
      expect(fn).toHaveBeenCalled();
    });

    it('should add low priority requests', async () => {
      const fn = jest.fn().mockResolvedValue('low');
      const result = await priorityQueue.addLow(fn);
      
      expect(result).toBe('low');
      expect(fn).toHaveBeenCalled();
    });

    it('should process requests in priority order', async () => {
      const results = [];
      
      const createFn = (value) => jest.fn().mockImplementation(() => {
        results.push(value);
        return Promise.resolve(value);
      });
      
      // Add in mixed order
      priorityQueue.addLow(createFn('low1'));
      priorityQueue.addHigh(createFn('high1'));
      priorityQueue.addNormal(createFn('normal1'));
      priorityQueue.addHigh(createFn('high2'));
      priorityQueue.addLow(createFn('low2'));
      
      await jest.runAllTimersAsync();
      await priorityQueue.drain();
      
      // Should process high priority first, then normal, then low
      expect(results).toEqual(['high1', 'high2', 'normal1', 'low1', 'low2']);
    });
  });
});