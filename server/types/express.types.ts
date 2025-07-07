import { Request, Response, NextFunction } from 'express';

// Extended Express types for our application
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    isPremium?: boolean;
  };
}

export interface ApiRequest extends Request {
  body: any;
  query: any;
  params: any;
}

export interface ApiResponse extends Response {
  locals: {
    cached?: boolean;
    requestId?: string;
    startTime?: number;
  };
}

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