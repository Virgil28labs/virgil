import type { ChatMessage } from '../types/chat.types';
import type { Database } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { toastService } from './ToastService';
import { dashboardContextService } from './DashboardContextService';
import { timeService } from './TimeService';
import { logger } from '../lib/logger';

export interface StoredConversation {
  id: string;
  messages: ChatMessage[];
  firstMessage: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

export interface MarkedMemory {
  id: string;
  content: string;
  context: string;
  timestamp: number;
  tag?: string;
}

type ConversationRow = Database['public']['Tables']['conversations']['Row'];

export class SupabaseMemoryService {
  private readonly CONTINUOUS_CONVERSATION_ID = 'continuous-main';
  private readonly MAX_RECENT_MESSAGES = 50;
  
  // Performance caching layer
  private recentMessagesCache: ChatMessage[] = [];
  private contextCache: string = '';
  private contextCacheTimestamp: number = 0;
  private readonly CONTEXT_CACHE_DURATION = 30000; // 30 seconds
  private memoriesCache: MarkedMemory[] | null = null;
  private conversationMetaCache: Omit<StoredConversation, 'messages'> | null = null;

  /**
   * Initialize the service - ensure user has a continuous conversation
   */
  async init(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if continuous conversation exists
      const { data: conversation, error: selectError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('local_id', this.CONTINUOUS_CONVERSATION_ID)
        .single();

      // Handle RLS errors specifically
      if (selectError && selectError.code === '406') {
        logger.error('RLS policy blocking access - user may not be authenticated properly', selectError, {
          component: 'SupabaseMemoryService',
          action: 'init',
          metadata: { userId: user.id },
        });
        throw new Error('Authentication error - please try refreshing the page');
      }

      // Only create if conversation doesn't exist (ignore PGRST116 - no rows found)
      if (!conversation && selectError?.code === 'PGRST116') {
        // Use upsert to handle potential race conditions
        const { error: upsertError } = await supabase
          .from('conversations')
          .upsert({
            user_id: user.id,
            local_id: this.CONTINUOUS_CONVERSATION_ID,
            title: 'Continuous Conversation',
            message_count: 0,
          }, {
            onConflict: 'user_id,local_id',
          });

        if (upsertError) {
          // Ignore duplicate key errors (409) as they mean the conversation already exists
          if (upsertError.code !== '23505') { // PostgreSQL unique violation code
            logger.error('Failed to create continuous conversation', upsertError, {
              component: 'SupabaseMemoryService',
              action: 'init',
              metadata: { errorCode: upsertError.code },
            });
            throw upsertError;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Supabase memory service', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'init',
      });
      
      // Only show error toast for non-duplicate errors
      const err = error as Error & { code?: string };
      if (err?.code !== '23505') {
        toastService.memoryError('init', error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Get the continuous conversation with all messages
   */
  async getContinuousConversation(): Promise<StoredConversation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get conversation metadata
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('local_id', this.CONTINUOUS_CONVERSATION_ID)
        .single();

      if (convError) {
        // Handle RLS errors
        if (convError.code === '406') {
          logger.error('RLS policy blocking conversation access', convError, {
            component: 'SupabaseMemoryService',
            action: 'getContinuousConversation',
            metadata: { userId: user.id },
          });
          return null;
        }
        // Return null for "not found" errors
        if (convError.code === 'PGRST116') {
          return null;
        }
        throw convError;
      }

      if (!conversation) {
        return null;
      }

      // Get all messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (msgError) {
        // Handle RLS errors
        if (msgError.code === '406') {
          logger.error('RLS policy blocking message access', msgError, {
            component: 'SupabaseMemoryService',
            action: 'getContinuousConversation',
            metadata: { userId: user.id },
          });
          return null;
        }
        logger.error('Failed to get messages', msgError, {
          component: 'SupabaseMemoryService',
          action: 'getContinuousConversation',
        });
        return null;
      }

      // Convert to ChatMessage format
      const chatMessages: ChatMessage[] = (messages || []).map(msg => ({
        id: msg.local_id || msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp || timeService.toISOString(timeService.getCurrentDateTime()),
      }));

      return {
        id: conversation.local_id || conversation.id,
        messages: chatMessages,
        firstMessage: conversation.first_message || '',
        lastMessage: conversation.last_message || '',
        timestamp: this.dateToTimestamp(conversation.created_at),
        messageCount: conversation.message_count || 0,
      };
    } catch (error) {
      logger.error('Failed to get continuous conversation', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'getContinuousConversation',
      });
      toastService.memoryError('load', error as Error);
      return null;
    }
  }

  /**
   * Save new messages to the conversation
   */
  async saveConversation(newMessages: ChatMessage[]): Promise<void> {
    if (newMessages.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get conversation ID
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, message_count')
        .eq('user_id', user.id)
        .eq('local_id', this.CONTINUOUS_CONVERSATION_ID)
        .single();

      if (convError) {
        // Handle RLS errors
        if (convError.code === '406') {
          logger.error('RLS policy blocking conversation access during save', convError, {
            component: 'SupabaseMemoryService',
            action: 'saveConversation',
            metadata: { userId: user.id },
          });
          throw new Error('Authentication error - please refresh the page');
        }
        // If conversation not found, try to create it
        if (convError.code === 'PGRST116') {
          await this.init(); // Re-initialize to create conversation
          // Retry the query
          const { data: retryConv, error: retryError } = await supabase
            .from('conversations')
            .select('id, message_count')
            .eq('user_id', user.id)
            .eq('local_id', this.CONTINUOUS_CONVERSATION_ID)
            .single();
          
          if (retryError || !retryConv) {
            throw new Error('Failed to find or create continuous conversation');
          }
          // Return the retried conversation
          return this.saveConversation(newMessages);
        } else {
          throw convError;
        }
      }

      if (!conversation) {
        throw new Error('Continuous conversation not found');
      }

      // Update cache immediately for responsiveness
      this.updateRecentMessagesCache(newMessages);
      this.invalidateContextCache();

      // Insert messages
      const messagesToInsert = newMessages.map(msg => ({
        user_id: user.id,
        conversation_id: conversation.id,
        role: msg.role,
        content: msg.content,
        local_id: msg.id,
        timestamp: msg.timestamp || timeService.toISOString(timeService.getCurrentDateTime()),
        metadata: {},
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (insertError) {
        throw insertError;
      }

      // Update conversation metadata
      const userMessages = newMessages.filter(m => m.role === 'user');
      const assistantMessages = newMessages.filter(m => m.role === 'assistant');

      const updates: Partial<ConversationRow> = {
        message_count: (conversation.message_count || 0) + newMessages.length,
        updated_at: timeService.toISOString(timeService.getCurrentDateTime()),
      };

      // Update first message if this is the first message
      if (conversation.message_count === 0 && userMessages.length > 0) {
        updates.first_message = userMessages[0].content.slice(0, 100);
      }

      // Update last message if we have assistant messages
      if (assistantMessages.length > 0) {
        updates.last_message = assistantMessages[assistantMessages.length - 1].content.slice(0, 100);
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversation.id);

      if (updateError) {
        logger.error('Failed to update conversation metadata', updateError, {
          component: 'SupabaseMemoryService',
          action: 'saveConversation',
        });
      }

      // Update metadata cache
      if (this.conversationMetaCache) {
        this.conversationMetaCache.messageCount = updates.message_count || 0;
        if (updates.first_message) {
          this.conversationMetaCache.firstMessage = updates.first_message;
        }
        if (updates.last_message) {
          this.conversationMetaCache.lastMessage = updates.last_message;
        }
      }
    } catch (error) {
      logger.error('Failed to save conversation', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'saveConversation',
      });
      
      // Reset caches on error to maintain consistency
      this.recentMessagesCache = [];
      this.conversationMetaCache = null;
      this.invalidateContextCache();

      toastService.memoryError('save', error as Error);
      throw error;
    }
  }

  /**
   * Mark a message as important memory
   */
  async markAsImportant(_messageId: string, content: string, context: string, tag?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const memory = {
        user_id: user.id,
        content: content.slice(0, 500),
        context: context.slice(0, 200),
        tag,
        importance_score: 0.8,
        local_id: `mem-${timeService.getTimestamp()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const { error } = await supabase
        .from('memories')
        .insert(memory);

      if (error) {
        throw error;
      }

      // Update cache immediately
      if (this.memoriesCache) {
        const markedMemory: MarkedMemory = {
          id: memory.local_id,
          content: memory.content,
          context: memory.context || '',
          timestamp: timeService.getTimestamp(),
          tag: memory.tag,
        };
        this.memoriesCache.unshift(markedMemory);
      }
      this.invalidateContextCache();
      
      toastService.memorySuccess('mark');
    } catch (error) {
      logger.error('Failed to mark memory as important', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'markAsImportant',
      });
      
      // Reset memories cache on error
      this.memoriesCache = null;
      this.invalidateContextCache();

      toastService.memoryError('mark', error as Error);
      throw error;
    }
  }

  /**
   * Get all marked memories
   */
  async getMarkedMemories(): Promise<MarkedMemory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: memories, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get marked memories', error, {
          component: 'SupabaseMemoryService',
          action: 'getMarkedMemories',
        });
        return [];
      }

      return (memories || []).map(mem => ({
        id: mem.local_id || mem.id,
        content: mem.content,
        context: mem.context || '',
        timestamp: this.dateToTimestamp(mem.created_at),
        tag: mem.tag || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get marked memories', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'getMarkedMemories',
      });
      toastService.memoryError('load', error as Error);
      return [];
    }
  }

  /**
   * Get recent messages from cache or database
   */
  async getRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    // Use cache if available and sufficient
    if (this.recentMessagesCache.length >= limit) {
      return this.recentMessagesCache.slice(-limit);
    }

    // If cache is insufficient, load from DB
    const conversation = await this.getContinuousConversation();
    if (!conversation || !conversation.messages.length) return [];

    // Update cache with recent messages
    this.recentMessagesCache = conversation.messages.slice(-this.MAX_RECENT_MESSAGES);

    // Return the requested number of messages
    return this.recentMessagesCache.slice(-limit);
  }

  /**
   * Get context for system prompt
   */
  async getContextForPrompt(): Promise<string> {
    // Return cached context if still valid
    if (this.isContextCacheValid()) {
      return this.contextCache;
    }

    // Get recent messages for active context
    const recentMessages = await this.getRecentMessages(this.MAX_RECENT_MESSAGES);

    // Get memories with caching
    const memories = await this.getMarkedMemoriesCached();

    let context = '';

    // Include recent conversation context
    if (recentMessages.length > 0) {
      context += '\n## Recent Conversation Context:\n';
      const lastMessages = recentMessages.slice(-20);
      lastMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Virgil';
        const content = msg.content.length > 200
          ? msg.content.slice(0, 200) + '...'
          : msg.content;
        context += `${role}: ${content}\n`;
      });
    }

    // Include ALL marked memories
    if (memories.length > 0) {
      context += '\n## Important Information to Remember:\n';
      memories.forEach(mem => {
        context += `- ${mem.content}`;
        if (mem.context) {
          context += ` (${mem.context})`;
        }
        context += '\n';
      });
    }

    // Cache the result
    this.contextCache = context;
    this.contextCacheTimestamp = dashboardContextService.getTimestamp();

    return context;
  }

  /**
   * Forget a specific memory
   */
  async forgetMemory(memoryId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Try to delete by local_id first, then by id
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('user_id', user.id)
        .or(`local_id.eq.${memoryId},id.eq.${memoryId}`);

      if (error) {
        throw error;
      }

      // Update cache immediately
      if (this.memoriesCache) {
        this.memoriesCache = this.memoriesCache.filter(mem => mem.id !== memoryId);
      }
      this.invalidateContextCache();
      
      toastService.memorySuccess('forget');
    } catch (error) {
      logger.error('Failed to forget memory', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'forgetMemory',
      });
      
      // Reset cache on error
      this.memoriesCache = null;
      this.invalidateContextCache();

      toastService.memoryError('forget', error as Error);
      throw error;
    }
  }

  /**
   * Export all data
   */
  async exportAllData(): Promise<{ conversations: StoredConversation[]; memories: MarkedMemory[] }> {
    try {
      const conversation = await this.getContinuousConversation();
      const memories = await this.getMarkedMemories();

      toastService.memorySuccess('export');
      return {
        conversations: conversation ? [conversation] : [],
        memories,
      };
    } catch (error) {
      logger.error('Failed to export data', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'exportAllData',
      });
      toastService.memoryError('export', error as Error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete all memories
      await supabase
        .from('memories')
        .delete()
        .eq('user_id', user.id);

      // Delete all messages
      await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);

      // Reset conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('local_id', this.CONTINUOUS_CONVERSATION_ID)
        .single();

      if (conversation) {
        await supabase
          .from('conversations')
          .update({
            message_count: 0,
            first_message: null,
            last_message: null,
            updated_at: timeService.toISOString(timeService.getCurrentDateTime()),
          })
          .eq('id', conversation.id);
      }

      // Clear all caches
      this.recentMessagesCache = [];
      this.contextCache = '';
      this.contextCacheTimestamp = 0;
      this.memoriesCache = null;
      this.conversationMetaCache = null;

      toastService.memorySuccess('clear');
    } catch (error) {
      logger.error('Failed to clear all data', error as Error, {
        component: 'SupabaseMemoryService',
        action: 'clearAllData',
      });
      
      // Still reset caches even if DB operation failed
      this.recentMessagesCache = [];
      this.contextCache = '';
      this.contextCacheTimestamp = 0;
      this.memoriesCache = null;
      this.conversationMetaCache = null;

      toastService.memoryError('clear', error as Error);
      throw error;
    }
  }

  // Compatibility methods
  async getLastConversation(): Promise<StoredConversation | null> {
    return this.getContinuousConversation();
  }

  async getRecentConversations(): Promise<StoredConversation[]> {
    const conversation = await this.getContinuousConversation();
    return conversation ? [conversation] : [];
  }

  async searchConversations(query: string): Promise<StoredConversation[]> {
    if (!query.trim()) return [];

    const conversation = await this.getContinuousConversation();
    if (!conversation) return [];

    const searchTerm = query.toLowerCase();
    const hasMatch = conversation.messages.some(msg =>
      msg.content.toLowerCase().includes(searchTerm),
    );

    return hasMatch ? [conversation] : [];
  }

  // Cache management methods (private)
  private invalidateContextCache(): void {
    this.contextCache = '';
    this.contextCacheTimestamp = 0;
  }

  private isContextCacheValid(): boolean {
    return !!this.contextCache && 
      (dashboardContextService.getTimestamp() - this.contextCacheTimestamp) < this.CONTEXT_CACHE_DURATION;
  }

  private updateRecentMessagesCache(newMessages: ChatMessage[]): void {
    this.recentMessagesCache.push(...newMessages);

    if (this.recentMessagesCache.length > this.MAX_RECENT_MESSAGES) {
      this.recentMessagesCache = this.recentMessagesCache.slice(-this.MAX_RECENT_MESSAGES);
    }
  }

  private async getMarkedMemoriesCached(): Promise<MarkedMemory[]> {
    if (this.memoriesCache !== null) {
      return this.memoriesCache;
    }

    const memories = await this.getMarkedMemories();
    this.memoriesCache = memories;
    return memories;
  }

  // Utility functions
  private dateToTimestamp(dateString: string | null): number {
    if (!dateString) return timeService.getTimestamp();
    const parsed = timeService.parseDate(dateString);
    // Use valueOf() on the parsed date to get milliseconds since epoch
    return parsed ? Math.floor(parsed.valueOf()) : timeService.getTimestamp();
  }

  static timeAgo(timestamp: number): string {
    return timeService.getTimeAgo(timeService.fromTimestamp(timestamp));
  }
}

// Singleton instance
export const supabaseMemoryService = new SupabaseMemoryService();