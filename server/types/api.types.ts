// Server API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  configured: boolean;
  timestamp: string;
  uptime?: number;
  version?: string;
}

export interface ChatApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatApiResponse {
  success: boolean;
  message: {
    role: 'assistant';
    content: string;
  };
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface LLMApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  context?: Record<string, any>;
  provider: string;
}

export interface LLMApiResponse {
  success: boolean;
  data: {
    content: string;
    usage: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    };
    model: string;
    finish_reason: string;
  };
  cached?: boolean;
}

export interface ModelsApiResponse {
  success: boolean;
  data: Record<string, string[]>;
}

export interface TokenizeApiRequest {
  text: string;
  model?: string;
}

export interface TokenizeApiResponse {
  success: boolean;
  data: {
    text: string;
    model: string;
    tokenCount: number;
  };
}

export interface AnalyticsApiRequest {
  event: string;
  userId?: string;
  properties?: Record<string, any>;
}

export interface AnalyticsApiResponse {
  success: boolean;
  eventId: string;
}

export interface BatchApiRequest {
  requests: LLMApiRequest[];
}

export interface BatchApiResponse {
  success: boolean;
  data: Array<LLMApiResponse['data'] | { error: string }>;
}