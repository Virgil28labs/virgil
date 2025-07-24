import {
  AppError,
  ValidationError,
  NetworkError,
  AuthError,
  NotFoundError,
  RateLimitError,
  handleError,
  isAppError,
  getErrorMessage,
  logError,
} from '../errors';
import { logger } from '../logger';

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Classes', () => {
  describe('AppError', () => {
    it('creates an error with all properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 500, { extra: 'data' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });

    it('creates an error without optional properties', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('maintains proper prototype chain', () => {
      const error = new AppError('Test', 'CODE');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });
  });

  describe('ValidationError', () => {
    it('creates a validation error with correct defaults', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
    });

    it('accepts details parameter', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid email', details);
      
      expect(error.details).toEqual(details);
    });
  });

  describe('NetworkError', () => {
    it('creates a network error with correct defaults', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('AuthError', () => {
    it('creates an auth error with correct defaults', () => {
      const error = new AuthError('Unauthorized');
      
      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });
  });

  describe('NotFoundError', () => {
    it('creates a not found error with correct defaults', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('RateLimitError', () => {
    it('creates a rate limit error with correct defaults', () => {
      const error = new RateLimitError('Too many requests');
      
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });
  });
});

describe('handleError', () => {
  it('returns AppError instances unchanged', () => {
    const appError = new AppError('Test', 'CODE', 500);
    const result = handleError(appError);
    
    expect(result).toBe(appError);
  });

  it('returns ValidationError unchanged', () => {
    const validationError = new ValidationError('Invalid');
    const result = handleError(validationError);
    
    expect(result).toBe(validationError);
  });

  it('converts AbortError to AppError', () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    
    const result = handleError(abortError);
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Request was cancelled');
    expect(result.code).toBe('ABORT_ERROR');
  });

  it('converts fetch errors to NetworkError', () => {
    const fetchError = new Error('Failed to fetch data');
    
    const result = handleError(fetchError);
    
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.message).toBe('Failed to fetch data');
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('converts generic Error to AppError', () => {
    const genericError = new Error('Something went wrong');
    
    const result = handleError(genericError);
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Something went wrong');
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('handles non-Error objects', () => {
    const result = handleError({ some: 'object' });
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('An unexpected error occurred');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.statusCode).toBe(500);
    expect(result.details).toEqual({ some: 'object' });
  });

  it('handles string errors', () => {
    const result = handleError('String error');
    
    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('An unexpected error occurred');
    expect(result.details).toBe('String error');
  });

  it('handles null/undefined', () => {
    const resultNull = handleError(null);
    const resultUndefined = handleError(undefined);
    
    expect(resultNull).toBeInstanceOf(AppError);
    expect(resultNull.message).toBe('An unexpected error occurred');
    expect(resultNull.details).toBeNull();
    
    expect(resultUndefined).toBeInstanceOf(AppError);
    expect(resultUndefined.message).toBe('An unexpected error occurred');
    expect(resultUndefined.details).toBeUndefined();
  });
});

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    const appError = new AppError('Test', 'CODE');
    expect(isAppError(appError)).toBe(true);
  });

  it('returns true for AppError subclasses', () => {
    expect(isAppError(new ValidationError('Test'))).toBe(true);
    expect(isAppError(new NetworkError('Test'))).toBe(true);
    expect(isAppError(new AuthError('Test'))).toBe(true);
    expect(isAppError(new NotFoundError('Test'))).toBe(true);
    expect(isAppError(new RateLimitError('Test'))).toBe(true);
  });

  it('returns false for regular Error', () => {
    expect(isAppError(new Error('Test'))).toBe(false);
  });

  it('returns false for non-error objects', () => {
    expect(isAppError('string')).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError({})).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    expect(getErrorMessage(new AppError('App error', 'CODE'))).toBe('App error');
  });

  it('returns string errors as-is', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('returns default message for non-error objects', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred');
    expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
  });
});

describe('logError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs AppError with all details', () => {
    const error = new AppError('Test error', 'TEST_CODE', 500, { extra: 'data' });
    
    logError(error, 'TestComponent', 'testAction');
    
    expect(logger.error).toHaveBeenCalledWith(
      'AppError: Test error',
      error,
      {
        component: 'TestComponent',
        action: 'testAction',
        metadata: {
          code: 'TEST_CODE',
          statusCode: 500,
          details: { extra: 'data' },
        },
      }
    );
  });

  it('logs converted errors', () => {
    const error = new Error('Network failed');
    error.message = 'fetch failed';
    
    logError(error, 'ApiService');
    
    expect(logger.error).toHaveBeenCalledWith(
      'NetworkError: fetch failed',
      expect.any(NetworkError),
      {
        component: 'ApiService',
        action: 'unknown',
        metadata: {
          code: 'NETWORK_ERROR',
          statusCode: 503,
          details: undefined,
        },
      }
    );
  });

  it('uses default action when not provided', () => {
    const error = new ValidationError('Invalid data');
    
    logError(error, 'FormComponent');
    
    expect(logger.error).toHaveBeenCalledWith(
      'ValidationError: Invalid data',
      error,
      expect.objectContaining({
        action: 'unknown',
      })
    );
  });

  it('handles non-error objects', () => {
    logError('String error', 'Component', 'action');
    
    expect(logger.error).toHaveBeenCalledWith(
      'AppError: An unexpected error occurred',
      expect.any(AppError),
      {
        component: 'Component',
        action: 'action',
        metadata: {
          code: 'UNKNOWN_ERROR',
          statusCode: 500,
          details: 'String error',
        },
      }
    );
  });
});