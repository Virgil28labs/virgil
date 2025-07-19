/**
 * API and Server Types
 * Shared between frontend and backend
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface ApiError {
  error: string;
  status: number;
  message?: string;
  path?: string;
  timestamp?: string;
}

// Chat API Types
export interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  success: boolean;
  message: {
    role: "assistant";
    content: string;
  };
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// Health Check Types
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  service: string;
  configured: boolean;
  timestamp: string;
}

// Analytics Types
export interface AnalyticsEventProperties {
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AnalyticsEvent {
  event: string;
  userId?: string;
  timestamp: string;
  properties?: AnalyticsEventProperties;
}

export interface AnalyticsResponse {
  success: boolean;
  eventId: string;
}

// LLM API Types (for internal server use)
export interface LLMCompleteRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  context?: {
    conversation_id?: string;
    session_id?: string;
    metadata?: Record<string, string | number | boolean>;
  };
  provider: string;
}

export interface LLMCompleteResponse {
  content: string;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model: string;
  finish_reason: string;
}

// Model Types
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  description?: string;
}

export interface ModelsResponse {
  success: boolean;
  data: Record<string, string[]>;
}

// Token Count Types
export interface TokenizeRequest {
  text: string;
  model?: string;
}

export interface TokenizeResponse {
  success: boolean;
  data: {
    text: string;
    model: string;
    tokenCount: number;
  };
}

// Batch Request Types
export interface BatchRequest {
  requests: LLMCompleteRequest[];
}

export interface BatchResponse {
  success: boolean;
  data: Array<LLMCompleteResponse | { error: string }>;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// Request Context Types
export interface RequestContext {
  ip: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
}
