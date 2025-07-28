import { logger } from '../lib/logger';
import { toastService } from './ToastService';
import { timeService } from './TimeService';

export interface ErrorInfo {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class ErrorHandlerService {
  private errorQueue: Array<{ error: Error; timestamp: number }> = [];
  private readonly ERROR_THRESHOLD = 5; // errors per minute
  private readonly TIME_WINDOW = 60000; // 1 minute

  constructor() {
    this.setupGlobalHandlers();
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handleError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        {
          component: 'Global',
          action: 'unhandledRejection',
          metadata: { reason: event.reason },
        },
      );
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      event.preventDefault();
      this.handleError(
        event.error || new Error(event.message),
        {
          component: 'Global',
          action: 'windowError',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      );
    });
  }

  /**
   * Handle an error with proper logging and user notification
   */
  handleError(error: Error, info?: ErrorInfo) {
    // Add to error queue
    const now = timeService.getTimestamp();
    this.errorQueue.push({ error, timestamp: now });
    
    // Clean old errors
    this.errorQueue = this.errorQueue.filter(
      (e) => now - e.timestamp < this.TIME_WINDOW,
    );

    // Log the error
    logger.error(error.message, error, {
      component: info?.component || 'Unknown',
      action: info?.action || 'error',
      metadata: info?.metadata,
    });

    // Check if we're getting too many errors
    if (this.errorQueue.length >= this.ERROR_THRESHOLD) {
      this.handleErrorStorm();
      return;
    }

    // Show user notification based on error type
    this.showUserNotification(error);
  }

  /**
   * Handle when too many errors occur in a short time
   */
  private handleErrorStorm() {
    toastService.error(
      'Multiple errors detected. The app may be unstable. Please refresh the page.',
    );
    
    // Clear error queue to prevent spam
    this.errorQueue = [];
  }

  /**
   * Show appropriate user notification based on error type
   */
  private showUserNotification(error: Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      toastService.error('Network error. Please check your connection.');
    } else if (message.includes('permission')) {
      toastService.error('Permission denied. Please check your settings.');
    } else if (message.includes('timeout')) {
      toastService.error('Request timed out. Please try again.');
    } else if (message.includes('quota')) {
      toastService.error('Storage quota exceeded. Please clear some data.');
    } else if (message.includes('offline')) {
      toastService.error('You appear to be offline. Some features may not work.');
    } else {
      // Generic error message
      if (process.env.NODE_ENV === 'development') {
        toastService.error(`Error: ${error.message}`);
      } else {
        toastService.error('Something went wrong. Please try again.');
      }
    }
  }

  /**
   * Create a wrapped version of a function with error handling
   */
  wrapFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    info?: ErrorInfo,
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.handleError(error instanceof Error ? error : new Error(String(error)), info);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), info);
        throw error;
      }
    }) as T;
  }

  /**
   * Create a safe version of an async function that won't throw
   */
  createSafeAsync<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    fallback?: TReturn,
    info?: ErrorInfo,
  ): (...args: TArgs) => Promise<TReturn | undefined> {
    return async (...args: TArgs): Promise<TReturn | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)), info);
        return fallback;
      }
    };
  }
}

// Export singleton instance
export const errorHandlerService = new ErrorHandlerService();

// Export convenience functions
export const handleError = (error: Error, info?: ErrorInfo) => 
  errorHandlerService.handleError(error, info);

export const wrapFunction = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  info?: ErrorInfo,
) => errorHandlerService.wrapFunction(fn, info);

export const createSafeAsync = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallback?: TReturn,
  info?: ErrorInfo,
) => errorHandlerService.createSafeAsync(fn, fallback, info);