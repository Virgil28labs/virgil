const { RequestQueue, PriorityQueue } = require('../queue');

describe('RequestQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new RequestQueue({
      maxConcurrent: 2,
      timeout: 1000,
      retryAttempts: 2,
      retryDelay: 100,
    });
  });

  afterEach(() => {
    if (queue) {
      queue.clear();
    }
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

      const result = await queue.add(fn);

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
        active: 0,
      });
    });

    it('should handle priority ordering', async () => {
      const results = [];

      // Set maxConcurrent to 1 to ensure sequential processing
      queue.maxConcurrent = 1;

      // Create a blocking function to fill the concurrent slot
      const blockingFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('blocking');
        return 'blocking';
      });

      // Start the blocking function first
      const blockingPromise = queue.add(blockingFn);

      // Wait a bit to ensure it starts processing
      await new Promise(resolve => setTimeout(resolve, 5));

      // Add requests with different priorities while blocked
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

      // These will be queued
      const promise1 = queue.add(fn1, { priority: 1 }); // low
      const promise2 = queue.add(fn2, { priority: 10 }); // high
      const promise3 = queue.add(fn3, { priority: 5 }); // normal

      // Wait for all requests
      await Promise.all([blockingPromise, promise1, promise2, promise3]);

      // Should process blocking first, then in priority order
      expect(results).toEqual(['blocking', 'high', 'normal', 'low']);
    });
  });

  describe('process', () => {
    it('should respect maxConcurrent limit', async () => {
      let activeCount = 0;
      let maxActive = 0;

      const createSlowFn = () => jest.fn().mockImplementation(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50));

        activeCount--;
        return 'done';
      });

      // Add 4 requests (max concurrent is 2)
      const promises = [
        queue.add(createSlowFn()),
        queue.add(createSlowFn()),
        queue.add(createSlowFn()),
        queue.add(createSlowFn()),
      ];

      // Wait a bit to let some requests start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(maxActive).toBe(2); // Should not exceed maxConcurrent

      // Wait for all to complete
      await Promise.all(promises);

      expect(queue.processed).toBe(4);
    });

    it('should emit success event on successful execution', async () => {
      const successSpy = jest.fn();
      queue.on('success', successSpy);

      const fn = jest.fn().mockResolvedValue('result');
      await queue.add(fn);

      // Give time for the active count to update
      await new Promise(resolve => setImmediate(resolve));

      expect(successSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          queueLength: 0,
          active: 0,
        }),
      );
    });
  });

  describe('executeWithTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should complete when function finishes before timeout', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const request = {
        fn,
        timeout: 1000,
      };

      const result = await queue.executeWithTimeout(request);
      expect(result).toBe('success');
    });

    it('should timeout when function takes too long', async () => {
      const fn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('too late'), 2000)),
      );

      const request = {
        fn,
        timeout: 500,
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
      const fn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await queue.add(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(retrySpy).toHaveBeenCalledWith({
        attempts: 1,
        delay: 100,
        error: 'Temporary failure',
      });
    });

    it('should use exponential backoff for retries', async () => {
      jest.useFakeTimers();

      const retrySpy = jest.fn();
      const errorSpy = jest.fn();
      queue.on('retry', retrySpy);
      queue.on('error', errorSpy);

      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

      const promise = queue.add(fn, { retryAttempts: 3 });

      // Process initial attempt
      jest.runAllTimers();

      // First retry: 100ms
      expect(retrySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        attempts: 1,
        delay: 100,
      }));

      jest.advanceTimersByTime(100);
      jest.runAllTimers();

      // Second retry: 200ms
      expect(retrySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
        attempts: 2,
        delay: 200,
      }));

      // Complete all retries
      jest.advanceTimersByTime(200);
      jest.runAllTimers();

      // Should eventually fail
      try {
        await promise;
      } catch (error) {
        expect(error.message).toBe('Always fails');
      }

      jest.useRealTimers();
    });

    it('should emit error event when max retries reached', async () => {
      const errorSpy = jest.fn();
      queue.on('error', errorSpy);

      const fn = jest.fn().mockRejectedValue(new Error('Permanent failure'));

      await expect(queue.add(fn)).rejects.toThrow('Permanent failure');

      expect(errorSpy).toHaveBeenCalledWith({
        attempts: 2,
        error: 'Permanent failure',
        duration: expect.any(Number),
      });

      expect(queue.errors).toBe(1);
    });
  });

  describe('drain', () => {
    it('should wait for all requests to complete', async () => {
      const fn1 = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return '1';
      });
      const fn2 = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return '2';
      });

      queue.add(fn1);
      queue.add(fn2);

      await queue.drain();

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

      // Create slow functions
      const fn1 = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100, '1')),
      );
      const fn2 = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100, '2')),
      );
      const fn3 = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100, '3')),
      );

      // Add requests - with maxConcurrent=2, one will be pending
      const promise1 = queue.add(fn1);
      const promise2 = queue.add(fn2);
      const promise3 = queue.add(fn3);

      // Wait a tiny bit to ensure first two start
      await new Promise(resolve => setTimeout(resolve, 5));

      // Clear the queue - should only clear the pending one
      const cleared = queue.clear();

      expect(cleared).toBe(1); // Only the third request was pending
      expect(clearSpy).toHaveBeenCalledWith({ cleared: 1 });

      // First two should complete normally
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('1');
      expect(result2).toBe('2');

      // Third promise should be rejected
      try {
        await promise3;
        throw new Error('Expected promise3 to reject');
      } catch (error) {
        expect(error.message).toBe('Queue cleared');
      }
    });

    it('should only clear pending requests, not active ones', async () => {
      const activeFn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 50, 'active')),
      );
      const pendingFn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 50, 'pending')),
      );

      // Set maxConcurrent to 1 to ensure second request stays pending
      queue.maxConcurrent = 1;

      // Start one request
      const activePromise = queue.add(activeFn);

      // Wait a bit to ensure it starts
      await new Promise(resolve => setTimeout(resolve, 5));

      // Add a request that will be pending
      const pendingPromise = queue.add(pendingFn);

      // Clear the queue
      const cleared = queue.clear();

      expect(cleared).toBe(1); // Only the pending request
      expect(queue.active).toBe(1); // Active request still running

      // Active request should complete normally
      const result = await activePromise;
      expect(result).toBe('active');

      // Pending request should be rejected
      try {
        await pendingPromise;
        throw new Error('Expected pendingPromise to reject');
      } catch (error) {
        expect(error.message).toBe('Queue cleared');
      }
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
        maxConcurrent: 2,
      });
    });
  });
});

describe('PriorityQueue', () => {
  let priorityQueue;

  beforeEach(() => {
    priorityQueue = new PriorityQueue({
      maxConcurrent: 1, // Process one at a time to test priority
    });
  });

  afterEach(() => {
    if (priorityQueue) {
      priorityQueue.clear();
    }
  });

  describe('priority levels', () => {
    it('should have predefined priority levels', () => {
      expect(priorityQueue.priorityLevels).toEqual({
        HIGH: 10,
        NORMAL: 5,
        LOW: 1,
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

      // Add error handler to prevent unhandled rejection warnings
      const errorHandler = jest.fn();
      priorityQueue.on('error', errorHandler);

      // Create a blocking function to prevent immediate processing
      const blockingFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('blocking');
        return 'blocking';
      });

      // Add a blocking request first to fill the concurrent slot
      const blockingPromise = priorityQueue.add(blockingFn);

      // Wait to ensure it starts
      await new Promise(resolve => setTimeout(resolve, 5));

      // Create functions that track execution order
      const createFn = value => jest.fn().mockImplementation(() => {
        results.push(value);
        return Promise.resolve(value);
      });

      // Now add requests in mixed order - they'll queue up
      const promises = [
        priorityQueue.addLow(createFn('low1')),
        priorityQueue.addHigh(createFn('high1')),
        priorityQueue.addNormal(createFn('normal1')),
        priorityQueue.addHigh(createFn('high2')),
        priorityQueue.addLow(createFn('low2')),
      ];

      // Wait for all requests
      await Promise.all([blockingPromise, ...promises]);

      // Should process blocking first, then high priority first, then normal, then low
      // Within same priority level, order is maintained (FIFO)
      expect(results).toEqual(['blocking', 'high1', 'high2', 'normal1', 'low1', 'low2']);

      // No errors should have occurred
      expect(errorHandler).not.toHaveBeenCalled();
    });
  });
});
