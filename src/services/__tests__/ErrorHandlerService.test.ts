/**
 * ErrorHandlerService Comprehensive Test Suite
 * 
 * Tests error handling, logging, user notifications, and error storm detection.
 * Critical foundation service used by error boundaries and global error handling.
 */

import { errorHandlerService, handleError, wrapFunction, createSafeAsync } from '../ErrorHandlerService';
import { setupTimeTest } from '../../test-utils/timeTestUtils';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../ToastService', () => ({
  toastService: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../TimeService');

import { logger } from '../../lib/logger';
import { toastService } from '../ToastService';
import { timeService } from '../TimeService';

describe('ErrorHandlerService', () => {
  let timeContext: ReturnType<typeof setupTimeTest>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up time context
    timeContext = setupTimeTest('2024-01-20T12:00:00');
    Object.assign(timeService, timeContext.timeService);
    
    // Reset error queue
    (errorHandlerService as any).errorQueue = [];
  });

  afterEach(() => {
    timeContext.cleanup();
  });

  describe('Basic Error Handling', () => {
    it('handles simple errors correctly', () => {
      // Mock NODE_ENV as development to get specific error messages
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const info = {
        component: 'TestComponent',
        action: 'testAction',
        metadata: { userId: '123' },
      };

      errorHandlerService.handleError(error, info);

      expect(logger.error).toHaveBeenCalledWith('Test error', error, {
        component: 'TestComponent',
        action: 'testAction',
        metadata: { userId: '123' },
      });

      expect(toastService.error).toHaveBeenCalledWith('Error: Test error');
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('handles errors without info', () => {
      const error = new Error('Test error');

      errorHandlerService.handleError(error);

      expect(logger.error).toHaveBeenCalledWith('Test error', error, {
        component: 'Unknown',
        action: 'error',
        metadata: undefined,
      });
    });

    it('uses handleError convenience function', () => {
      const error = new Error('Convenience test');
      const info = { component: 'TestComponent' };

      handleError(error, info);

      expect(logger.error).toHaveBeenCalledWith('Convenience test', error, {
        component: 'TestComponent',
        action: 'error',
        metadata: undefined,
      });
    });
  });

  describe('Error Type Classification', () => {
    it('identifies network errors', () => {
      const networkError = new Error('Network request failed');
      errorHandlerService.handleError(networkError);
      
      expect(toastService.error).toHaveBeenCalledWith('Network error. Please check your connection.');
    });

    it('identifies permission errors', () => {
      const permissionError = new Error('Permission denied to access resource');
      errorHandlerService.handleError(permissionError);
      
      expect(toastService.error).toHaveBeenCalledWith('Permission denied. Please check your settings.');
    });

    it('identifies timeout errors', () => {
      const timeoutError = new Error('Request timeout exceeded');
      errorHandlerService.handleError(timeoutError);
      
      expect(toastService.error).toHaveBeenCalledWith('Request timed out. Please try again.');
    });

    it('identifies quota errors', () => {
      const quotaError = new Error('Storage quota exceeded');
      errorHandlerService.handleError(quotaError);
      
      expect(toastService.error).toHaveBeenCalledWith('Storage quota exceeded. Please clear some data.');
    });

    it('identifies offline errors', () => {
      const offlineError = new Error('User is offline');
      errorHandlerService.handleError(offlineError);
      
      expect(toastService.error).toHaveBeenCalledWith('You appear to be offline. Some features may not work.');
    });

    it('handles fetch errors', () => {
      const fetchError = new Error('Fetch operation failed');
      errorHandlerService.handleError(fetchError);
      
      expect(toastService.error).toHaveBeenCalledWith('Network error. Please check your connection.');
    });
  });

  describe('Production vs Development Messages', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows detailed errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');
      
      errorHandlerService.handleError(error);
      
      expect(toastService.error).toHaveBeenCalledWith('Error: Detailed error message');
    });

    it('shows generic errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal system failure');
      
      errorHandlerService.handleError(error);
      
      expect(toastService.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
    });
  });

  describe('Error Storm Detection', () => {
    it('detects error storms and shows warning', () => {
      // Create 5 errors quickly (threshold)
      for (let i = 0; i < 5; i++) {
        errorHandlerService.handleError(new Error(`Error ${i}`));
      }

      expect(toastService.error).toHaveBeenLastCalledWith(
        'Multiple errors detected. The app may be unstable. Please refresh the page.',
      );
    });

    it('clears error queue after storm detection', () => {
      // Create error storm
      for (let i = 0; i < 5; i++) {
        errorHandlerService.handleError(new Error(`Error ${i}`));
      }

      // Queue should be cleared
      const errorQueue = (errorHandlerService as any).errorQueue;
      expect(errorQueue).toHaveLength(0);
    });

    it('manages time window correctly', () => {
      // Add 2 errors (below storm threshold)
      errorHandlerService.handleError(new Error('Error 1'));
      errorHandlerService.handleError(new Error('Error 2'));

      // Should not trigger storm detection
      expect(toastService.error).not.toHaveBeenCalledWith(
        'Multiple errors detected. The app may be unstable. Please refresh the page.',
      );
    });
  });

  describe('Function Wrapping', () => {
    it('wraps sync functions correctly', () => {
      const testFn = jest.fn((..._args: any[]) => 'success');
      const info = { component: 'TestComponent', action: 'testAction' };
      
      const wrappedFn = errorHandlerService.wrapFunction(testFn, info);
      const result = wrappedFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('catches sync function errors', () => {
      const testFn = jest.fn(() => {
        throw new Error('Sync error');
      });
      const info = { component: 'TestComponent', action: 'testAction' };
      
      const wrappedFn = errorHandlerService.wrapFunction(testFn, info);
      
      expect(() => wrappedFn()).toThrow('Sync error');
      expect(logger.error).toHaveBeenCalledWith('Sync error', expect.any(Error), {
        component: 'TestComponent',
        action: 'testAction',
        metadata: undefined,
      });
    });

    it('wraps async functions correctly', async () => {
      const testFn = jest.fn(async (..._args: any[]) => 'async success');
      const info = { component: 'TestComponent', action: 'asyncAction' };
      
      const wrappedFn = errorHandlerService.wrapFunction(testFn, info);
      const result = await wrappedFn('arg1');

      expect(result).toBe('async success');
      expect(testFn).toHaveBeenCalledWith('arg1');
    });

    it('catches async function errors', async () => {
      const testFn = jest.fn(async () => {
        throw new Error('Async error');
      });
      const info = { component: 'TestComponent', action: 'asyncAction' };
      
      const wrappedFn = errorHandlerService.wrapFunction(testFn, info);
      
      await expect(wrappedFn()).rejects.toThrow('Async error');
      expect(logger.error).toHaveBeenCalledWith('Async error', expect.any(Error), {
        component: 'TestComponent',
        action: 'asyncAction',
        metadata: undefined,
      });
    });

    it('uses wrapFunction convenience function', () => {
      const testFn = jest.fn(() => 'wrapped');
      const info = { component: 'TestComponent' };
      
      const wrapped = wrapFunction(testFn, info);
      const result = wrapped();

      expect(result).toBe('wrapped');
    });
  });

  describe('Safe Async Functions', () => {
    it('creates safe async functions that return results', async () => {
      const testFn = jest.fn(async (arg: string) => `result: ${arg}`);
      const info = { component: 'TestComponent', action: 'safeAction' };
      
      const safeFn = errorHandlerService.createSafeAsync(testFn, 'fallback', info);
      const result = await safeFn('test');

      expect(result).toBe('result: test');
      expect(testFn).toHaveBeenCalledWith('test');
    });

    it('returns fallback on error', async () => {
      const testFn = jest.fn(async () => {
        throw new Error('Async error');
      });
      const info = { component: 'TestComponent', action: 'safeAction' };
      
      const safeFn = errorHandlerService.createSafeAsync(testFn, 'fallback', info);
      const result = await safeFn();

      expect(result).toBe('fallback');
      expect(logger.error).toHaveBeenCalledWith('Async error', expect.any(Error), {
        component: 'TestComponent',
        action: 'safeAction',
        metadata: undefined,
      });
    });

    it('returns undefined when no fallback provided', async () => {
      const testFn = jest.fn(async () => {
        throw new Error('Async error');
      });
      
      const safeFn = errorHandlerService.createSafeAsync(testFn);
      const result = await safeFn();

      expect(result).toBeUndefined();
    });

    it('uses createSafeAsync convenience function', async () => {
      const testFn = jest.fn(async (x: number) => x * 2);
      const info = { component: 'TestComponent' };
      
      const safeFn = createSafeAsync(testFn, 0, info);
      const result = await safeFn(5);

      expect(result).toBe(10);
    });
  });

  describe('Global Error Handlers', () => {
    let originalAddEventListener: typeof window.addEventListener;

    beforeEach(() => {
      originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn();
    });

    afterEach(() => {
      window.addEventListener = originalAddEventListener;
    });

    it('sets up unhandled rejection handler', () => {
      // Create new instance to trigger setup
      new (errorHandlerService.constructor as any)();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function),
      );
    });

    it('sets up global error handler', () => {
      // Create new instance to trigger setup
      new (errorHandlerService.constructor as any)();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('handles unhandled promise rejections', () => {
      const handler = jest.fn();
      window.addEventListener = jest.fn((event, callback) => {
        if (event === 'unhandledrejection') {
          handler.mockImplementation(callback as (...args: any[]) => any);
        }
      });

      // Create new instance to set up handlers
      new (errorHandlerService.constructor as any)();

      // Simulate unhandled rejection
      const mockEvent = {
        preventDefault: jest.fn(),
        reason: { message: 'Promise rejection' },
      };

      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Promise rejection',
        expect.any(Error),
        expect.objectContaining({
          component: 'Global',
          action: 'unhandledRejection',
        }),
      );
    });

    it('handles global window errors', () => {
      const handler = jest.fn();
      window.addEventListener = jest.fn((event, callback) => {
        if (event === 'error') {
          handler.mockImplementation(callback as (...args: any[]) => any);
        }
      });

      // Create new instance to set up handlers
      new (errorHandlerService.constructor as any)();

      // Simulate window error
      const mockEvent = {
        preventDefault: jest.fn(),
        error: new Error('Window error'),
        message: 'Error message',
        filename: 'test.js',
        lineno: 42,
        colno: 10,
      };

      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Window error',
        expect.any(Error),
        expect.objectContaining({
          component: 'Global',
          action: 'windowError',
          metadata: {
            filename: 'test.js',
            lineno: 42,
            colno: 10,
          },
        }),
      );
    });
  });

  describe('Error Queue Management', () => {
    it('maintains error queue with timestamps', () => {
      errorHandlerService.handleError(new Error('Error 1'));
      errorHandlerService.handleError(new Error('Error 2'));

      const errorQueue = (errorHandlerService as any).errorQueue;
      expect(errorQueue).toHaveLength(2);
      expect(errorQueue[0]).toHaveProperty('error');
      expect(errorQueue[0]).toHaveProperty('timestamp');
    });

    it('manages error queue properly', () => {
      // Add errors to populate the queue
      errorHandlerService.handleError(new Error('Error 1'));
      errorHandlerService.handleError(new Error('Error 2'));
      
      const errorQueue = (errorHandlerService as any).errorQueue;
      
      // Queue should contain the errors
      expect(errorQueue.length).toBeGreaterThan(0);
      expect(errorQueue.every((entry: any) => entry.error && entry.timestamp)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles non-Error objects gracefully', () => {
      const stringError = 'String error';
      const numberError = 42;
      const objectError = { message: 'Object error' };

      errorHandlerService.handleError(stringError as any);
      errorHandlerService.handleError(numberError as any);
      errorHandlerService.handleError(objectError as any);

      expect(logger.error).toHaveBeenCalledTimes(3);
    });

    it('handles errors with circular references in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const error = new Error('Circular reference error');
      const info = {
        component: 'TestComponent',
        metadata: { circular },
      };

      expect(() => errorHandlerService.handleError(error, info)).not.toThrow();
    });

    it('handles errors during error handling gracefully', () => {
      // Mock logger to throw
      (logger.error as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logger error');
      });

      const originalError = new Error('Original error');
      
      // Should not throw even if logger fails
      expect(() => errorHandlerService.handleError(originalError)).not.toThrow();
    });
  });
});