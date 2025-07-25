import type { Request, Response, NextFunction } from 'express';

// Extended Express types for our application
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    isPremium?: boolean;
  };
}

export interface ApiRequest extends Request {
  body: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

export interface ApiResponse extends Response {
  locals: {
    cached?: boolean;
    requestId?: string;
    startTime?: number;
  };
}

/* eslint-disable no-unused-vars */
export type MiddlewareFunction = (
  req: ApiRequest,
  res: ApiResponse,
  next: NextFunction
) => void | Promise<void>;

export type ErrorHandler = (
  err: Error,
  req: ApiRequest,
  res: ApiResponse,
  next: NextFunction
) => void;
/* eslint-enable no-unused-vars */

export interface ServerConfig {
  port: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  environment: 'development' | 'production' | 'test';
}