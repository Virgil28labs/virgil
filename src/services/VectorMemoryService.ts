import { MemoryService } from './MemoryService';
import { vectorService } from './vectorService';
import { toastService } from './ToastService';
import type { ChatMessage } from '../types/chat.types';
import type { VectorSearchResult } from './vectorService';
import { timeService } from './TimeService';
import { dashboardContextService } from './DashboardContextService';
import { DynamicContextBuilder } from './DynamicContextBuilder';
import { logger } from '../lib/logger';

export interface VectorMemory {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  context?: string;
  similarity?: number;
}

export class VectorMemoryService extends MemoryService {
  private static instance: VectorMemoryService;
  private isVectorServiceHealthy = false;
  private readonly MIN_MESSAGE_LENGTH = 50; // Minimum chars to store as vector
  private readonly CONTEXT_SEARCH_LIMIT = 5; // Number of memories to retrieve for context

  constructor() {
    super();
    this.checkVectorServiceHealth();
  }

  static getInstance(): VectorMemoryService {
    if (!VectorMemoryService.instance) {
      VectorMemoryService.instance = new VectorMemoryService();
    }
    return VectorMemoryService.instance;
  }

  private async checkVectorServiceHealth(): Promise<void> {
    try {
      this.isVectorServiceHealthy = await vectorService.isHealthy();
    } catch (error) {
      logger.error('Vector service health check failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'checkHealth',
      });
      this.isVectorServiceHealthy = false;
    }
  }

  /**
   * Store a chat message with vector embedding if it meets importance criteria
   */
  async storeMessageWithEmbedding(message: ChatMessage): Promise<void> {
    // Skip if vector service is not healthy
    if (!this.isVectorServiceHealthy) {
      return;
    }

    // Check if message meets criteria for vector storage
    if (!this.shouldStoreAsVector(message)) {
      return;
    }

    try {
      // Create context string
      const context = this.createMessageContext(message);

      // Combine message content with context for better embedding
      const contentWithContext = `${message.content}\n[Context: ${context}]`;

      // Store in vector database
      await vectorService.store(contentWithContext);

      // Log activity
      dashboardContextService.logActivity('Stored semantic memory', 'vector-memory');
    } catch (error) {
      logger.error('Failed to store message with embedding', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'storeMessage',
      });
      // Don't show error to user - this is a background operation
    }
  }

  /**
   * Search for semantically similar memories
   */
  async searchSimilarMemories(query: string, limit = 10): Promise<VectorMemory[]> {
    if (!this.isVectorServiceHealthy) {
      return [];
    }

    try {
      const results = await vectorService.search(query, limit);

      return results.map(result => this.parseVectorResult(result));
    } catch (error) {
      logger.error('Failed to search similar memories', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'searchSimilar',
      });
      toastService.error('Unable to search memories');
      return [];
    }
  }

  /**
   * Get enhanced context for system prompt based on user query
   */
  async getEnhancedContext(userQuery: string): Promise<string> {
    if (!this.isVectorServiceHealthy) {
      // Fall back to regular memory context
      return this.getContextForPrompt();
    }

    try {
      // Get semantically similar memories
      const similarMemories = await this.searchSimilarMemories(userQuery, this.CONTEXT_SEARCH_LIMIT);

      if (similarMemories.length === 0) {
        return this.getContextForPrompt();
      }

      // Build enhanced context
      let enhancedContext = '\n\nRelevant memories:\n';

      similarMemories.forEach((memory, index) => {
        const relevance = memory.similarity ? `(${Math.round(memory.similarity * 100)}% relevant)` : '';
        enhancedContext += `${index + 1}. ${memory.content} ${relevance}\n`;
      });

      // Add regular memory context if available
      const regularContext = await this.getContextForPrompt();
      if (regularContext) {
        enhancedContext = regularContext + enhancedContext;
      }

      return enhancedContext;
    } catch (error) {
      logger.error('Failed to get enhanced context', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getEnhancedContext',
      });
      // Fall back to regular context
      return this.getContextForPrompt();
    }
  }

  /**
   * Sync important memories from IndexedDB to vector storage
   */
  async syncImportantMemories(): Promise<void> {
    if (!this.isVectorServiceHealthy) {
      return;
    }

    try {
      const markedMemories = await this.getMarkedMemories();

      for (const memory of markedMemories) {
        // Check if already synced (could track this with a flag)
        const contentWithContext = `${memory.content}\n[Context: ${memory.context}]`;
        await vectorService.store(contentWithContext);
      }

      toastService.success(`Synced ${markedMemories.length} memories`);
    } catch (error) {
      logger.error('Failed to sync memories', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'syncMemories',
      });
      toastService.error('Unable to sync memories');
    }
  }

  /**
   * Get vector memory statistics
   */
  async getVectorMemoryStats(): Promise<{ count: number; healthy: boolean }> {
    try {
      const count = await vectorService.getCount();
      return { count, healthy: this.isVectorServiceHealthy };
    } catch (error) {
      logger.error('Failed to get vector memory stats', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getStats',
      });
      return { count: 0, healthy: false };
    }
  }

  /**
   * Determine if a message should be stored as a vector
   */
  private shouldStoreAsVector(message: ChatMessage): boolean {
    // Skip short messages
    if (message.content.length < this.MIN_MESSAGE_LENGTH) {
      return false;
    }

    // Skip common greetings and small talk
    const smallTalkPatterns = [
      /^(hi|hello|hey|good morning|good evening)/i,
      /^(thanks|thank you|bye|goodbye)/i,
      /^(how are you|what's up|how's it going)/i,
    ];

    if (smallTalkPatterns.some(pattern => pattern.test(message.content))) {
      return false;
    }

    // Store everything else
    return true;
  }

  /**
   * Create context string for a message
   */
  private createMessageContext(message: ChatMessage): string {
    const dashboardContext = dashboardContextService.getContext();
    // Convert timestamp to Date for formatting
    const parsedDate = timeService.parseDate(message.timestamp);
    const time = parsedDate ? timeService.formatDateToLocal(parsedDate) : message.timestamp;

    let context = `${time}, ${message.role}`;

    if (dashboardContext) {
      const contextSummary = DynamicContextBuilder.createContextSummary(dashboardContext);
      context += `, ${contextSummary}`;
    }

    return context;
  }

  /**
   * Parse vector search result into VectorMemory
   */
  private parseVectorResult(result: VectorSearchResult): VectorMemory {
    // Extract content and context from stored format
    const lines = result.content.split('\n');
    const content = lines[0];
    const contextMatch = result.content.match(/\[Context: (.+)\]/);
    const context = contextMatch ? contextMatch[1] : undefined;

    // Try to determine role from context
    const role = context?.includes('user') ? 'user' : 'assistant';

    return {
      id: result.id,
      content,
      role,
      timestamp: timeService.getTimestamp(), // Vector DB doesn't store timestamp
      context,
      similarity: result.similarity,
    };
  }
}

// Export singleton instance
export const vectorMemoryService = VectorMemoryService.getInstance();
