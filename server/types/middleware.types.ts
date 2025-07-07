import { Request, Response, NextFunction } from 'express';

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
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request) => boolean;
}

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
  helmet: Record<string, any>;
  rateLimit: RateLimitOptions;
}

// Logging Types
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  meta?: Record<string, any>;
  requestId?: string;
  userId?: string;
}

// Error Types
export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
}

export interface ErrorResponse {
  error: {
    message: string;
    status: number;
    code?: string;
    details?: any;
    stack?: string;
  };
}