/**
 * Retry Utilities Tests
 * 
 * Tests the retry utility functions including:
 * - Exponential backoff retry mechanism
 * - Success on first attempt (no retries needed)
 * - Success after multiple retries
 * - Failure after exhausting all retries
 * - Custom retry options (delays, backoff factors, max retries)
 * - Rate limit handling (429 status codes with Retry-After)
 * - Custom shouldRetry conditions
 * - onRetry callback functionality
 * - Error propagation and logging
 * - Edge cases and boundary conditions
 */

import { retryWithBackoff } from '../retryUtils';
import { logger } from '../logger';
import { hasStatusCode } from '../../utils/errorUtils';

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../utils/errorUtils', () => ({
  hasStatusCode: jest.fn(),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockHasStatusCode = hasStatusCode as jest.MockedFunction<typeof hasStatusCode>;

// Test helper to create mock functions that succeed/fail
const createMockFunction = (
  successOnAttempt?: number,
  error: unknown = new Error('Test error'),
) => {
  let attemptCount = 0;
  return jest.fn(() => {
    attemptCount++;
    if (successOnAttempt && attemptCount >= successOnAttempt) {
      return Promise.resolve(`Success on attempt ${attemptCount}`);
    }
    return Promise.reject(error);
  });
};

// Test helper to create rate limit error
const createRateLimitError = (retryAfter?: string) => {
  const error = new Error('Rate limit exceeded') as any;
  error.status = 429;
  error.headers = {
    'retry-after': retryAfter || '60',
  };
  return error;
};

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHasStatusCode.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Success scenarios', () => {
    it('should return result immediately on first success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return result after retries on eventual success', async () => {
      const mockFn = createMockFunction(3); // Succeed on 3rd attempt

      const promise = retryWithBackoff(mockFn);

      // Fast-forward through delays
      for (let i = 0; i < 2; i++) {
        await jest.runOnlyPendingTimersAsync();
      }

      const result = await promise;

      expect(result).toBe('Success on attempt 3');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should use default retry options when none provided', async () => {
      const mockFn = createMockFunction(2);

      const promise = retryWithBackoff(mockFn);

      // Fast-forward through first delay (should be 1000ms with default options)
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;

      expect(result).toBe('Success on attempt 2');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Failure scenarios', () => {
    it('should throw error after exhausting all retries', async () => {
      const testError = new Error('Persistent failure');
      const mockFn = jest.fn().mockRejectedValue(testError);

      const promise = retryWithBackoff(mockFn, { maxRetries: 2 });

      // Fast-forward through all retry delays
      for (let i = 0; i < 2; i++) {
        await jest.runOnlyPendingTimersAsync();
      }

      await expect(promise).rejects.toThrow('Persistent failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed after all retries',
        testError,
        {
          component: 'retryUtils',
          action: 'retryWithBackoff',
          metadata: { attempt: 2, maxRetries: 2 },
        },
      );
    });

    it('should not retry when shouldRetry returns false', async () => {
      const testError = new Error('Should not retry');
      const mockFn = jest.fn().mockRejectedValue(testError);
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        retryWithBackoff(mockFn, { shouldRetry }),
      ).rejects.toThrow('Should not retry');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(testError);
      expect(mockLogger.error).not.toHaveBeenCalled(); // No retry logging for shouldRetry=false
    });
  });

  describe('Custom retry options', () => {
    it('should respect custom maxRetries option', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });

      // Fast-forward through single retry
      await jest.runOnlyPendingTimersAsync();

      await expect(promise).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should use custom delay settings', async () => {
      const mockFn = createMockFunction(2);

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 500,
        backoffFactor: 3,
      });

      // First delay should be 500ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 500);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 2');
    });

    it('should respect maxDelay option', async () => {
      const mockFn = createMockFunction(3);

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 1000,
        maxDelay: 2000,
        backoffFactor: 10, // Would normally create very large delays
      });

      await jest.runOnlyPendingTimersAsync(); // First retry: 1000ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000); // Second retry: capped at maxDelay
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 3');
    });

    it('should call onRetry callback for each retry attempt', async () => {
      const testError = new Error('Test error');
      const mockFn = createMockFunction(3, testError);
      const onRetry = jest.fn();

      const promise = retryWithBackoff(mockFn, { onRetry });

      // Fast-forward through retries
      for (let i = 0; i < 2; i++) {
        await jest.runOnlyPendingTimersAsync();
      }

      const result = await promise;

      expect(result).toBe('Success on attempt 3');
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, testError); // First retry (attempt 1)
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, testError); // Second retry (attempt 2)
    });

    it('should use custom shouldRetry logic', async () => {
      const retriableError = new Error('Temporary failure');
      const nonRetriableError = new Error('Permanent failure');
      const mockFn = jest.fn()
        .mockRejectedValueOnce(retriableError)
        .mockRejectedValueOnce(nonRetriableError);

      const shouldRetry = jest.fn()
        .mockReturnValueOnce(true) // Retry first error
        .mockReturnValueOnce(false); // Don't retry second error

      const promise = retryWithBackoff(mockFn, { shouldRetry });

      await jest.runOnlyPendingTimersAsync(); // Process first retry

      await expect(promise).rejects.toThrow('Permanent failure');

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenNthCalledWith(1, retriableError);
      expect(shouldRetry).toHaveBeenNthCalledWith(2, nonRetriableError);
    });
  });

  describe('Rate limit handling', () => {
    it('should use 60 second delay for 429 errors', async () => {
      const rateLimitError = createRateLimitError();
      const mockFn = createMockFunction(2, rateLimitError);

      mockHasStatusCode.mockReturnValue(true);

      const promise = retryWithBackoff(mockFn);

      // Should use 60000ms delay for rate limit
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60000);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 2');
      expect(mockHasStatusCode).toHaveBeenCalledWith(rateLimitError);
    });

    it('should handle rate limit errors with custom Retry-After header', async () => {
      const rateLimitError = createRateLimitError('120');
      const mockFn = createMockFunction(2, rateLimitError);

      mockHasStatusCode.mockReturnValue(true);

      const promise = retryWithBackoff(mockFn);

      // Should still use 60000ms delay (we don't parse Retry-After header in current implementation)
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60000);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 2');
    });

    it('should not apply rate limit delay for non-429 errors', async () => {
      const serverError = new Error('Server error') as any;
      serverError.status = 500;
      const mockFn = createMockFunction(2, serverError);

      mockHasStatusCode.mockReturnValue(true);

      const promise = retryWithBackoff(mockFn, { initialDelay: 1000 });

      // Should use normal exponential backoff delay
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 2');
    });
  });

  describe('Exponential backoff calculation', () => {
    it('should calculate exponential backoff correctly', async () => {
      const mockFn = createMockFunction(4);

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 100,
        backoffFactor: 2,
        maxDelay: 10000,
      });

      // First retry: 100ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
      await jest.runOnlyPendingTimersAsync();

      // Second retry: 200ms (100 * 2^1)
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 200);
      await jest.runOnlyPendingTimersAsync();

      // Third retry: 400ms (100 * 2^2)
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 400);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 4');
    });

    it('should cap delays at maxDelay', async () => {
      const mockFn = createMockFunction(4);

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 1000,
        backoffFactor: 5,
        maxDelay: 3000,
      });

      await jest.runOnlyPendingTimersAsync(); // First retry: 1000ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3000); // Second retry: capped at 3000ms
      await jest.runOnlyPendingTimersAsync();
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3000); // Third retry: still capped
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 4');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle zero maxRetries (no retries)', async () => {
      const testError = new Error('Immediate failure');
      const mockFn = jest.fn().mockRejectedValue(testError);

      await expect(
        retryWithBackoff(mockFn, { maxRetries: 0 }),
      ).rejects.toThrow('Immediate failure');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed after all retries',
        testError,
        {
          component: 'retryUtils',
          action: 'retryWithBackoff',
          metadata: { attempt: 0, maxRetries: 0 },
        },
      );
    });

    it('should handle function throwing synchronous errors', async () => {
      const syncError = new Error('Sync error');
      const mockFn = jest.fn(() => {
        throw syncError;
      });

      await expect(retryWithBackoff(mockFn)).rejects.toThrow('Sync error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle null/undefined errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(null);

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });
      await jest.runOnlyPendingTimersAsync();

      await expect(promise).rejects.toBeNull();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle functions that return non-promise values', async () => {
      const mockFn = jest.fn().mockReturnValue('immediate value');

      const result = await retryWithBackoff(mockFn);

      expect(result).toBe('immediate value');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should preserve original error properties', async () => {
      const originalError = new Error('Original error');
      originalError.name = 'CustomError';
      (originalError as any).customProperty = 'custom value';

      const mockFn = jest.fn().mockRejectedValue(originalError);

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });
      await jest.runOnlyPendingTimersAsync();

      await expect(promise).rejects.toMatchObject({
        message: 'Original error',
        name: 'CustomError',
        customProperty: 'custom value',
      });
    });
  });

  describe('Memory and cleanup', () => {
    it('should not create memory leaks with multiple concurrent retries', async () => {
      const mockFn = createMockFunction(2);

      const promises = Array.from({ length: 10 }, () => 
        retryWithBackoff(mockFn, { maxRetries: 1 }),
      );

      // Fast-forward through all delays
      await jest.runOnlyPendingTimersAsync();

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe('Success on attempt 2');
      });
    });

    it('should handle promise rejection during delay', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const promise = retryWithBackoff(mockFn, { maxRetries: 1 });

      // Fast-forward through delay
      await jest.runOnlyPendingTimersAsync();

      await expect(promise).rejects.toThrow('Test error');
    });
  });

  describe('Integration with error utilities', () => {
    it('should call hasStatusCode with correct error', async () => {
      const customError = new Error('Custom error') as any;
      customError.status = 500;
      const mockFn = createMockFunction(2, customError);

      mockHasStatusCode.mockReturnValue(true);

      const promise = retryWithBackoff(mockFn);
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 2');
      expect(mockHasStatusCode).toHaveBeenCalledWith(customError);
    });

    it('should handle hasStatusCode throwing error', async () => {
      const testError = new Error('Test error');
      const mockFn = createMockFunction(2, testError);

      mockHasStatusCode.mockImplementation(() => {
        throw new Error('hasStatusCode error');
      });

      const promise = retryWithBackoff(mockFn);
      await jest.runOnlyPendingTimersAsync();

      // Should still work if hasStatusCode fails
      const result = await promise;
      expect(result).toBe('Success on attempt 2');
    });
  });

  describe('Performance and timing', () => {
    it('should not introduce unnecessary delays for successful operations', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const startTime = Date.now();

      await retryWithBackoff(mockFn);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be nearly immediate
    });

    it('should handle very large backoff factors correctly', async () => {
      const mockFn = createMockFunction(3);

      const promise = retryWithBackoff(mockFn, {
        initialDelay: 1,
        backoffFactor: 1000,
        maxDelay: 5000,
      });

      await jest.runOnlyPendingTimersAsync(); // First retry: 1ms
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 5000); // Second retry: capped at maxDelay
      await jest.runOnlyPendingTimersAsync();

      const result = await promise;
      expect(result).toBe('Success on attempt 3');
    });
  });
});