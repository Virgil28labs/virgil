import { retryWithBackoff } from '../retryUtils';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful execution', () => {
    it('should return result on first success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn);
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on immediate success', async () => {
      const onRetry = jest.fn();
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { onRetry });

      expect(result).toBe('success');
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('retry behavior', () => {
    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn);
      
      // First attempt fails
      await jest.runAllTimersAsync();
      
      // Second attempt fails (after 1000ms delay)
      await jest.runAllTimersAsync();
      
      // Third attempt succeeds (after 2000ms delay)
      await jest.runAllTimersAsync();
      
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValue('success');

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2
      });

      // Process all timers
      await jest.runAllTimersAsync();
      await promise;

      // Check delays: 100ms, 200ms, 400ms
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 200);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(3, expect.any(Function), 400);
    });

    it('should respect maxDelay', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 5000,
        maxDelay: 1000,
        backoffFactor: 3
      });

      await jest.runAllTimersAsync();
      await promise;

      // Should cap at maxDelay (1000ms) even though initial delay is 5000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const error1 = new Error('Fail 1');
      const error2 = new Error('Fail 2');
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn, { onRetry });
      
      await jest.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, error1);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, error2);
    });
  });

  describe('final failure', () => {
    it('should throw error after max retries', async () => {
      const finalError = new Error('Final failure');
      const mockFn = jest.fn().mockRejectedValue(finalError);

      // Start the retry operation
      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });
      
      // Run timers and await the promise simultaneously
      const [result] = await Promise.allSettled([
        promise,
        jest.runAllTimersAsync()
      ]);

      expect(result.status).toBe('rejected');
      expect((result as PromiseRejectedResult).reason.message).toBe('Final failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw the last error', async () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3')
      ];
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(errors[0])
        .mockRejectedValueOnce(errors[1])
        .mockRejectedValue(errors[2]);

      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });
      
      const [result] = await Promise.allSettled([
        promise,
        jest.runAllTimersAsync()
      ]);

      expect(result.status).toBe('rejected');
      expect((result as PromiseRejectedResult).reason.message).toBe('Error 3');
    });
  });

  describe('edge cases', () => {
    it('should work with 0 retries', async () => {
      const error = new Error('Immediate failure');
      const mockFn = jest.fn().mockRejectedValue(error);

      const promise = retryWithBackoff(mockFn, { maxRetries: 0 });

      await expect(promise).rejects.toThrow('Immediate failure');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async errors', async () => {
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });
      
      const [result] = await Promise.allSettled([
        promise,
        jest.runAllTimersAsync()
      ]);

      expect(result.status).toBe('rejected');
      expect((result as PromiseRejectedResult).reason.message).toBe('Async error');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should use default options', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const promise = retryWithBackoff(mockFn);
      
      await jest.runAllTimersAsync();
      await promise;

      // Default initialDelay is 1000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should handle backoffFactor of 1', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 500,
        backoffFactor: 1
      });

      await jest.runAllTimersAsync();
      await promise;

      // With backoffFactor of 1, delay should remain constant
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 500);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 500);
    });
  });
});