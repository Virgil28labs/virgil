import { SupabaseMemoryService } from './SupabaseMemoryService';
import type { MarkedMemory } from './SupabaseMemoryService';
import { vectorService } from './vectorService';
import type { ChatMessage } from '../types/chat.types';
import type { VectorSearchResult } from './vectorService';
import { timeService } from './TimeService';
import { dashboardContextService } from './DashboardContextService';
// Removed unused import: DynamicContextBuilder
import { logger } from '../lib/logger';
import { VectorHealthService } from './vector/VectorHealthService';
import { VectorConfidenceService } from './vector/VectorConfidenceService';
import { VectorSummaryService } from './vector/VectorSummaryService';
import { 
  MIN_MESSAGE_LENGTH as MIN_MSG_LENGTH,
  CONTEXT_SEARCH_LIMIT as CONTEXT_LIMIT,
  MAX_CONTENT_PREVIEW_LENGTH,
} from '../constants/timing';

export interface VectorMemory {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  context?: string;
  similarity?: number;
}

export class VectorMemoryServiceRefactored extends SupabaseMemoryService {
  private static instance: VectorMemoryServiceRefactored;
  private readonly MIN_MESSAGE_LENGTH = MIN_MSG_LENGTH;
  private readonly CONTEXT_SEARCH_LIMIT = CONTEXT_LIMIT;
  private healthService: VectorHealthService;
  private confidenceService: VectorConfidenceService;
  private summaryService: VectorSummaryService;

  constructor() {
    super();
    this.healthService = new VectorHealthService();
    this.confidenceService = new VectorConfidenceService();
    this.summaryService = new VectorSummaryService();
    this.summaryService.scheduleDailySummary();
  }

  static getInstance(): VectorMemoryServiceRefactored {
    if (!VectorMemoryServiceRefactored.instance) {
      VectorMemoryServiceRefactored.instance = new VectorMemoryServiceRefactored();
    }
    return VectorMemoryServiceRefactored.instance;
  }

  async waitForHealthCheck(): Promise<boolean> {
    return this.healthService.waitForHealthCheck();
  }

  async storeMessageWithEmbedding(message: ChatMessage): Promise<void> {
    // Skip if vector service is not healthy
    if (!this.healthService.isHealthy()) {
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
      logger.error('Failed to store message embedding', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryServiceRefactored',
        action: 'storeMessageWithEmbedding',
      });
    }
  }

  async searchSimilarMemories(query: string, limit = 10): Promise<VectorMemory[]> {
    if (!this.healthService.isHealthy()) {
      return [];
    }

    try {
      const results = await vectorService.search(query, limit);
      return results.map(result => this.parseVectorResult(result));
    } catch (error) {
      logger.error('Failed to search similar memories', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryServiceRefactored',
        action: 'searchSimilarMemories',
      });
      return [];
    }
  }

  async getEnhancedContext(userQuery: string): Promise<string> {
    const contextParts: string[] = [];

    // 1. Get dashboard context
    const dashboardContext = dashboardContextService.getContext();
    contextParts.push(`Current Environment: ${JSON.stringify(dashboardContext, null, 2)}`);

    // 2. Search for similar memories
    const similarMemories = await this.searchSimilarMemories(userQuery, this.CONTEXT_SEARCH_LIMIT);
    
    if (similarMemories.length > 0) {
      const memoryContext = similarMemories
        .map(m => {
          const preview = m.content.substring(0, MAX_CONTENT_PREVIEW_LENGTH);
          const timeAgo = this.getRelativeTime(m.timestamp);
          return `[${timeAgo}] ${m.role}: ${preview}${m.content.length > MAX_CONTENT_PREVIEW_LENGTH ? '...' : ''}`;
        })
        .join('\n');
      
      contextParts.push(`Related Conversations:\n${memoryContext}`);
    }

    // 3. Get recent important memories
    const recentMemories = await this.getRecentMarkedMemories(3);
    if (recentMemories.length > 0) {
      const recentContext = recentMemories
        .map(m => `- ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
        .join('\n');
      
      contextParts.push(`Recent Important Points:\n${recentContext}`);
    }

    // 4. Add temporal context
    const timeContext = timeService.formatDateToLocal(timeService.getCurrentDateTime());
    contextParts.push(`Temporal Context: Current time: ${timeContext}`);

    return contextParts.join('\n\n');
  }

  async syncImportantMemories(): Promise<void> {
    try {
      const memories = await this.getMarkedMemories();
      
      for (const memory of memories) {
        // Store in vector service - simplified approach
        await vectorService.store(memory.content);
      }

      logger.info('Synced important memories to vector store', {
        component: 'VectorMemoryServiceRefactored',
        action: 'syncImportantMemories',
        metadata: { count: memories.length },
      });
    } catch (error) {
      logger.error('Failed to sync important memories', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryServiceRefactored',
        action: 'syncImportantMemories',
      });
    }
  }

  async getVectorMemoryStats(): Promise<{ count: number; healthy: boolean }> {
    try {
      const count = await vectorService.getCount();
      return {
        count,
        healthy: this.healthService.isHealthy(),
      };
    } catch (error) {
      logger.error('Failed to get vector memory stats', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryServiceRefactored',
        action: 'getVectorMemoryStats',
      });
      return { count: 0, healthy: false };
    }
  }

  private shouldStoreAsVector(message: ChatMessage): boolean {
    // Skip short messages
    if (message.content.length < this.MIN_MESSAGE_LENGTH) {
      return false;
    }

    // Skip repetitive or low-value content
    const lowValuePatterns = [
      /^(yes|no|ok|okay|sure|thanks|thank you|hello|hi|hey|bye)$/i,
      /^(loading|thinking|processing|please wait)/i,
      /^test$/i,
    ];

    if (lowValuePatterns.some(pattern => pattern.test(message.content.trim()))) {
      return false;
    }

    // Store messages with questions
    if (message.content.includes('?')) {
      return true;
    }

    // Store messages with important keywords
    const importantKeywords = [
      'remember', 'important', 'note', 'todo', 'meeting',
      'deadline', 'password', 'address', 'phone', 'email',
      'birthday', 'anniversary', 'appointment',
    ];

    const contentLower = message.content.toLowerCase();
    if (importantKeywords.some(keyword => contentLower.includes(keyword))) {
      return true;
    }

    // Store longer assistant responses (likely to contain valuable information)
    if (message.role === 'assistant' && message.content.length > 200) {
      return true;
    }

    // Store user messages that are substantial
    if (message.role === 'user' && message.content.length > 50) {
      return true;
    }

    return false;
  }

  private createMessageContext(message: ChatMessage): string {
    const contextParts: string[] = [];

    // Add temporal context
    const messageDate = timeService.parseDate(String(message.timestamp)) || timeService.getCurrentDateTime();
    contextParts.push(`Date: ${timeService.formatDateToLocal(messageDate)}`);
    contextParts.push(`Time: ${timeService.formatTimeToLocal(messageDate)}`);

    // Add role context
    contextParts.push(`Role: ${message.role}`);

    // Add any existing context - ChatMessage doesn't have context property
    // so we skip this for now

    return contextParts.join(', ');
  }

  private parseVectorResult(result: VectorSearchResult): VectorMemory {
    // Extract the original content (before context was added)
    const contentMatch = result.content.match(/^(.+?)\n\[Context:/s);
    const content = contentMatch ? contentMatch[1] : result.content;

    // Extract context information
    const contextMatch = result.content.match(/\[Context: (.+?)\]/);
    const contextStr = contextMatch ? contextMatch[1] : '';

    // Parse role from context
    const roleMatch = contextStr.match(/Role: (user|assistant)/);
    const role = (roleMatch ? roleMatch[1] : 'user') as 'user' | 'assistant';

    // Parse timestamp from context
    const dateMatch = contextStr.match(/Date: ([^,]+)/);
    const timeMatch = contextStr.match(/Time: ([^,]+)/);
    let timestamp = timeService.getTimestamp();
    if (dateMatch && timeMatch) {
      const parsedDate = timeService.parseDate(`${dateMatch[1]} ${timeMatch[1]}`);
      if (parsedDate && !isNaN(parsedDate.getTime())) { // eslint-disable-line no-restricted-syntax -- Valid use: checking parsed Date object validity
        timestamp = parsedDate.getTime(); // eslint-disable-line no-restricted-syntax -- Valid use: getting timestamp from parsed Date object
      }
    }

    return {
      id: result.id,
      content,
      role,
      timestamp,
      context: contextStr,
      similarity: result.similarity,
    };
  }

  private getRelativeTime(timestamp: number): string {
    const now = timeService.getTimestamp();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  // Delegate to specialized services
  async createDailySummary(date?: Date): Promise<string> {
    return this.summaryService.createDailySummary(date);
  }

  async getSummaries(startDate: Date, endDate: Date): Promise<MarkedMemory[]> {
    return this.summaryService.getSummaries(startDate, endDate);
  }

  async getSemanticConfidenceBatch(
    queries: string[],
    withCache = true,
  ): Promise<Map<string, number>> {
    return this.confidenceService.getSemanticConfidenceBatch(queries, withCache);
  }

  async getUserPatterns(): Promise<{
    topics: string[];
    peakHours: number[];
    averageMessageLength: number;
    preferredApps: string[];
  }> {
    try {
      const recentMessages = await this.getRecentMessages(100);
      const recentMemories = recentMessages;
      
      // Analyze topics
      const topics = new Set<string>();
      const hourCounts = new Map<number, number>();
      let totalLength = 0;

      recentMemories.forEach(memory => {
        // Extract topics
        const topicPatterns = [
          { pattern: /weather/gi, topic: 'Weather' },
          { pattern: /code|programming/gi, topic: 'Programming' },
          { pattern: /music|song/gi, topic: 'Music' },
          { pattern: /photo|camera/gi, topic: 'Photography' },
          { pattern: /habit|streak/gi, topic: 'Habits' },
        ];

        topicPatterns.forEach(({ pattern, topic }) => {
          if (pattern.test(memory.content)) {
            topics.add(topic);
          }
        });

        // Track app usage - skip for now since messages don't have app info
        
        // Track active hours
        const hour = timeService.getHours(timeService.parseDate(String(memory.timestamp)) || timeService.getCurrentDateTime());
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

        // Track message length
        totalLength += memory.content.length;
      });

      // Find peak hours
      const sortedHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      // Find preferred apps - return empty array for now
      const preferredApps: string[] = [];

      return {
        topics: Array.from(topics),
        peakHours: sortedHours,
        averageMessageLength: Math.round(totalLength / Math.max(recentMemories.length, 1)),
        preferredApps,
      };
    } catch (error) {
      logger.error('Failed to analyze user patterns', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryServiceRefactored',
        action: 'getUserPatterns',
      });
      return {
        topics: [],
        peakHours: [],
        averageMessageLength: 0,
        preferredApps: [],
      };
    }
  }

  private async getRecentMarkedMemories(limit: number): Promise<MarkedMemory[]> {
    const memories = await this.getMarkedMemories();
    return memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Cleanup
  destroy(): void {
    this.summaryService.stopScheduler();
  }
}