import type { Request } from 'express';

// Validation Types
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Rate Limiting Types
/* eslint-disable no-unused-vars */
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request) => boolean;
}
/* eslint-enable no-unused-vars */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  totalHits: number;
}

// Cache Types
export interface CacheOptions {
  ttl: number;
  maxSize?: number;
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

// Security Types
export interface SecurityOptions {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  helmet: Record<string, unknown>;
  rateLimit: RateLimitOptions;
}

// Logging Types
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  meta?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}

// Error Types
export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
    stack?: string;
  };
}