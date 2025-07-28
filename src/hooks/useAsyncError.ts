import { useCallback } from 'react';
import { logger } from '../lib/logger';
import { toastService } from '../services/ToastService';

/**
 * Custom hook for handling async errors consistently
 * Provides error handling with logging and user notifications
 */
export const useAsyncError = (componentName: string) => {
  const handleError = useCallback((error: unknown, action: string, showToast = true) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log the error
    logger.error(`Async error in ${componentName}`, errorObj, {
      component: componentName,
      action,
    });

    // Show user-friendly toast notification
    if (showToast) {
      if (errorObj.message.includes('network') || errorObj.message.includes('fetch')) {
        toastService.error('Network error. Please check your connection.');
      } else if (errorObj.message.includes('timeout')) {
        toastService.error('Request timed out. Please try again.');
      } else if (errorObj.message.includes('permission')) {
        toastService.error('Permission denied. Please check your settings.');
      } else {
        toastService.error('Something went wrong. Please try again.');
      }
    }

    return errorObj;
  }, [componentName]);

  // Wrapper for async functions with automatic error handling
  const wrapAsync = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    action: string,
    options?: {
      showToast?: boolean;
      fallback?: R;
      onError?: (error: Error) => void;
    },
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorObj = handleError(error, action, options?.showToast ?? true);
        
        if (options?.onError) {
          options.onError(errorObj);
        }
        
        return options?.fallback;
      }
    };
  }, [handleError]);

  // Execute async function with loading state management
  const executeAsync = useCallback(async <R,>(
    fn: () => Promise<R>,
    options?: {
      action?: string;
      showToast?: boolean;
      onStart?: () => void;
      onSuccess?: (result: R) => void;
      onError?: (error: Error) => void;
      onFinally?: () => void;
    },
  ): Promise<R | undefined> => {
    options?.onStart?.();
    
    try {
      const result = await fn();
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorObj = handleError(
        error, 
        options?.action || 'executeAsync', 
        options?.showToast ?? true,
      );
      options?.onError?.(errorObj);
      return undefined;
    } finally {
      options?.onFinally?.();
    }
  }, [handleError]);

  return {
    handleError,
    wrapAsync,
    executeAsync,
  };
};