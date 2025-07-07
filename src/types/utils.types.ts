/**
 * Utility Types
 * General purpose types and helpers
 */

// React Hook Types
export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<void>;
}

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

// Event Handler Types
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler = (value: string) => void;
export type ClickHandler = () => void;
export type SubmitHandler = (event: React.FormEvent) => void;

// Common Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type KeyOf<T> = keyof T;
export type ValueOf<T> = T[keyof T];

// Function Types
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;
export type VoidFunction = () => void;
export type Callback<T = void> = (value: T) => void;

// Object Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Array Types
export type NonEmptyArray<T> = [T, ...T[]];

// Status Types
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
export type NetworkStatus = 'online' | 'offline' | 'slow';

// Environment Types
export interface EnvironmentVariables {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_LLM_API_URL: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
  VITE_OPENWEATHER_API_KEY?: string;
}

// Brand Constants
export interface BrandColors {
  darkPurple: string;
  lightPurple: string;
  lightGray: string;
  mediumGray: string;
  accentPurple: string;
  accentPink: string;
}

// Text Processing Types
export interface TextAlignment {
  position: number;
  width: number;
  alignment: 'left' | 'center' | 'right';
}

export interface TextMetrics {
  width: number;
  height: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
}

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
export interface CustomError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

// Time-related Types
export interface TimeFormatOptions {
  hour12?: boolean;
  includeSeconds?: boolean;
  timezone?: string;
}

export interface DateFormatOptions {
  format?: 'short' | 'long' | 'numeric';
  includeYear?: boolean;
  timezone?: string;
}