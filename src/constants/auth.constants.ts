/**
 * Authentication Constants
 * Centralized configuration and messages for auth system
 */

export const AUTH_CONFIG = {
  MIN_PASSWORD_LENGTH: 8, // Match validation.ts standard
  EMAIL_STORAGE_KEY: 'virgil_email',
  SESSION_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  TOKEN_REFRESH_BUFFER: 60 * 1000, // 1 minute before expiry
} as const;

export const AUTH_MESSAGES = {
  // Success messages
  LOGIN_SUCCESS: 'Login successful!',
  SIGNUP_SUCCESS: 'Sign up successful! Please check your email to confirm your account.',
  LOGOUT_SUCCESS: 'Logged out successfully',
  
  // Validation messages
  VALIDATION_ERROR: 'Please fill in all fields',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: `Password must be at least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters`,
  
  // Error messages (user-friendly)
  NETWORK_ERROR: 'Network error. Please try again.',
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  
  // Supabase error mappings
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'No account found with this email',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email before logging in',
  USER_ALREADY_EXISTS: 'An account with this email already exists',
} as const;

export const AUTH_ERRORS = {
  // Error codes for consistent handling
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  SESSION: 'SESSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

// Type exports for type safety
export type AuthConfig = typeof AUTH_CONFIG;
export type AuthMessages = typeof AUTH_MESSAGES;
export type AuthErrorCode = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS];