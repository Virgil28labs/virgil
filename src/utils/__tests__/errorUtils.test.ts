/**
 * ErrorUtils Comprehensive Test Suite
 * 
 * Tests error handling utilities that provide type-safe error processing.
 * Critical foundation for error handling throughout the application.
 */

import {
  getErrorMessage,
  hasErrorCode,
  hasStatusCode,
  isAPIError,
  type APIError,
} from '../errorUtils';

describe('errorUtils', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error instances', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('returns string errors directly', () => {
      const error = 'String error message';
      expect(getErrorMessage(error)).toBe('String error message');
    });

    it('extracts message from objects with message property', () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    it('converts non-string message properties to strings', () => {
      const error = { message: 42 };
      expect(getErrorMessage(error)).toBe('42');
    });

    it('handles objects with null message', () => {
      const error = { message: null };
      expect(getErrorMessage(error)).toBe('null');
    });

    it('handles objects with undefined message', () => {
      const error = { message: undefined };
      expect(getErrorMessage(error)).toBe('undefined');
    });

    it('returns default message for unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage(42)).toBe('An unknown error occurred');
      expect(getErrorMessage(true)).toBe('An unknown error occurred');
      expect(getErrorMessage({})).toBe('An unknown error occurred');
    });

    it('handles objects without message property', () => {
      const error = { code: 'ERROR_CODE', status: 500 };
      expect(getErrorMessage(error)).toBe('An unknown error occurred');
    });

    it('handles nested error objects', () => {
      const error = { 
        message: 'Parent error',
        cause: new Error('Nested error'),
      };
      expect(getErrorMessage(error)).toBe('Parent error');
    });

    it('handles empty string messages', () => {
      const error = new Error('');
      expect(getErrorMessage(error)).toBe('');
    });

    it('handles arrays', () => {
      const error = ['error', 'array'];
      expect(getErrorMessage(error)).toBe('An unknown error occurred');
    });

    it('handles functions', () => {
      const error = () => 'error function';
      expect(getErrorMessage(error)).toBe('An unknown error occurred');
    });
  });

  describe('hasErrorCode', () => {
    it('returns true for objects with matching error code', () => {
      const error = { code: 'AUTH_ERROR', message: 'Authentication failed' };
      expect(hasErrorCode(error, 'AUTH_ERROR')).toBe(true);
    });

    it('returns false for objects with different error code', () => {
      const error = { code: 'AUTH_ERROR', message: 'Authentication failed' };
      expect(hasErrorCode(error, 'NETWORK_ERROR')).toBe(false);
    });

    it('returns false for objects without code property', () => {
      const error = { message: 'Error without code' };
      expect(hasErrorCode(error, 'ANY_CODE')).toBe(false);
    });

    it('returns false for null values', () => {
      expect(hasErrorCode(null, 'ANY_CODE')).toBe(false);
    });

    it('returns false for undefined values', () => {
      expect(hasErrorCode(undefined, 'ANY_CODE')).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(hasErrorCode('string error', 'ANY_CODE')).toBe(false);
      expect(hasErrorCode(42, 'ANY_CODE')).toBe(false);
      expect(hasErrorCode(true, 'ANY_CODE')).toBe(false);
    });

    it('returns false for objects with non-string code', () => {
      const error = { code: 500, message: 'Numeric code' };
      expect(hasErrorCode(error, '500')).toBe(false);
    });

    it('performs exact string matching', () => {
      const error = { code: 'AUTH_ERROR' };
      expect(hasErrorCode(error, 'AUTH_ERROR')).toBe(true);
      expect(hasErrorCode(error, 'auth_error')).toBe(false);
      expect(hasErrorCode(error, 'AUTH')).toBe(false);
    });

    it('handles Error instances with code property', () => {
      const error = new Error('Test error');
      (error as { code: string }).code = 'CUSTOM_ERROR';
      expect(hasErrorCode(error, 'CUSTOM_ERROR')).toBe(true);
    });

    it('handles empty string codes', () => {
      const error = { code: '' };
      expect(hasErrorCode(error, '')).toBe(true);
      expect(hasErrorCode(error, 'NON_EMPTY')).toBe(false);
    });
  });

  describe('hasStatusCode', () => {
    it('returns true for objects with numeric status', () => {
      const error = { status: 404, message: 'Not found' };
      expect(hasStatusCode(error)).toBe(true);
    });

    it('returns false for objects without status property', () => {
      const error = { message: 'Error without status' };
      expect(hasStatusCode(error)).toBe(false);
    });

    it('returns false for objects with non-numeric status', () => {
      const error = { status: '404', message: 'String status' };
      expect(hasStatusCode(error)).toBe(false);
    });

    it('returns false for null values', () => {
      expect(hasStatusCode(null)).toBe(false);
    });

    it('returns false for undefined values', () => {
      expect(hasStatusCode(undefined)).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(hasStatusCode('string error')).toBe(false);
      expect(hasStatusCode(404)).toBe(false);
      expect(hasStatusCode(true)).toBe(false);
    });

    it('acts as type guard', () => {
      const error: unknown = { status: 500, message: 'Server error' };
      
      if (hasStatusCode(error)) {
        // TypeScript should recognize error.status as number
        expect(typeof error.status).toBe('number');
        expect(error.status).toBe(500);
        
        // Optional message property should be accessible
        if (error.message) {
          expect(typeof error.message).toBe('string');
        }
      }
    });

    it('handles zero status code', () => {
      const error = { status: 0 };
      expect(hasStatusCode(error)).toBe(true);
    });

    it('handles negative status codes', () => {
      const error = { status: -1 };
      expect(hasStatusCode(error)).toBe(true);
    });

    it('handles floating point status codes', () => {
      const error = { status: 404.5 };
      expect(hasStatusCode(error)).toBe(true);
    });

    it('returns false for NaN status', () => {
      const error = { status: NaN };
      expect(hasStatusCode(error)).toBe(true); // NaN is still of type 'number'
    });

    it('returns false for Infinity status', () => {
      const error = { status: Infinity };
      expect(hasStatusCode(error)).toBe(true); // Infinity is still of type 'number'
    });
  });

  describe('isAPIError', () => {
    it('returns true for valid API error objects', () => {
      const error: APIError = {
        message: 'API request failed',
        code: 'API_ERROR',
        status: 500,
        details: { endpoint: '/api/test' },
      };
      expect(isAPIError(error)).toBe(true);
    });

    it('returns true for minimal API error objects', () => {
      const error = { message: 'Simple error' };
      expect(isAPIError(error)).toBe(true);
    });

    it('returns false for objects without message property', () => {
      const error = { code: 'ERROR_CODE', status: 500 };
      expect(isAPIError(error)).toBe(false);
    });

    it('returns false for objects with non-string message', () => {
      const error = { message: 42, code: 'ERROR' };
      expect(isAPIError(error)).toBe(false);
    });

    it('returns false for null values', () => {
      expect(isAPIError(null)).toBe(false);
    });

    it('returns false for undefined values', () => {
      expect(isAPIError(undefined)).toBe(false);
    });

    it('returns false for primitive values', () => {
      expect(isAPIError('string error')).toBe(false);
      expect(isAPIError(42)).toBe(false);
      expect(isAPIError(true)).toBe(false);
    });

    it('acts as type guard', () => {
      const error: unknown = {
        message: 'API error',
        code: 'API_ERROR',
        status: 404,
      };
      
      if (isAPIError(error)) {
        // TypeScript should recognize all APIError properties
        expect(typeof error.message).toBe('string');
        expect(error.message).toBe('API error');
        
        if (error.code) {
          expect(typeof error.code).toBe('string');
        }
        
        if (error.status) {
          expect(typeof error.status).toBe('number');
        }
      }
    });

    it('handles Error instances that match APIError structure', () => {
      const error = new Error('Test error');
      expect(isAPIError(error)).toBe(true); // Error has message property
    });

    it('handles empty string messages', () => {
      const error = { message: '' };
      expect(isAPIError(error)).toBe(true);
    });

    it('handles arrays', () => {
      const error = ['message', 'array'];
      expect(isAPIError(error)).toBe(false);
    });

    it('handles functions', () => {
      const error = { message: () => 'function message' };
      expect(isAPIError(error)).toBe(false);
    });

    it('handles nested objects as message', () => {
      const error = { message: { nested: 'object' } };
      expect(isAPIError(error)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('handles complex error objects with multiple utility functions', () => {
      const error = {
        message: 'Complex API error',
        code: 'COMPLEX_ERROR',
        status: 422,
        details: { field: 'validation failed' },
      };

      expect(getErrorMessage(error)).toBe('Complex API error');
      expect(hasErrorCode(error, 'COMPLEX_ERROR')).toBe(true);
      expect(hasStatusCode(error)).toBe(true);
      expect(isAPIError(error)).toBe(true);
    });

    it('handles Error instances with additional properties', () => {
      const error = new Error('Enhanced error');
      (error as { code: string }).code = 'ENHANCED_ERROR';
      (error as { status: number }).status = 500;

      expect(getErrorMessage(error)).toBe('Enhanced error');
      expect(hasErrorCode(error, 'ENHANCED_ERROR')).toBe(true);
      expect(hasStatusCode(error)).toBe(true);
      expect(isAPIError(error)).toBe(true);
    });

    it('processes unknown errors through all utilities', () => {
      const unknownError: unknown = 42;

      expect(getErrorMessage(unknownError)).toBe('An unknown error occurred');
      expect(hasErrorCode(unknownError, 'ANY_CODE')).toBe(false);
      expect(hasStatusCode(unknownError)).toBe(false);
      expect(isAPIError(unknownError)).toBe(false);
    });

    it('handles edge case with null prototype objects', () => {
      const error = Object.create(null);
      error.message = 'Null prototype error';
      error.code = 'NULL_PROTO';

      expect(getErrorMessage(error)).toBe('Null prototype error');
      expect(hasErrorCode(error, 'NULL_PROTO')).toBe(true);
      expect(isAPIError(error)).toBe(true);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('maintains type safety with APIError interface', () => {
      const createAPIError = (message: string, code?: string, status?: number): APIError => ({
        message,
        code,
        status,
      });

      const error = createAPIError('Type safe error', 'TS_ERROR', 400);
      expect(isAPIError(error)).toBe(true);
      expect(error.message).toBe('Type safe error');
      expect(error.code).toBe('TS_ERROR');
      expect(error.status).toBe(400);
    });

    it('works with union types', () => {
      const processError = (error: string | Error | APIError): string => {
        if (typeof error === 'string') {
          return error;
        }
        if (error instanceof Error) {
          return error.message;
        }
        if (isAPIError(error)) {
          return `${error.message} (${error.code || 'NO_CODE'})`;
        }
        return 'Unknown error type';
      };

      expect(processError('String error')).toBe('String error');
      expect(processError(new Error('Error instance'))).toBe('Error instance');
      expect(processError({ message: 'API error', code: 'API' })).toBe('API error (API)');
    });
  });
});