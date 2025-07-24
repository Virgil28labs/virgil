/**
 * Utility functions for retrying failed operations with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Retry a promise-returning function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }
      
      // For rate limit errors (429), use longer delay
      let delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay,
      );
      
      // Check if error has status code 429 and Retry-After header
      if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        // Use 60 seconds for rate limit errors
        delay = 60000;
      }
      
      if (onRetry) {
        onRetry(attempt + 1, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

