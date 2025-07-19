/**
 * Utility Types
 * General purpose types and helpers
 */

// Common Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type KeyOf<T> = keyof T;
export type ValueOf<T> = T[keyof T];

// Function Types
export type AsyncFunction<T = void, Args extends unknown[] = unknown[]> = (
  ...args: Args
) => Promise<T>;
export type VoidFunction = () => void;
export type Callback<T = void> = (value: T) => void;

// Cache Types
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

// Debounce/Throttle Types
export interface DebounceOptions {
  delay: number;
  immediate?: boolean;
}

export interface ThrottleOptions {
  delay: number;
  trailing?: boolean;
}

// Generic Error Types
export interface ErrorDetails {
  field?: string;
  reason?: string;
  context?: Record<string, unknown>;
}

export interface CustomError extends Error {
  code?: string;
  status?: number;
  details?: ErrorDetails;
}
