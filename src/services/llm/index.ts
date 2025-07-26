import { LLMService } from './LLMService';
import type { LLMRequest, LLMResponse } from '../../types/llm.types';

// Create singleton instance
const llmService = new LLMService();

// Export both the class and singleton instance
export { LLMService, llmService };

// Export convenience methods
export const complete = (options: Partial<LLMRequest>): Promise<LLMResponse> =>
  llmService.complete(options);

export const completeStream = (options: Partial<LLMRequest>): AsyncGenerator<unknown, void, unknown> =>
  llmService.completeStream(options);

export const getModels = (): Promise<Record<string, string[]>> =>
  llmService.getModels();

export const countTokens = (text: string, model?: string): Promise<number> =>
  llmService.countTokens(text, model);
