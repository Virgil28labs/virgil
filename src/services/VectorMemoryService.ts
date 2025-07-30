import { SupabaseMemoryService } from './SupabaseMemoryService';
import type { MarkedMemory } from './SupabaseMemoryService';
import { vectorService } from './vectorService';
import type { ChatMessage } from '../types/chat.types';
import type { VectorSearchResult } from './vectorService';
import { timeService } from './TimeService';
import { dashboardContextService } from './DashboardContextService';
import { DynamicContextBuilder } from './DynamicContextBuilder';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

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
  private readonly CONFIDENCE_CACHE_MAX_SIZE = 1000; // Max entries to prevent memory growth
  private confidenceCache = new Map<string, { confidence: number; timestamp: number }>();
  private lastSummaryDate: string | null = null;
  private initializationPromise: Promise<void> | null = null;
  private intentsInitialized = false;

  constructor() {
    super();
    this.healthCheckPromise = this.checkVectorServiceHealth();
    this.scheduleDailySummary();
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

      // Add category-specific context if query matches a category
      const queryCategory = this.categorizeMessage(userQuery);
      if (queryCategory !== 'General') {
        const categorizedMemories = await this.getMemoriesByCategory();
        const categoryMemories = categorizedMemories.get(queryCategory);
        
        if (categoryMemories && categoryMemories.length > 0) {
          enhancedContext += `\n${queryCategory} history:\n`;
          // Include up to 3 recent memories from the category
          const recentCategoryMemories = categoryMemories.slice(0, 3);
          recentCategoryMemories.forEach((memory, index) => {
            enhancedContext += `${index + 1}. ${memory.content}\n`;
          });
        }
      }

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
      /^(ok|okay|sure|yes|no|maybe)/i,
      /^(got it|understood|i see|oh|ah)/i,
    ];

    if (smallTalkPatterns.some(pattern => pattern.test(message.content))) {
      return false;
    }

    // Important message patterns to always save
    const importantPatterns = [
      // Personal information
      /my (name|email|phone|birthday|address|age)/i,
      /i (am|work|live|like|prefer|want|need)/i,
      /remember (that|this|me)/i,
      
      // Preferences and facts
      /i (always|never|usually|prefer)/i,
      /favorite|important|don't forget/i,
      /please (remember|note|keep in mind)/i,
      
      // Instructions or requests
      /call me|refer to me as/i,
      /when (i|you)|if (i|you)/i,
      /make sure|be sure|always|never/i,
      
      // Contextual information
      /because|since|due to|as a result/i,
      /the reason|that's why|therefore/i,
    ];

    // Always save important messages
    if (importantPatterns.some(pattern => pattern.test(message.content))) {
      return true;
    }

    // Check for information density (questions, facts, explanations)
    const informationIndicators = [
      /\?/, // Questions
      /\d+/, // Numbers/data
      /http[s]?:\/\//, // URLs
      /\.com|\.org|\.net/, // Domains
      /[A-Z]{2,}/, // Acronyms
      /@/, // Email indicators
    ];

    const indicatorCount = informationIndicators.filter(pattern => 
      pattern.test(message.content),
    ).length;

    // Save if message has high information density
    return indicatorCount >= 2 || message.content.length > 200;
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
   * Initialize core intent embeddings for semantic matching
   * This should be called once during app setup
   */
  async initializeIntentEmbeddings(): Promise<void> {
    // If already initialized, return immediately
    if (this.intentsInitialized) {
      logger.debug('Intent embeddings already initialized, skipping', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
        metadata: {
          alreadyInitialized: true,
        },
      });
      return;
    }

    // If initialization is already in progress, return the existing promise
    if (this.initializationPromise) {
      logger.debug('Intent initialization already in progress, waiting...', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
        metadata: {
          caller: 'duplicate-request',
          existingPromise: true,
        },
      });
      return this.initializationPromise;
    }

    // Log the stack trace to find who's calling this
    logger.debug('Creating new intent initialization promise', {
      component: 'VectorMemoryService',
      action: 'initializeIntentEmbeddings',
      metadata: {
        stackTrace: new Error().stack?.split('\n').slice(2, 7).join(' | '),
      },
    });

    // Create a new initialization promise
    this.initializationPromise = this.performIntentInitialization();
    
    try {
      await this.initializationPromise;
    } catch (error) {
      // Reset the promise on error so it can be retried
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual intent initialization
   */
  private async performIntentInitialization(): Promise<void> {
    const startTime = timeService.getTimestamp();
    logger.debug('Starting intent embeddings initialization', {
      component: 'VectorMemoryService',
      action: 'initializeIntentEmbeddings',
      metadata: { timestamp: timeService.toISOString(timeService.fromTimestamp(startTime)) },
    });

    const intents = [
      { 
        intent: 'weather', 
        examples: ['weather', 'temperature', 'cold', 'hot', 'rain', 'sunny', 'forecast', 'climate', 'warm', 'chilly', 'freezing', 'humid', 'cloudy'], 
      },
      { 
        intent: 'time', 
        examples: ['time', 'when', 'today', 'tomorrow', 'schedule', 'date', 'day', 'week', 'month', 'year', 'morning', 'afternoon', 'evening', 'now', 'current time'], 
      },
      { 
        intent: 'location', 
        examples: ['where', 'location', 'address', 'near me', 'nearby', 'place', 'city', 'country', 'coordinates', 'map', 'direction', 'here', 'GPS'], 
      },
      { 
        intent: 'user', 
        examples: ['my name', 'who am i', 'my info', 'about me', 'my profile', 'my email', 'my phone', 'my birthday', 'my age', 'personal information'], 
      },
      {
        intent: 'activity',
        examples: ['doing', 'activity', 'working', 'using', 'current task', 'what am I doing', 'active', 'dashboard', 'features'],
      },
      {
        intent: 'device',
        examples: ['device', 'computer', 'browser', 'operating system', 'OS', 'hardware', 'specs', 'screen', 'resolution', 'CPU', 'memory'],
      },
      {
        intent: 'memory',
        examples: ['remember', 'memory', 'save', 'important', 'mark', 'store', 'recall', 'don\'t forget', 'note', 'keep in mind'],
      },
      {
        intent: 'help',
        examples: ['help', 'how to', 'explain', 'what is', 'guide', 'tutorial', 'instructions', 'teach me', 'show me', 'assistance'],
      },
      {
        intent: 'work',
        examples: ['work', 'job', 'career', 'professional', 'office', 'occupation', 'employer', 'workplace', 'business', 'company'],
      },
      {
        intent: 'hobbies',
        examples: ['hobby', 'interest', 'like to', 'enjoy', 'fun', 'leisure', 'pastime', 'favorite activity', 'free time', 'entertainment'],
      },
      {
        intent: 'relationships',
        examples: ['family', 'friend', 'relationship', 'partner', 'spouse', 'children', 'parents', 'siblings', 'relatives', 'loved ones'],
      },
      {
        intent: 'health',
        examples: ['health', 'medical', 'doctor', 'medicine', 'sick', 'wellness', 'fitness', 'hospital', 'symptoms', 'treatment'],
      },
      {
        intent: 'goals',
        examples: ['goal', 'plan', 'future', 'want to', 'dream', 'aspiration', 'objective', 'ambition', 'target', 'achieve'],
      },
    ];

    // Check if intents are already initialized with a single query
    logger.debug('Checking for existing intent embeddings...', {
      component: 'VectorMemoryService',
      action: 'initializeIntentEmbeddings',
    });
    
    try {
      // Search for any intent marker to quickly check if initialization is needed
      const intentCheck = await vectorService.search('[Intent:', 20); // Get up to 20 results
      
      // Count unique intents found
      const foundIntentSet = new Set<string>();
      intentCheck.forEach(result => {
        const match = result.content.match(/\[Intent: (\w+)\]/);
        if (match && result.similarity > 0.9) {
          foundIntentSet.add(match[1]);
        }
      });
      
      logger.debug('Intent check results', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
        metadata: { 
          foundCount: foundIntentSet.size,
          expectedCount: intents.length,
          checkTime: timeService.getTimestamp() - startTime,
        },
      });
      
      // If we found most intents (80% threshold), skip initialization
      if (foundIntentSet.size >= Math.floor(intents.length * 0.8)) {
        logger.debug('Intent embeddings already initialized, skipping', {
          component: 'VectorMemoryService',
          action: 'initializeIntentEmbeddings',
          metadata: { 
            foundIntents: foundIntentSet.size,
            totalIntents: intents.length,
            checkTimeMs: timeService.getTimestamp() - startTime,
          },
        });
        this.intentsInitialized = true;
        return;
      }
    } catch (_error) {
      // Continue with initialization if search fails
      logger.debug('Intent check failed, proceeding with initialization', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
      });
    }

    // Prepare batch contents for all intents
    const batchContents: string[] = [];
    const intentMapping: Map<number, { intent: string; examples: string[] }> = new Map();
    
    intents.forEach(({ intent, examples }, index) => {
      // Create content with metadata for each intent
      const contentWithMetadata = `${examples.join('\n')}\n[Intent: ${intent}]`;
      batchContents.push(contentWithMetadata);
      intentMapping.set(index, { intent, examples });
    });

    // Store all intents in a single batch operation
    let successCount = 0;
    
    try {
      logger.debug('Storing all intent embeddings in batch', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
        metadata: { intentCount: intents.length },
      });
      
      // Batch store not supported by backend
      throw new Error('Batch store not implemented');
    } catch (error) {
      // If batch fails, fall back to individual storage
      logger.warn('Batch storage failed, falling back to individual storage', {
        component: 'VectorMemoryService',
        action: 'initializeIntentEmbeddings',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
      
      // Reset counts for fallback
      successCount = 0;
      
      for (const { intent, examples } of intents) {
        try {
          await this.storeIntentEmbedding(intent, examples);
          successCount++;
          
          // Small delay to avoid overwhelming the vector service
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.error(`Failed to store intent: ${intent}`, error instanceof Error ? error : new Error(String(error)), {
            component: 'VectorMemoryService',
            action: 'initializeIntentEmbeddings',
            metadata: { intent },
          });
        }
      }
    }

    
    // Mark as initialized if at least some intents were stored successfully
    if (successCount > 0) {
      this.intentsInitialized = true;
    }
    
    logger.info('✓ Intent system ready');
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

      logger.debug(`Stored intent embedding for: ${intent}`, {
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
        this.addToConfidenceCache(cacheKey, 0);
        return 0;
      }

      // Return the similarity score (already 0-1 range)
      const confidence = intentResults[0].similarity;
      
      // Cache the result with size limit enforcement
      this.addToConfidenceCache(cacheKey, confidence);
      
      return confidence;
    } catch (error) {
      logger.error('Failed to get semantic confidence', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getSemanticConfidence',
        metadata: { intent },
      });
      
      // Cache the fallback
      this.addToConfidenceCache(cacheKey, 0);
      
      return 0;
    }
  }

  /**
   * Create a daily summary of conversations
   * Groups messages by topic and extracts key information
   */
  async createDailySummary(date?: Date): Promise<string> {
    const targetDate = date || timeService.getCurrentDateTime();
    const startOfDay = timeService.startOfDay(targetDate);
    const endOfDay = timeService.endOfDay(targetDate);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get all messages from the target day
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', timeService.toISOString(startOfDay))
        .lte('timestamp', timeService.toISOString(endOfDay))
        .order('timestamp', { ascending: true });

      if (error || !messages || messages.length === 0) {
        return `No conversations on ${timeService.formatDateToLocal(targetDate)}`;
      }

      // Group messages into conversation threads (messages within 30 minutes)
      const threads: ChatMessage[][] = [];
      let currentThread: ChatMessage[] = [];
      let lastTimestamp = 0;

      for (const msg of messages) {
        const parsedDate = timeService.parseDate(msg.timestamp || timeService.toISOString(timeService.getCurrentDateTime()));
        const msgTime = parsedDate ? parsedDate.valueOf() : timeService.getTimestamp();
        
        if (lastTimestamp && (msgTime - lastTimestamp) > 30 * 60 * 1000) {
          // New thread if gap > 30 minutes
          if (currentThread.length > 0) {
            threads.push(currentThread);
            currentThread = [];
          }
        }
        
        currentThread.push({
          id: msg.id,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          timestamp: msg.timestamp || timeService.toISOString(timeService.getCurrentDateTime()),
        });
        
        lastTimestamp = msgTime;
      }
      
      if (currentThread.length > 0) {
        threads.push(currentThread);
      }

      // Generate summary
      let summary = `Daily Summary for ${timeService.formatDateToLocal(targetDate)}\n`;
      summary += `Total conversations: ${threads.length}\n`;
      summary += `Total messages: ${messages.length}\n\n`;

      // Analyze each thread
      for (let i = 0; i < threads.length; i++) {
        const thread = threads[i];
        const startTime = timeService.parseDate(thread[0].timestamp);
        const formattedTime = startTime ? timeService.formatTimeToLocal(startTime) : thread[0].timestamp;
        summary += `\nConversation ${i + 1} (${formattedTime}):\n`;
        
        // Extract topics discussed
        const topics = this.extractTopics(thread);
        if (topics.length > 0) {
          summary += `Topics: ${topics.join(', ')}\n`;
        }
        
        // Extract key information shared
        const keyInfo = this.extractKeyInformation(thread);
        if (keyInfo.length > 0) {
          summary += 'Key information:\n';
          keyInfo.forEach(info => summary += `  - ${info}\n`);
        }
        
        // Count exchanges
        const userMessages = thread.filter(m => m.role === 'user').length;
        summary += `Exchanges: ${userMessages} questions/statements\n`;
      }

      // Store the summary as a marked memory
      await this.markAsImportant(
        `summary-${timeService.toISOString(targetDate).split('T')[0]}`,
        summary,
        `Generated summary for ${timeService.formatDateToLocal(targetDate)}`,
        'daily-summary',
      );

      return summary;
    } catch (error) {
      logger.error('Failed to create daily summary', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'createDailySummary',
      });
      throw error;
    }
  }

  /**
   * Extract topics from a conversation thread
   */
  private extractTopics(thread: ChatMessage[]): string[] {
    const topics = new Set<string>();
    
    // Topic patterns - these also serve as our memory categories
    const topicPatterns = [
      { pattern: /weather|temperature|rain|sunny|cold|hot/i, topic: 'Weather' },
      { pattern: /time|date|when|schedule|calendar/i, topic: 'Time/Schedule' },
      { pattern: /location|where|address|place|city/i, topic: 'Location' },
      { pattern: /remember|memory|save|important/i, topic: 'Memory Management' },
      { pattern: /dashboard|app|feature|component/i, topic: 'Dashboard Features' },
      { pattern: /help|how to|explain|what is/i, topic: 'Help/Explanation' },
      { pattern: /my name|personal|profile|information/i, topic: 'Personal Info' },
      { pattern: /work|job|career|professional/i, topic: 'Work/Career' },
      { pattern: /hobby|interest|like to|enjoy/i, topic: 'Hobbies/Interests' },
      { pattern: /family|friend|relationship/i, topic: 'Relationships' },
      { pattern: /health|medical|doctor|medicine/i, topic: 'Health' },
      { pattern: /goal|plan|future|want to/i, topic: 'Goals/Plans' },
    ];

    for (const msg of thread) {
      if (msg.role === 'user') {
        for (const { pattern, topic } of topicPatterns) {
          if (pattern.test(msg.content)) {
            topics.add(topic);
          }
        }
      }
    }

    return Array.from(topics);
  }

  /**
   * Extract key information from messages
   */
  private extractKeyInformation(thread: ChatMessage[]): string[] {
    const keyInfo: string[] = [];
    
    for (const msg of thread) {
      // Look for personal information shared
      const personalInfoMatch = msg.content.match(/my (name is|email is|phone is|birthday is) (.+)/i);
      if (personalInfoMatch) {
        keyInfo.push(`User shared: ${personalInfoMatch[0]}`);
      }
      
      // Look for preferences stated
      const preferenceMatch = msg.content.match(/i (prefer|like|want|need|always|never) (.+)/i);
      if (preferenceMatch && preferenceMatch[0].length < 100) {
        keyInfo.push(`Preference: ${preferenceMatch[0]}`);
      }
      
      // Look for important facts or data
      if (msg.content.includes('remember') || msg.content.includes('important')) {
        const shortened = msg.content.length > 100 
          ? msg.content.substring(0, 97) + '...' 
          : msg.content;
        keyInfo.push(`Important: ${shortened}`);
      }
    }
    
    return keyInfo.slice(0, 5); // Limit to 5 key points
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
        this.addToConfidenceCache(cacheKey, 0);
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
        this.addToConfidenceCache(cacheKey, confidence);
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
        this.addToConfidenceCache(cacheKey, 0);
      }
    }

    return results;
  }

  /**
   * Schedule automatic daily summaries and pattern analysis
   */
  private scheduleDailySummary(): void {
    // Check every hour if we need to create a summary or run pattern analysis
    setInterval(async () => {
      const now = timeService.getCurrentDateTime();
      const currentDate = timeService.toISOString(now).split('T')[0];
      const dayOfWeek = timeService.getDay(now); // 0 = Sunday
      
      // Run summary at 11:30 PM each day
      if (timeService.getHours(now) === 23 && timeService.getMinutes(now) >= 30 && this.lastSummaryDate !== currentDate) {
        try {
          await this.createDailySummary();
          this.lastSummaryDate = currentDate;
          logger.info('Daily summary created successfully', {
            component: 'VectorMemoryService',
            action: 'scheduleDailySummary',
            metadata: { date: currentDate },
          });
          
          // Run pattern analysis on Sundays
          if (dayOfWeek === 0) {
            const { insights } = await this.learnPatternsFromSummaries();
            logger.info('Weekly pattern analysis completed', {
              component: 'VectorMemoryService',
              action: 'learnPatternsFromSummaries',
              metadata: { insightCount: insights.length },
            });
          }
        } catch (error) {
          logger.error('Failed to create scheduled summary or pattern analysis', error instanceof Error ? error : new Error(String(error)), {
            component: 'VectorMemoryService',
            action: 'scheduleDailySummary',
          });
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Get summaries for a date range
   */
  async getSummaries(startDate: Date, endDate: Date): Promise<MarkedMemory[]> {
    try {
      const memories = await this.getMarkedMemories();
      return memories.filter(memory => 
        memory.tag === 'daily-summary' &&
        memory.timestamp >= startDate.valueOf() &&
        memory.timestamp <= endDate.valueOf(),
      );
    } catch (error) {
      logger.error('Failed to get summaries', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getSummaries',
      });
      return [];
    }
  }

  /**
   * Categorize a message based on its content
   */
  private categorizeMessage(content: string): string {
    const categories = [
      { pattern: /weather|temperature|rain|sunny|cold|hot/i, category: 'Weather' },
      { pattern: /time|date|when|schedule|calendar/i, category: 'Time/Schedule' },
      { pattern: /location|where|address|place|city/i, category: 'Location' },
      { pattern: /my name|personal|profile|email|phone|birthday/i, category: 'Personal Info' },
      { pattern: /work|job|career|professional|office/i, category: 'Work/Career' },
      { pattern: /hobby|interest|like to|enjoy|fun/i, category: 'Hobbies/Interests' },
      { pattern: /family|friend|relationship|partner/i, category: 'Relationships' },
      { pattern: /health|medical|doctor|medicine|sick/i, category: 'Health' },
      { pattern: /goal|plan|future|want to|dream/i, category: 'Goals/Plans' },
      { pattern: /remember|important|don't forget|note/i, category: 'Important Notes' },
    ];

    // Check each category pattern
    for (const { pattern, category } of categories) {
      if (pattern.test(content)) {
        return category;
      }
    }

    return 'General'; // Default category
  }

  /**
   * Get memories organized by category
   */
  async getMemoriesByCategory(): Promise<Map<string, MarkedMemory[]>> {
    try {
      const allMemories = await this.getMarkedMemories();
      const categorizedMemories = new Map<string, MarkedMemory[]>();

      for (const memory of allMemories) {
        // Skip daily summaries in category view
        if (memory.tag === 'daily-summary') continue;

        const category = this.categorizeMessage(memory.content);
        
        if (!categorizedMemories.has(category)) {
          categorizedMemories.set(category, []);
        }
        
        const categoryList = categorizedMemories.get(category);
        if (categoryList) {
          categoryList.push(memory);
        }
      }

      // Sort memories within each category by timestamp (newest first)
      for (const [, memories] of categorizedMemories) {
        memories.sort((a, b) => b.timestamp - a.timestamp);
      }

      return categorizedMemories;
    } catch (error) {
      logger.error('Failed to get memories by category', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getMemoriesByCategory',
      });
      return new Map();
    }
  }

  /**
   * Create a category-based summary
   */
  async createCategorySummary(): Promise<string> {
    try {
      const categorizedMemories = await this.getMemoriesByCategory();
      
      let summary = 'Memory Categories Summary\n';
      summary += '========================\n\n';

      // Sort categories by number of memories
      const sortedCategories = Array.from(categorizedMemories.entries())
        .sort(([, a], [, b]) => b.length - a.length);

      for (const [category, memories] of sortedCategories) {
        summary += `${category} (${memories.length} memories)\n`;
        summary += '-'.repeat(category.length + 15) + '\n';
        
        // Show top 3 most recent memories in each category
        const recentMemories = memories.slice(0, 3);
        for (const memory of recentMemories) {
          const date = timeService.fromTimestamp(memory.timestamp);
          const preview = memory.content.length > 80 
            ? memory.content.substring(0, 77) + '...'
            : memory.content;
          summary += `• ${timeService.formatDateToLocal(date)}: ${preview}\n`;
        }
        
        if (memories.length > 3) {
          summary += `  ...and ${memories.length - 3} more memories\n`;
        }
        
        summary += '\n';
      }

      return summary;
    } catch (error) {
      logger.error('Failed to create category summary', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'createCategorySummary',
      });
      throw error;
    }
  }

  /**
   * Learn patterns from conversation summaries
   * Analyzes summaries to identify user behavior patterns and preferences
   */
  async learnPatternsFromSummaries(): Promise<{
    patterns: Map<string, string[]>;
    insights: string[];
  }> {
    try {
      // Get recent summaries (last 7 days)
      const endDate = timeService.getCurrentDateTime();
      const startDate = timeService.subtractDays(endDate, 7);
      
      const summaries = await this.getSummaries(startDate, endDate);
      
      if (summaries.length === 0) {
        return { patterns: new Map(), insights: [] };
      }

      // Pattern tracking
      const timePatterns: string[] = [];
      const topicFrequency = new Map<string, number>();
      const preferences: string[] = [];
      
      // Analyze each summary
      for (const summary of summaries) {
        const content = summary.content.toLowerCase();
        
        // Extract conversation times
        const timeMatches = content.match(/conversation \d+ \((\d{1,2}:\d{2} [ap]m)\)/gi);
        if (timeMatches) {
          timeMatches.forEach((match: string) => {
            const time = match.match(/\d{1,2}:\d{2} [ap]m/i)?.[0];
            if (time) timePatterns.push(time);
          });
        }
        
        // Extract topics
        const topicMatches = content.match(/topics: ([^\n]+)/gi);
        if (topicMatches) {
          topicMatches.forEach((match: string) => {
            const topics = match.replace('topics: ', '').split(', ');
            topics.forEach((topic: string) => {
              topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
            });
          });
        }
        
        // Extract preferences and key information
        const preferenceMatches = content.match(/preference: ([^\n]+)/gi);
        if (preferenceMatches) {
          preferenceMatches.forEach((match: string) => {
            preferences.push(match.replace('preference: ', ''));
          });
        }
      }
      
      // Analyze patterns
      const patterns = new Map<string, string[]>();
      const insights: string[] = [];
      
      // Time patterns
      if (timePatterns.length > 0) {
        // Group by hour
        const hourCounts = new Map<number, number>();
        timePatterns.forEach(time => {
          const hour = parseInt(time.split(':')[0]);
          const isPM = time.includes('pm');
          const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
          hourCounts.set(hour24, (hourCounts.get(hour24) || 0) + 1);
        });
        
        // Find peak hours
        const sortedHours = Array.from(hourCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);
        
        if (sortedHours.length > 0) {
          patterns.set('peak_hours', sortedHours.map(([h]) => `${h}:00`));
          insights.push(`Most active during: ${sortedHours.map(([h]) => {
            if (h === 0) return '12 AM';
            if (h === 12) return '12 PM';
            return h > 12 ? `${h - 12} PM` : `${h} AM`;
          }).join(', ')}`);
        }
      }
      
      // Topic patterns
      const topTopics = Array.from(topicFrequency.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      
      if (topTopics.length > 0) {
        patterns.set('frequent_topics', topTopics.map(([topic]) => topic));
        insights.push(`Most discussed topics: ${topTopics.map(([t, count]) => `${t} (${count}x)`).join(', ')}`);
      }
      
      // User preferences
      if (preferences.length > 0) {
        patterns.set('preferences', preferences);
        insights.push(`Learned ${preferences.length} user preferences`);
      }
      
      // Store pattern insights as a memory
      if (insights.length > 0) {
        const patternSummary = `Pattern Analysis (${timeService.formatDateToLocal(timeService.getCurrentDateTime())})\n` +
          insights.join('\n');
        
        await this.markAsImportant(
          `patterns-${timeService.getTimestamp()}`,
          patternSummary,
          'Weekly pattern analysis from conversation summaries',
          'pattern-analysis',
        );
      }
      
      return { patterns, insights };
    } catch (error) {
      logger.error('Failed to learn patterns from summaries', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'learnPatternsFromSummaries',
      });
      return { patterns: new Map(), insights: [] };
    }
  }

  /**
   * Add to confidence cache with size limit enforcement
   */
  private addToConfidenceCache(key: string, confidence: number): void {
    // Remove expired entries if cache is getting full
    if (this.confidenceCache.size >= this.CONFIDENCE_CACHE_MAX_SIZE) {
      const now = timeService.getTimestamp();
      const entriesToDelete: string[] = [];
      
      // First, try to remove expired entries
      for (const [k, v] of this.confidenceCache.entries()) {
        if (now - v.timestamp > this.CONFIDENCE_CACHE_TTL) {
          entriesToDelete.push(k);
        }
      }
      
      // If no expired entries, remove oldest entries
      if (entriesToDelete.length === 0) {
        const entries = Array.from(this.confidenceCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        // Remove oldest 20% of entries
        const removeCount = Math.floor(this.CONFIDENCE_CACHE_MAX_SIZE * 0.2);
        for (let i = 0; i < removeCount; i++) {
          entriesToDelete.push(entries[i][0]);
        }
      }
      
      // Delete the identified entries
      for (const key of entriesToDelete) {
        this.confidenceCache.delete(key);
      }
    }
    
    // Add the new entry
    this.confidenceCache.set(key, { confidence, timestamp: timeService.getTimestamp() });
  }

  /**
   * Get user behavior patterns
   * Returns learned patterns that can be used to personalize responses
   */
  async getUserPatterns(): Promise<{
    peakHours?: string[];
    frequentTopics?: string[];
    preferences?: string[];
  }> {
    try {
      // Get the most recent pattern analysis
      const memories = await this.getMarkedMemories();
      const patternMemories = memories
        .filter(m => m.tag === 'pattern-analysis')
        .sort((a, b) => b.timestamp - a.timestamp);
      
      if (patternMemories.length === 0) {
        // No patterns yet, run analysis
        const { patterns } = await this.learnPatternsFromSummaries();
        
        return {
          peakHours: patterns.get('peak_hours'),
          frequentTopics: patterns.get('frequent_topics'),
          preferences: patterns.get('preferences'),
        };
      }
      
      // Parse the most recent pattern memory
      const latestPattern = patternMemories[0];
      const content = latestPattern.content;
      
      // Extract patterns from the content
      const peakHoursMatch = content.match(/Most active during: ([^\n]+)/);
      const topicsMatch = content.match(/Most discussed topics: ([^\n]+)/);
      const prefsMatch = content.match(/Learned (\d+) user preferences/);
      
      return {
        peakHours: peakHoursMatch ? peakHoursMatch[1].split(', ') : undefined,
        frequentTopics: topicsMatch ? topicsMatch[1].split(', ').map(t => t.split(' (')[0]) : undefined,
        preferences: prefsMatch ? [`${prefsMatch[1]} preferences learned`] : undefined,
      };
    } catch (error) {
      logger.error('Failed to get user patterns', error instanceof Error ? error : new Error(String(error)), {
        component: 'VectorMemoryService',
        action: 'getUserPatterns',
      });
      return {};
    }
  }
}

// Export singleton instance
export const vectorMemoryService = VectorMemoryService.getInstance();
