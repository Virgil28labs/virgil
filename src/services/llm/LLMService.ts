import { ResponseCache } from './utils/cache';
import { RateLimiter } from './utils/rateLimit';
import { EventEmitter } from './utils/eventEmitter';
import { timeService } from '../TimeService';
import { logger } from '../../lib/logger';
import type {
  LLMRequest,
  LLMResponse,
  LLMConfig,
  LLMServiceStats,
  LLMMessage,
  StreamChunk,
} from '../../types/llm.types';

export class LLMService extends EventEmitter {
  private config: LLMConfig;
  private cache: ResponseCache;
  private rateLimiter: RateLimiter;
  private activeRequests: Map<string, { startTime: number }>;

  constructor(config: Partial<LLMConfig> = {}) {
    super();

    this.config = {
      apiUrl: import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1',
      defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
      enableCache: import.meta.env.VITE_ENABLE_CACHE === 'true',
      cacheTTL: parseInt(import.meta.env.VITE_CACHE_TTL || '3600'),
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.cache = new ResponseCache({ ttl: this.config.cacheTTL });
    this.rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60000 });
    this.activeRequests = new Map();
  }

  async complete(options: Partial<LLMRequest>): Promise<LLMResponse> {
    const {
      messages = [],
      model = this.config.defaultModel || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 256,
      stream = false,
      systemPrompt = undefined,
      context = {},
      cacheKey = undefined,
      provider = 'openai',
    } = options;

    // Check rate limit
    if (!this.rateLimiter.checkLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Check cache first
    if (this.config.enableCache && cacheKey && !stream) {
      const cached = await this.cache.get<LLMResponse>(cacheKey);
      if (cached) {
        this.emit('cache-hit', { cacheKey });
        return cached;
      }
    }

    // Format messages with system prompt
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    // Create request
    const requestId = this.generateRequestId();
    const requestBody = {
      messages: formattedMessages,
      model,
      temperature,
      maxTokens,
      context,
      provider,
    };

    try {
      // Track active request
      this.activeRequests.set(requestId, { startTime: timeService.getTimestamp() });
      this.emit('request-start', { requestId, model, provider });

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(
        stream ? '/llm/stream' : '/llm/complete',
        requestBody,
        stream,
      );

      // Cache successful response
      if (this.config.enableCache && cacheKey && !stream) {
        await this.cache.set(cacheKey, response);
      }

      // Track completion
      const requestInfo = this.activeRequests.get(requestId);
      const duration = requestInfo ? timeService.getTimestamp() - requestInfo.startTime : 0;
      this.emit('request-complete', {
        requestId,
        model,
        provider,
        duration,
        tokens: 'usage' in response ? response.usage?.total_tokens : undefined,
      });

      return response as LLMResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to complete LLM request', error as Error, {
        component: 'LLMService',
        action: 'complete',
        metadata: { requestId, model, provider },
      });
      this.emit('request-error', {
        requestId,
        error: errorMessage,
        model,
        provider,
      });
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  async *completeStream(options: Partial<LLMRequest>): AsyncGenerator<StreamChunk, void, unknown> {
    const { messages = [], model = this.config.defaultModel, temperature, maxTokens = 256, context = {}, provider = 'openai' } = options;

    try {
      const response = await this.makeRequestWithRetry(
        '/llm/stream',
        {
          messages: this.formatMessages(messages, options.systemPrompt),
          model,
          temperature,
          maxTokens,
          context,
          provider,
        },
        true,
      );
      const body = (response as Response).body;
      if (!body) {
        throw new Error('Response body is null');
      }
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (parseError) {
              // Skip invalid JSON
              logger.error('Failed to parse stream chunk', parseError as Error, {
                component: 'LLMService',
                action: 'completeStream',
                metadata: { line },
              });
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to complete stream request', error as Error, {
        component: 'LLMService',
        action: 'completeStream',
        metadata: { model, provider },
      });
      this.emit('stream-error', { error: errorMessage });
      throw error;
    }
  }

  private async makeRequestWithRetry(
    endpoint: string,
    body: unknown,
    isStream: boolean = false,
    attempt: number = 1,
  ): Promise<Response | LLMResponse> {
    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(body),
        ...(isStream && { signal: this.createAbortSignal() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      // For streaming responses, return the response object
      if (isStream) {
        return response;
      }

      // For regular responses, parse JSON
      const data = await response.json();
      return data.data || data;

    } catch (error) {
      // Retry logic
      const maxRetries = this.config?.maxRetries ?? 3;
      const retryDelay = this.config?.retryDelay ?? 1000;
      if (error instanceof Error && attempt < maxRetries && this.isRetryableError(error)) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        logger.error(`LLM request retry attempt ${attempt}`, error, {
          component: 'LLMService',
          action: 'makeRequestWithRetry',
          metadata: { endpoint, attempt, delay },
        });
        this.emit('retry', { attempt, delay, error: error.message });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(endpoint, body, isStream, attempt + 1);
      }

      logger.error('LLM request failed after all retries', error as Error, {
        component: 'LLMService',
        action: 'makeRequestWithRetry',
        metadata: { endpoint, attempt, maxRetries },
      });
      throw error;
    }
  }

  private formatMessages(messages: LLMMessage[], systemPrompt?: string): LLMMessage[] {
    if (!systemPrompt) return messages;

    // Check if first message is already a system message
    if (messages.length > 0 && messages[0].role === 'system') {
      return messages;
    }

    // Prepend system prompt
    return [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
  }

  private isRetryableError(error: Error): boolean {
    // Retry on network errors or specific status codes
    return error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('429') || // Rate limit
           error.message.includes('503'); // Service unavailable
  }

  private createAbortSignal(timeoutMs: number = 30000): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  private generateRequestId(): string {
    return `${timeService.getTimestamp()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getModels(): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(`${this.config.apiUrl}/llm/models`);
      if (!response.ok) throw new Error('Failed to fetch models');

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      logger.error('Failed to fetch models', error as Error, {
        component: 'LLMService',
        action: 'getModels',
      });
      this.emit('error', { error: String(error) });
      return {};
    }
  }

  async countTokens(text: string, model: string = this.config.defaultModel || 'gpt-4o-mini'): Promise<number> {
    try {
      const response = await fetch(`${this.config.apiUrl}/llm/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model }),
      });

      if (!response.ok) throw new Error('Failed to count tokens');

      const data = await response.json();
      return data.data?.tokenCount || 0;
    } catch (error) {
      // Fallback to estimation
      logger.error('Failed to count tokens, using estimation', error as Error, {
        component: 'LLMService',
        action: 'countTokens',
        metadata: { model, textLength: text.length },
      });
      return Math.ceil(text.length / 4);
    }
  }

  getStats(): LLMServiceStats {
    return {
      activeRequests: this.activeRequests.size,
      cacheStats: this.cache.getStats(),
      rateLimitStats: { remaining: 0, reset: 0 },
    };
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  destroy(): void {
    this.cache.destroy();
    this.activeRequests.clear();
    this.removeAllListeners();
  }
}
