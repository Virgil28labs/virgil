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
  private readonly MAX_CONVERSATIONS = 30;
  private readonly CONVERSATION_TTL_DAYS = 30;

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

  async saveConversation(messages: ChatMessage[]): Promise<void> {
    if (!this.db || messages.length < 2) return;

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    if (userMessages.length === 0 || assistantMessages.length === 0) return;

    const conversation: StoredConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      messages,
      firstMessage: userMessages[0].content.slice(0, 100) + (userMessages[0].content.length > 100 ? '...' : ''),
      lastMessage: assistantMessages[assistantMessages.length - 1].content.slice(0, 100) + 
                   (assistantMessages[assistantMessages.length - 1].content.length > 100 ? '...' : ''),
      timestamp: Date.now(),
      messageCount: messages.length,
    };

    const transaction = this.db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(conversation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Cleanup old conversations
    await this.cleanup();
  }

  async markAsImportant(_messageId: string, content: string, context: string, tag?: string): Promise<void> {
    if (!this.db) return;

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
  }

  async getLastConversation(): Promise<StoredConversation | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentConversations(limit: number = 5): Promise<StoredConversation[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('timestamp');

    const conversations: StoredConversation[] = [];

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && conversations.length < limit) {
          conversations.push(cursor.value);
          cursor.continue();
        } else {
          resolve(conversations);
        }
      };
      request.onerror = () => reject(request.error);
    });
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

  async getContextForPrompt(): Promise<string> {
    const lastConv = await this.getLastConversation();
    const memories = await this.getMarkedMemories();

    let context = '';

    if (lastConv && (Date.now() - lastConv.timestamp) < 24 * 60 * 60 * 1000) {
      const hoursAgo = Math.floor((Date.now() - lastConv.timestamp) / (1000 * 60 * 60));
      context += `\nPrevious conversation (${hoursAgo} hours ago): "${lastConv.firstMessage}"`;
    }

    if (memories.length > 0) {
      context += '\n\nRemembered information:';
      memories.slice(0, 5).forEach(mem => {
        context += `\n- ${mem.content}`;
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

  private async cleanup(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    const index = store.index('timestamp');

    // Remove conversations older than TTL
    const cutoffTime = Date.now() - (this.CONVERSATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const conversations: StoredConversation[] = [];

    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const conv = cursor.value as StoredConversation;
          if (conv.timestamp < cutoffTime) {
            cursor.delete();
          } else {
            conversations.push(conv);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Keep only the most recent MAX_CONVERSATIONS
    if (conversations.length > this.MAX_CONVERSATIONS) {
      const toDelete = conversations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(this.MAX_CONVERSATIONS);

      for (const conv of toDelete) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(conv.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  }

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