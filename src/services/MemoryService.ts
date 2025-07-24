import type { ChatMessage } from '../types/chat.types';

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

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
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
      return null;
    }
  }

  async saveConversation(newMessages: ChatMessage[]): Promise<void> {
    if (!this.db || newMessages.length === 0) return;

    try {
      // Get existing continuous conversation first (uses its own transaction)
      const existing = await this.getContinuousConversation();
      
      // Append new messages to existing conversation
      const allMessages = existing ? [...existing.messages, ...newMessages] : newMessages;
      const userMessages = allMessages.filter(m => m.role === 'user');
      const assistantMessages = allMessages.filter(m => m.role === 'assistant');

      const conversation: StoredConversation = {
        id: this.CONTINUOUS_CONVERSATION_ID,
        messages: allMessages,
        firstMessage: userMessages[0]?.content.slice(0, 100) || '',
        lastMessage: assistantMessages[assistantMessages.length - 1]?.content.slice(0, 100) || '',
        timestamp: Date.now(),
        messageCount: allMessages.length,
      };

      // Now create a fresh transaction for the write operation
      const transaction = this.db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');

      await new Promise<void>((resolve, reject) => {
        const request = store.put(conversation);  // Using put instead of add to update existing
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }

  async markAsImportant(_messageId: string, content: string, context: string, tag?: string): Promise<void> {
    if (!this.db) return;

    try {
      const memory: MarkedMemory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: content.slice(0, 500), // Limit memory size
        context: context.slice(0, 200),
        timestamp: Date.now(),
        tag,
      };

      const transaction = this.db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(memory);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to mark memory as important:', error);
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
  }

  async searchConversations(query: string): Promise<StoredConversation[]> {
    if (!this.db || !query.trim()) return [];

    const conversations = await this.getRecentConversations(100);
    const searchTerm = query.toLowerCase();

    return conversations.filter(conv => 
      conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchTerm)
      )
    );
  }

  async getRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    const conversation = await this.getContinuousConversation();
    if (!conversation || !conversation.messages.length) return [];
    
    // Return the last N messages
    return conversation.messages.slice(-limit);
  }

  async getContextForPrompt(): Promise<string> {
    // Get recent messages for active context
    const recentMessages = await this.getRecentMessages(this.MAX_RECENT_MESSAGES);
    
    // Get ALL marked memories (no limit)
    const memories = await this.getMarkedMemories();

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

    return context;
  }

  async forgetMemory(memoryId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(memoryId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportAllData(): Promise<{ conversations: StoredConversation[]; memories: MarkedMemory[] }> {
    const conversations = await this.getRecentConversations(1000);
    const memories = await this.getMarkedMemories();
    
    return { conversations, memories };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

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
  }

  // Cleanup method removed - continuous conversation is kept indefinitely

  // Utility function for time ago formatting
  static timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
}

// Singleton instance
export const memoryService = new MemoryService();