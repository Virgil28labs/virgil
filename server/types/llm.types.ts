// Server-side LLM types
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  provider: string;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model: string;
  finish_reason: string;
}

export interface LLMStreamChunk {
  content?: string;
  done: boolean;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface LLMProviderConfig {
  url: string;
  headers: () => Record<string, string>;
  models: string[];
}

export interface LLMProviders {
  openai: LLMProviderConfig;
  anthropic: LLMProviderConfig;
  ollama: LLMProviderConfig;
}

export interface LLMProxyOptions {
  providers?: Partial<LLMProviders>;
  defaultProvider?: string;
  timeout?: number;
  retries?: number;
}

export interface LLMAnalytics {
  provider: string;
  model: string;
  latency: number;
  tokens: number;
  error?: string;
}

/* eslint-disable no-unused-vars */
export interface LLMCache {
  get: (key: string) => Promise<LLMResponse | null>;
  set: (key: string, value: LLMResponse, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}
/* eslint-enable no-unused-vars */
