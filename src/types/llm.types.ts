/**
 * LLM Service and API Types
 * Covers OpenAI, Anthropic, and other LLM providers
 */

export interface StreamChunk {
  text?: string;
  error?: string;
  done?: boolean;
}

export interface LLMStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason?: string;
  }>;
}

export interface LLMErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
    status?: number;
  };
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  timestamp?: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  context?: {
    conversation_id?: string;
    session_id?: string;
    metadata?: Record<string, string | number | boolean>;
  };
  cacheKey?: string;
  enableCache?: boolean;
  provider?: LLMProvider;
}

export interface LLMResponse {
  content: string;
  usage?: LLMUsage;
  model?: string;
  finish_reason?: string;
  id?: string;
  created?: number;
}

export interface LLMUsage {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface LLMStreamChunk {
  content?: string;
  done: boolean;
  usage?: LLMUsage;
  delta?: {
    content?: string;
    role?: string;
  };
}

export interface LLMConfig {
  apiUrl?: string;
  defaultModel?: string;
  enableCache?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  apiKey?: string;
}

export interface LLMServiceStats {
  activeRequests: number;
  cacheStats?: {
    hits: number;
    misses: number;
    size: number;
  };
  rateLimitStats?: {
    remaining: number;
    reset: number;
  };
}

export interface LLMError {
  message: string;
  status?: number;
  code?: string;
  type?: 'rate_limit' | 'api_error' | 'network_error' | 'invalid_request';
}

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

export interface LLMProviderConfig {
  url: string;
  headers: () => Record<string, string>;
  models: string[];
}

export interface LLMEventData {
  requestId?: string;
  model?: string;
  provider?: LLMProvider;
  duration?: number;
  tokens?: number;
  error?: string;
  cacheKey?: string;
}
