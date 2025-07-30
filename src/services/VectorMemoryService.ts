import { SupabaseMemoryService } from './SupabaseMemoryService';
import { vectorService } from './vectorService';
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

export class VectorMemoryService extends SupabaseMemoryService {
  private static instance: VectorMemoryService;
  private isVectorServiceHealthy = false;
  private healthCheckPromise: Promise<void>;
  private readonly MIN_MESSAGE_LENGTH = 50; // Minimum chars to store as vector
  private readonly CONTEXT_SEARCH_LIMIT = 5; // Number of memories to retrieve for context
  private readonly CONFIDENCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private confidenceCache = new Map<string, { confidence: number; timestamp: number }>();

  constructor() {
    super();
    this.healthCheckPromise = this.checkVectorServiceHealth();
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
   * Wait for the health check to complete and return the result
   */
  async waitForHealthCheck(): Promise<boolean> {
    await this.healthCheckPromise;
    return this.isVectorServiceHealthy;
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
      // Don't show error to user - this is a background operation
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
   * Sync important memories from Supabase to vector storage
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

      logger.info(`Synced ${markedMemories.length} memories`, {
        component: 'VectorMemoryService',
        action: 'syncMemories',
        metadata: { count: markedMemories.length },
      });
    } catch (error) {
      logger.error('Failed to sync memories', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'syncMemories',
      });
      // Don't show error to user - this is a background operation
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

  /**
   * Store intent embedding for semantic confidence matching
   */
  async storeIntentEmbedding(intent: string, examples: string[]): Promise<void> {
    // Wait for health check to complete
    await this.healthCheckPromise;
    
    if (!this.isVectorServiceHealthy) {
      logger.warn('Vector service not healthy, skipping intent storage');
      return;
    }

    try {
      // Combine examples into a single text for better embedding
      const combinedText = examples.join(' | ');
      const contentWithMetadata = `${combinedText}\n[Intent: ${intent}]`;

      // Store in vector database
      await vectorService.store(contentWithMetadata);

      logger.info(`Stored intent embedding for: ${intent}`, {
        component: 'VectorMemoryService',
        action: 'storeIntent',
        metadata: { intent, exampleCount: examples.length },
      });
    } catch (error) {
      logger.error('Failed to store intent embedding', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'storeIntent',
        metadata: { intent },
      });
    }
  }

  /**
   * Get semantic confidence score for a query against an intent
   */
  async getSemanticConfidence(query: string, intent: string): Promise<number> {
    // Check cache first
    const cacheKey = `${query}::${intent}`;
    const cached = this.confidenceCache.get(cacheKey);
    if (cached && (timeService.getTimestamp() - cached.timestamp < this.CONFIDENCE_CACHE_TTL)) {
      return cached.confidence;
    }

    // Wait for health check to complete
    await this.healthCheckPromise;
    
    if (!this.isVectorServiceHealthy) {
      return 0; // Fallback to keyword matching
    }

    try {
      // Search for similar content with intent filter
      const results = await vectorService.search(query, 1);

      // Filter results that match the intent
      const intentResults = results.filter(result => 
        result.content.includes(`[Intent: ${intent}]`),
      );

      if (intentResults.length === 0) {
        // Cache the zero result
        this.confidenceCache.set(cacheKey, { confidence: 0, timestamp: timeService.getTimestamp() });
        return 0;
      }

      // Return the similarity score (already 0-1 range)
      const confidence = intentResults[0].similarity;
      
      // Cache the result
      this.confidenceCache.set(cacheKey, { confidence, timestamp: timeService.getTimestamp() });
      
      return confidence;
    } catch (error) {
      logger.error('Failed to get semantic confidence', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getSemanticConfidence',
        metadata: { intent },
      });
      
      // Cache the fallback
      this.confidenceCache.set(cacheKey, { confidence: 0, timestamp: timeService.getTimestamp() });
      
      return 0;
    }
  }

  /**
   * Get semantic confidence scores for multiple queries in batch
   * This reduces API calls from N to 1
   */
  async getSemanticConfidenceBatch(
    queries: Array<{ query: string; intent: string }>,
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uncachedQueries: Array<{ query: string; intent: string; cacheKey: string }> = [];

    // Check cache for each query
    for (const { query, intent } of queries) {
      const cacheKey = `${query}::${intent}`;
      const cached = this.confidenceCache.get(cacheKey);
      
      if (cached && (timeService.getTimestamp() - cached.timestamp < this.CONFIDENCE_CACHE_TTL)) {
        results.set(intent, cached.confidence);
      } else {
        uncachedQueries.push({ query, intent, cacheKey });
      }
    }

    // If all results are cached, return early
    if (uncachedQueries.length === 0) {
      return results;
    }

    // Wait for health check
    await this.healthCheckPromise;
    
    if (!this.isVectorServiceHealthy) {
      // Return 0 for all uncached queries
      for (const { intent, cacheKey } of uncachedQueries) {
        results.set(intent, 0);
        this.confidenceCache.set(cacheKey, { confidence: 0, timestamp: timeService.getTimestamp() });
      }
      return results;
    }

    try {
      // Make a single search with the combined query
      // Use the first query as the search query (they should all be the same user query)
      const searchQuery = uncachedQueries[0].query;
      const searchResults = await vectorService.search(searchQuery, 10); // Get more results to match multiple intents

      // Process results for each intent
      for (const { intent, cacheKey } of uncachedQueries) {
        const intentResults = searchResults.filter(result => 
          result.content.includes(`[Intent: ${intent}]`),
        );

        const confidence = intentResults.length > 0 ? intentResults[0].similarity : 0;
        results.set(intent, confidence);
        
        // Cache the result
        this.confidenceCache.set(cacheKey, { confidence, timestamp: timeService.getTimestamp() });
      }
    } catch (error) {
      logger.error('Failed to get semantic confidence batch', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getSemanticConfidenceBatch',
        metadata: { queryCount: uncachedQueries.length },
      });
      
      // Return 0 for all uncached queries
      for (const { intent, cacheKey } of uncachedQueries) {
        results.set(intent, 0);
        this.confidenceCache.set(cacheKey, { confidence: 0, timestamp: timeService.getTimestamp() });
      }
    }

    return results;
  }
}

// Export singleton instance
export const vectorMemoryService = VectorMemoryService.getInstance();
