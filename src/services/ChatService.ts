/**
 * ChatService - Handles chat API communication and message processing
 *
 * Extracted from VirgilChatbot to improve testability and separation of concerns
 */

import type { ChatMessage } from '../types/chat.types';
import { dedupeFetch } from '../lib/requestDeduplication';
import { dashboardAppService, CONFIDENCE_THRESHOLDS } from './DashboardAppService';
import { dashboardContextService } from './DashboardContextService';
import { timeService } from './TimeService';
import { logger } from '../lib/logger';

export interface ChatApiRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatApiResponse {
  success: boolean;
  message?: {
    content: string;
    confidence?: number;
  };
  error?: string;
}

export class ChatService {
  private readonly apiUrl: string;
  private readonly defaultMaxTokens = 200;
  private readonly defaultTemperature = 0.7;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
  }

  /**
   * Send a message to the chat API
   * @param userMessage - The user's message
   * @param systemPrompt - The system prompt with context
   * @param previousMessages - Previous messages in the conversation
   * @param model - The selected model ID
   * @returns The assistant's response message
   * @throws Error if the API request fails
   */
  async sendMessage(
    userMessage: string,
    systemPrompt: string,
    previousMessages: ChatMessage[],
    model: string,
  ): Promise<ChatMessage> {
    if (!userMessage.trim()) {
      throw new Error('Message cannot be empty');
    }

    // Check if this might be a multi-intent query
    const multiIntentResult = await this.checkMultiIntent(userMessage);
    
    if (multiIntentResult) {
      // Handle multi-intent query
      logger.info('Multi-intent query detected', {
        component: 'ChatService',
        action: 'sendMessage',
        metadata: {
          userMessage: userMessage.substring(0, 50),
          intents: multiIntentResult.intents.map(i => ({ app: i.adapter.appName, confidence: i.confidence })),
        },
      });
      
      // Create response that addresses multiple intents
      const multiResponse = await this.handleMultiIntent(userMessage, multiIntentResult.intents);
      if (multiResponse) {
        return this.createAssistantMessage(multiResponse, multiIntentResult.avgConfidence);
      }
    }
    
    // Check dashboard apps with confidence-based routing
    let appMatches: Array<{ adapter: any; confidence: number }> = [];
    try {
      appMatches = await dashboardAppService.getAppsWithConfidence(userMessage);
    } catch (error) {
      logger.warn('Failed to get app confidence scores, continuing without app routing', {
        component: 'ChatService',
        action: 'sendMessage',
        metadata: { 
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    
    if (appMatches.length > 0) {
      const bestMatch = appMatches[0]; // Already sorted by confidence
      
      // Log routing decision
      logger.info('Chat routing decision', {
        component: 'ChatService',
        action: 'sendMessage',
        metadata: {
          userMessage: userMessage.substring(0, 50),
          bestMatchApp: bestMatch.adapter.appName,
          confidence: bestMatch.confidence,
          routingDecision: bestMatch.confidence >= CONFIDENCE_THRESHOLDS.HIGH ? 'DIRECT_RESPONSE' :
            bestMatch.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM ? 'ENHANCED_CONTEXT' : 'NO_ROUTING',
        },
      });
      
      // Only respond directly if high confidence
      if (bestMatch.confidence >= CONFIDENCE_THRESHOLDS.HIGH && bestMatch.adapter.getResponse) {
        try {
          const response = await bestMatch.adapter.getResponse(userMessage);
          if (response) {
            logger.info('Direct adapter response used', {
              component: 'ChatService',
              action: 'sendMessage',
              metadata: {
                appName: bestMatch.adapter.appName,
                confidence: bestMatch.confidence,
                responseLength: response.length,
              },
            });
            return this.createAssistantMessage(response, bestMatch.confidence);
          }
        } catch (error) {
          logger.error(`Error getting response from ${bestMatch.adapter.appName}`, error as Error, {
            component: 'ChatService',
            action: 'sendMessage',
            metadata: { 
              appName: bestMatch.adapter.appName,
              confidence: bestMatch.confidence,
            },
          });
        }
      }
      // For medium confidence, enhance system prompt with app context
      else if (bestMatch.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        const appContext = bestMatch.adapter.getContextData?.();
        if (appContext) {
          // Add relevant app context to the system prompt
          systemPrompt += `\n\nRelevant App Context: ${appContext.displayName} - ${appContext.summary}`;
          if (appContext.data) {
            systemPrompt += '\n(User may be asking about this app\'s data, use this context to provide a more helpful response)';
          }
          
          logger.debug('Enhanced context with app data', {
            component: 'ChatService',
            action: 'sendMessage',
            metadata: {
              appName: bestMatch.adapter.appName,
              confidence: bestMatch.confidence,
              contextAdded: true,
            },
          });
        }
      }
      // Low confidence (<0.5) apps are filtered out by getAppsWithConfidence()
    }

    // Prepare API messages
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    // Make API request
    const requestBody: ChatApiRequest = {
      model,
      messages: apiMessages,
      max_tokens: this.defaultMaxTokens,
      temperature: this.defaultTemperature,
    };

    try {
      const response = await dedupeFetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as ChatApiResponse;
        const errorMessage = errorData.error || `Chat service error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json() as ChatApiResponse;

      if (!data.success || !data.message) {
        throw new Error('Invalid response from chat service');
      }

      return this.createAssistantMessage(data.message.content, data.message.confidence);
    } catch (error) {
      logger.error('Failed to send chat message', error as Error, {
        component: 'ChatService',
        action: 'sendMessage',
        metadata: { model, messageLength: userMessage.length },
      });
      // Re-throw with a user-friendly message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Create a new assistant message
   */
  private createAssistantMessage(content: string, confidence?: number): ChatMessage {
    const now = dashboardContextService.getCurrentDateTime();
    return {
      id: `${dashboardContextService.getTimestamp()}-assistant`,
      role: 'assistant',
      content,
      timestamp: timeService.toISOString(now),
      confidence,
    };
  }

  /**
   * Create a new user message
   */
  createUserMessage(content: string): ChatMessage {
    const now = dashboardContextService.getCurrentDateTime();
    return {
      id: `${dashboardContextService.getTimestamp()}-user`,
      role: 'user',
      content,
      timestamp: timeService.toISOString(now),
    };
  }

  /**
   * Create a fallback error message
   */
  createFallbackMessage(): ChatMessage {
    const now = dashboardContextService.getCurrentDateTime();
    return {
      id: `${dashboardContextService.getTimestamp()}-fallback`,
      role: 'assistant',
      content: "I'm having trouble connecting right now. Please try again in a moment!",
      timestamp: timeService.toISOString(now),
    };
  }
  
  /**
   * Check if a query contains multiple intents
   */
  private async checkMultiIntent(query: string): Promise<{ intents: Array<{ adapter: any; confidence: number }>; avgConfidence: number } | null> {
    // Common multi-intent patterns
    const multiPatterns = [
      /\band\b/i,
      /,\s*and\s*/i,
      /\balso\b/i,
      /\bplus\b/i,
      /\bas well as\b/i,
      /\bthen\b/i,
      /\bafter that\b/i,
    ];
    
    // Check if query matches multi-intent patterns
    const hasMultiPattern = multiPatterns.some(pattern => pattern.test(query));
    if (!hasMultiPattern) return null;
    
    // Get all app matches
    let allMatches: Array<{ adapter: any; confidence: number }> = [];
    try {
      allMatches = await dashboardAppService.getAppsWithConfidence(query);
    } catch (error) {
      logger.debug('Failed to check multi-intent during initialization', {
        component: 'ChatService',
        action: 'checkMultiIntent',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      return null;
    }
    
    // Filter for apps with at least medium confidence
    const significantMatches = allMatches.filter(match => match.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM);
    
    // If we have 2+ significant matches, it's likely multi-intent
    if (significantMatches.length >= 2) {
      const avgConfidence = significantMatches.reduce((sum, m) => sum + m.confidence, 0) / significantMatches.length;
      return {
        intents: significantMatches,
        avgConfidence,
      };
    }
    
    return null;
  }
  
  /**
   * Handle multi-intent queries by aggregating responses
   */
  private async handleMultiIntent(query: string, intents: Array<{ adapter: any; confidence: number }>): Promise<string | null> {
    const responses: string[] = [];
    
    // Try to get responses from each intent
    for (const intent of intents) {
      if (intent.adapter.getResponse) {
        try {
          const response = await intent.adapter.getResponse(query);
          if (response) {
            responses.push(`**${intent.adapter.displayName}**: ${response}`);
          }
        } catch (error) {
          logger.error(`Error getting multi-intent response from ${intent.adapter.appName}`, error as Error, {
            component: 'ChatService',
            action: 'handleMultiIntent',
          });
        }
      }
    }
    
    // If we got multiple responses, combine them
    if (responses.length > 1) {
      return responses.join('\n\n');
    } else if (responses.length === 1) {
      // Single response, return without formatting
      return responses[0].replace(/^\*\*.*?\*\*:\s*/, '');
    }
    
    return null;
  }

  /**
   * Validate if the API URL is accessible
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const chatService = new ChatService();
