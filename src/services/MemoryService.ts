import type { ChatMessage } from '../types/chat.types';
import { toastService } from './ToastService';
import { dashboardContextService } from './DashboardContextService';
import { timeService } from './TimeService';

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

export class MemoryService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'VirgilMemory';
  private readonly DB_VERSION = 1;
  private readonly CONTINUOUS_CONVERSATION_ID = 'continuous-main';
  private readonly MAX_RECENT_MESSAGES = 50;  // For context window

  // Performance caching layer
  private recentMessagesCache: ChatMessage[] = [];
  private contextCache: string = '';
  private contextCacheTimestamp: number = 0;
  private readonly CONTEXT_CACHE_DURATION = 30000; // 30 seconds
  private memoriesCache: MarkedMemory[] | null = null;
  private conversationMetaCache: Omit<StoredConversation, 'messages'> | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        const error = request.error;
        toastService.memoryError('init', error as Error);
        reject(error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create marked memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
          memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          memoryStore.createIndex('tag', 'tag', { unique: false });
        }
      };
    });
  }

  async getContinuousConversation(): Promise<StoredConversation | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.get(this.CONTINUOUS_CONVERSATION_ID);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get continuous conversation:', error);
      toastService.memoryError('load', error as Error);
      return null;
    }
  }

  // Cache management methods
  private invalidateContextCache(): void {
    this.contextCache = '';
    this.contextCacheTimestamp = 0;
  }

  private isContextCacheValid(): boolean {
    return !!this.contextCache && (dashboardContextService.getTimestamp() - this.contextCacheTimestamp) < this.CONTEXT_CACHE_DURATION;
  }

  private updateRecentMessagesCache(newMessages: ChatMessage[]): void {
    // Add new messages to cache
    this.recentMessagesCache.push(...newMessages);
    
    // Keep only recent messages in cache
    if (this.recentMessagesCache.length > this.MAX_RECENT_MESSAGES) {
      this.recentMessagesCache = this.recentMessagesCache.slice(-this.MAX_RECENT_MESSAGES);
    }
  }

  async saveConversation(newMessages: ChatMessage[]): Promise<void> {
    if (!this.db || newMessages.length === 0) return;

    try {
      // Get existing metadata (much faster than loading full conversation)
      let existing = this.conversationMetaCache;
      if (!existing) {
        const fullConversation = await this.getContinuousConversation();
        if (fullConversation) {
          existing = {
            id: fullConversation.id,
            firstMessage: fullConversation.firstMessage,
            lastMessage: fullConversation.lastMessage,
            timestamp: fullConversation.timestamp,
            messageCount: fullConversation.messageCount,
          };
          this.conversationMetaCache = existing;
        }
      }

      // Update cache with new messages first (for immediate responsiveness)
      this.updateRecentMessagesCache(newMessages);
      this.invalidateContextCache();

      // Calculate new metadata incrementally
      const newMessageCount = (existing?.messageCount || 0) + newMessages.length;
      const userMessages = newMessages.filter(m => m.role === 'user');
      const assistantMessages = newMessages.filter(m => m.role === 'assistant');
      
      const newFirstMessage = existing?.firstMessage || 
        (userMessages[0]?.content.slice(0, 100) || newMessages[0]?.content.slice(0, 100) || '');
      const newLastMessage = assistantMessages.length > 0 
        ? assistantMessages[assistantMessages.length - 1].content.slice(0, 100)
        : existing?.lastMessage || '';

      // For incremental saving, we need to get the existing messages
      // But we can optimize this by only loading when necessary
      const existingConversation = await this.getContinuousConversation();
      const allMessages = existingConversation ? [...existingConversation.messages, ...newMessages] : newMessages;

      const conversation: StoredConversation = {
        id: this.CONTINUOUS_CONVERSATION_ID,
        messages: allMessages,
        firstMessage: newFirstMessage,
        lastMessage: newLastMessage,
        timestamp: dashboardContextService.getTimestamp(),
        messageCount: newMessageCount,
      };

      // Update metadata cache
      this.conversationMetaCache = {
        id: conversation.id,
        firstMessage: conversation.firstMessage,
        lastMessage: conversation.lastMessage,
        timestamp: conversation.timestamp,
        messageCount: conversation.messageCount,
      };

      // Save to IndexedDB
      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');

      await new Promise<void>((resolve, reject) => {
        const request = store.put(conversation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
      // Reset caches on error to maintain consistency
      this.recentMessagesCache = [];
      this.conversationMetaCache = null;
      this.invalidateContextCache();
      
      toastService.memoryError('save', error as Error);
      throw error;
    }
  }

  // Cached version of getMarkedMemories
  private async getMarkedMemoriesCached(): Promise<MarkedMemory[]> {
    if (this.memoriesCache !== null) {
      return this.memoriesCache;
    }

    const memories = await this.getMarkedMemories();
    this.memoriesCache = memories;
    return memories;
  }

  async markAsImportant(_messageId: string, content: string, context: string, tag?: string): Promise<void> {
    if (!this.db) return;

    try {
      const timestamp = dashboardContextService.getTimestamp();
      const memory: MarkedMemory = {
        id: `mem-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        content: content.slice(0, 500), // Limit memory size
        context: context.slice(0, 200),
        timestamp,
        tag,
      };

      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(memory);
        request.onsuccess = () => {
          // Update cache immediately for responsiveness
          if (this.memoriesCache) {
            this.memoriesCache.unshift(memory); // Add to beginning (most recent first)
          }
          this.invalidateContextCache();
          toastService.memorySuccess('mark');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to mark memory as important:', error);
      // Reset memories cache on error
      this.memoriesCache = null;
      this.invalidateContextCache();
      
      toastService.memoryError('mark', error as Error);
      throw error;
    }
  }

  async getLastConversation(): Promise<StoredConversation | null> {
    // In continuous conversation model, there's only one conversation
    return this.getContinuousConversation();
  }

  async getRecentConversations(_limit: number = 5): Promise<StoredConversation[]> {
    // In continuous conversation model, return the single conversation
    const conversation = await this.getContinuousConversation();
    return conversation ? [conversation] : [];
  }

  async getMarkedMemories(): Promise<MarkedMemory[]> {
    if (!this.db) return [];

    try {
      const transaction = this.db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const index = store.index('timestamp');

      const memories: MarkedMemory[] = [];

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            memories.push(cursor.value);
            cursor.continue();
          } else {
            resolve(memories);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get marked memories:', error);
      toastService.memoryError('load', error as Error);
      return [];
    }
  }

  async searchConversations(query: string): Promise<StoredConversation[]> {
    if (!this.db || !query.trim()) return [];

    const conversations = await this.getRecentConversations(100);
    const searchTerm = query.toLowerCase();

    return conversations.filter(conv => 
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm),
      ),
    );
  }

  async getRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    // Use cache if available and sufficient
    if (this.recentMessagesCache.length >= limit) {
      return this.recentMessagesCache.slice(-limit);
    }

    // If cache is insufficient, load from DB and populate cache
    const conversation = await this.getContinuousConversation();
    if (!conversation || !conversation.messages.length) return [];
    
    // Update cache with recent messages
    this.recentMessagesCache = conversation.messages.slice(-this.MAX_RECENT_MESSAGES);
    
    // Return the requested number of messages
    return this.recentMessagesCache.slice(-limit);
  }

  async getContextForPrompt(): Promise<string> {
    // Return cached context if still valid
    if (this.isContextCacheValid()) {
      return this.contextCache;
    }

    // Get recent messages for active context (now cached)
    const recentMessages = await this.getRecentMessages(this.MAX_RECENT_MESSAGES);
    
    // Get memories with caching
    const memories = await this.getMarkedMemoriesCached();

    let context = '';

    // Include recent conversation context
    if (recentMessages.length > 0) {
      context += '\n## Recent Conversation Context:\n';
      // Include last 10 message exchanges for immediate context
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

  async forgetMemory(memoryId: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(memoryId);
        request.onsuccess = () => {
          // Update cache immediately
          if (this.memoriesCache) {
            this.memoriesCache = this.memoriesCache.filter(mem => mem.id !== memoryId);
          }
          this.invalidateContextCache();
          toastService.memorySuccess('forget');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to forget memory:', error);
      // Reset cache on error to maintain consistency
      this.memoriesCache = null;
      this.invalidateContextCache();
      
      toastService.memoryError('forget', error as Error);
      throw error;
    }
  }

  async exportAllData(): Promise<{ conversations: StoredConversation[]; memories: MarkedMemory[] }> {
    try {
      const conversations = await this.getRecentConversations(1000);
      const memories = await this.getMarkedMemories();
      
      toastService.memorySuccess('export');
      return { conversations, memories };
    } catch (error) {
      console.error('Failed to export data:', error);
      toastService.memoryError('export', error as Error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['conversations', 'memories'], 'readwrite');
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('conversations').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('memories').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
      ]);

      // Clear all caches after successful database clear
      this.recentMessagesCache = [];
      this.contextCache = '';
      this.contextCacheTimestamp = 0;
      this.memoriesCache = null;
      this.conversationMetaCache = null;
      
      toastService.memorySuccess('clear');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      // Still reset caches even if DB operation failed for consistency
      this.recentMessagesCache = [];
      this.contextCache = '';
      this.contextCacheTimestamp = 0;
      this.memoriesCache = null;
      this.conversationMetaCache = null;
      
      toastService.memoryError('clear', error as Error);
      throw error;
    }
  }

  // Cleanup method removed - continuous conversation is kept indefinitely

  // Utility function for time ago formatting
  static timeAgo(timestamp: number): string {
    return timeService.getTimeAgo(timeService.fromTimestamp(timestamp));
  }
}

// Singleton instance
export const memoryService = new MemoryService();