// Unified error handling utilities

import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitError';
  }
}

// Error handler function
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      return new AppError('Request was cancelled', 'ABORT_ERROR');
    }
    
    if (error.message.includes('fetch')) {
      return new NetworkError(error.message);
    }

    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  // Handle non-Error objects
  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    error,
  );
}

// Type guard for error objects
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Safe error message extraction
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

// Error logging utility
export function logError(error: unknown, component: string, action?: string): void {
  const errorObj = handleError(error);
  
  logger.error(
    `${errorObj.name}: ${errorObj.message}`,
    errorObj,
    {
      component,
      action: action || 'unknown',
      metadata: {
        code: errorObj.code,
        statusCode: errorObj.statusCode,
        details: errorObj.details,
      },
    }
  );
}