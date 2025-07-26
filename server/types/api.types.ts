// Server API Response Types
export interface ApiResponse<T = unknown> {
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

export interface LLMApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  context?: Record<string, unknown>;
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
