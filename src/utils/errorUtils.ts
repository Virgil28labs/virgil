/**
 * Error handling utilities to replace 'any' types with proper type safety
 */

/**
 * Safely extracts an error message from an unknown error type
 * @param error - The error object of unknown type
 * @returns A string error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Type guard to check if an error has a specific error code
 * @param error - The error object
 * @param code - The error code to check for
 * @returns True if the error has the specified code
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === code
  );
}

/**
 * Type guard to check if an error has a status code
 * @param error - The error object
 * @returns True if the error has a status property
 */
export function hasStatusCode(error: unknown): error is { status: number; message?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Common API error type
 */
export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Type guard for API errors
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
