import { SupabaseMemoryService } from '../SupabaseMemoryService';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { User } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock IndexedDB (fallback)
const mockIndexedDB = {
  messages: [] as any[],
  conversations: [] as any[],
  memories: [] as any[],
};

jest.mock('../IndexedDBService', () => ({
  indexedDBService: {
    addMessage: jest.fn(async (message) => {
      mockIndexedDB.messages.push(message);
      return message;
    }),
    getRecentMessages: jest.fn(async () => mockIndexedDB.messages),
    getConversation: jest.fn(async (id) => 
      mockIndexedDB.conversations.find(c => c.id === id),
    ),
    saveConversation: jest.fn(async (conv) => {
      mockIndexedDB.conversations.push(conv);
      return conv;
    }),
    getAllConversations: jest.fn(async () => mockIndexedDB.conversations),
    getMarkedMemories: jest.fn(async () => mockIndexedDB.memories),
    addMemory: jest.fn(async (memory) => {
      mockIndexedDB.memories.push(memory);
      return memory;
    }),
    deleteMemory: jest.fn(async (id) => {
      const index = mockIndexedDB.memories.findIndex(m => m.id === id);
      if (index > -1) mockIndexedDB.memories.splice(index, 1);
    }),
  },
}));

describe('SupabaseMemoryService - Multi-User Isolation', () => {
  let service: SupabaseMemoryService;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  
  // Test users
  const user1: User = {
    id: 'user-1',
    email: 'user1@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
  
  const user2: User = {
    id: 'user-2',
    email: 'user2@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  // Mock Supabase auth
  const mockAuth = {
    getUser: jest.fn(),
    refreshSession: jest.fn(),
  };

  // Mock Supabase query builders
  const createMockQueryBuilder = (_table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear IndexedDB mock
    mockIndexedDB.messages = [];
    mockIndexedDB.conversations = [];
    mockIndexedDB.memories = [];
    
    // Setup Supabase mocks
    mockSupabase.auth = mockAuth as any;
    mockSupabase.from = jest.fn((table) => createMockQueryBuilder(table)) as any;
    
    // Create new service instance
    service = new SupabaseMemoryService();
  });

  describe('User Authentication', () => {
    it('should verify user is authenticated before operations', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      
      await expect(service.init()).rejects.toThrow('Authentication required');
      expect(logger.error).toHaveBeenCalledWith(
        'No authenticated user found',
        expect.any(Error),
        expect.objectContaining({
          component: 'SupabaseMemoryService',
          action: 'init',
        }),
      );
    });

    it('should handle authentication refresh on 401 errors', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      mockAuth.refreshSession.mockResolvedValue({ data: { session: {} }, error: null });
      
      const queryBuilder = createMockQueryBuilder('messages');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      // First call fails with 401
      queryBuilder.select.mockReturnValueOnce({
        ...queryBuilder,
        error: { code: '401', message: 'JWT expired' },
        data: null,
      });
      
      // Second call succeeds after refresh
      queryBuilder.select.mockReturnValueOnce({
        ...queryBuilder,
        error: null,
        data: [],
      });
      
      const messages = await service.getRecentMessages(10);
      
      expect(mockAuth.refreshSession).toHaveBeenCalled();
      expect(messages).toEqual([]);
    });
  });

  describe('Data Isolation', () => {
    beforeEach(async () => {
      // Setup user1 as authenticated
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      
      const conversationBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(conversationBuilder as any);
      
      conversationBuilder.upsert.mockResolvedValue({ error: null });
      
      await service.init();
    });

    it('should only fetch messages for the authenticated user', async () => {
      const queryBuilder = createMockQueryBuilder('messages');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      queryBuilder.select.mockResolvedValue({
        data: [
          { id: '1', user_id: user1.id, content: 'User 1 message' },
          { id: '2', user_id: user2.id, content: 'User 2 message' }, // Should be filtered by RLS
        ],
        error: null,
      });
      
      await service.getRecentMessages(10);
      
      // Verify the query includes user filter
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', user1.id);
      expect(queryBuilder.eq).toHaveBeenCalledWith('conversation_id', service['CONTINUOUS_CONVERSATION_ID']);
    });

    it('should only fetch conversations for the authenticated user', async () => {
      const queryBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      queryBuilder.select.mockResolvedValue({
        data: [
          { id: '1', user_id: user1.id, title: 'User 1 conversation' },
          { id: '2', user_id: user2.id, title: 'User 2 conversation' }, // Should be filtered by RLS
        ],
        error: null,
      });
      
      await service.getRecentConversations(5);
      
      // Verify the query includes user filter
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', user1.id);
    });

    it('should only fetch memories for the authenticated user', async () => {
      const queryBuilder = createMockQueryBuilder('memories');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      queryBuilder.select.mockResolvedValue({
        data: [
          { id: '1', user_id: user1.id, content: 'User 1 memory' },
          { id: '2', user_id: user2.id, content: 'User 2 memory' }, // Should be filtered by RLS
        ],
        error: null,
      });
      
      await service.getMarkedMemories();
      
      // Verify the query includes user filter
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', user1.id);
    });
  });

  describe('RLS Policy Enforcement', () => {
    beforeEach(async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      
      const conversationBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(conversationBuilder as any);
      conversationBuilder.upsert.mockResolvedValue({ error: null });
      
      await service.init();
    });

    it('should handle RLS policy violations gracefully', async () => {
      const queryBuilder = createMockQueryBuilder('messages');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      queryBuilder.insert.mockResolvedValue({
        error: { code: '42501', message: 'new row violates row-level security policy' },
        data: null,
      });
      
      const message = {
        id: 'test-id',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date().toISOString(),
      };
      
      await service.saveConversation([message]);
      
      // Should fall back to IndexedDB
      expect(logger.warn).toHaveBeenCalledWith(
        'RLS policy prevented message save, using local storage',
        expect.objectContaining({
          component: 'SupabaseMemoryService',
          action: 'saveConversation',
        }),
      );
    });

    it('should not allow cross-user data access', async () => {
      // Try to access another user's data
      const queryBuilder = createMockQueryBuilder('memories');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      // RLS should prevent this
      queryBuilder.select.mockResolvedValue({
        error: { code: '42501', message: 'row-level security policy violation' },
        data: null,
      });
      
      const memories = await service.getMarkedMemories();
      
      // Should return empty array, not throw
      expect(memories).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'RLS policy prevented memory fetch, using local storage',
        expect.objectContaining({
          component: 'SupabaseMemoryService',
          action: 'getMarkedMemories',
        }),
      );
    });
  });

  describe('User Switching', () => {
    it('should reinitialize when user changes', async () => {
      // First init with user1
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      
      const conversationBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(conversationBuilder as any);
      conversationBuilder.upsert.mockResolvedValue({ error: null });
      
      await service.init();
      expect(conversationBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: user1.id }),
        expect.any(Object),
      );
      
      // Switch to user2
      mockAuth.getUser.mockResolvedValue({ data: { user: user2 }, error: null });
      conversationBuilder.upsert.mockClear();
      
      await service.init();
      expect(conversationBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: user2.id }),
        expect.any(Object),
      );
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent operations from same user safely', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      
      const conversationBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(conversationBuilder as any);
      conversationBuilder.upsert.mockResolvedValue({ error: null });
      
      await service.init();
      
      const messageBuilder = createMockQueryBuilder('messages');
      mockSupabase.from.mockReturnValue(messageBuilder as any);
      messageBuilder.insert.mockResolvedValue({ error: null });
      
      // Simulate concurrent message additions
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));
      
      const promises = messages.map(msg => service.saveConversation([msg]));
      await Promise.all(promises);
      
      // All messages should be added with correct user_id
      expect(messageBuilder.insert).toHaveBeenCalledTimes(5);
      for (const call of messageBuilder.insert.mock.calls) {
        expect(call[0]).toMatchObject({ user_id: user1.id });
      }
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: user1 }, error: null });
      
      const conversationBuilder = createMockQueryBuilder('conversations');
      mockSupabase.from.mockReturnValue(conversationBuilder as any);
      conversationBuilder.upsert.mockResolvedValue({ error: null });
      
      await service.init();
    });

    it('should maintain conversation continuity within user scope', async () => {
      const queryBuilder = createMockQueryBuilder('messages');
      mockSupabase.from.mockReturnValue(queryBuilder as any);
      
      queryBuilder.select.mockResolvedValue({
        data: [
          { 
            id: '1', 
            user_id: user1.id, 
            conversation_id: service['CONTINUOUS_CONVERSATION_ID'],
            content: 'Message 1',
            role: 'user',
            timestamp: new Date().toISOString(),
          },
          { 
            id: '2', 
            user_id: user1.id, 
            conversation_id: service['CONTINUOUS_CONVERSATION_ID'],
            content: 'Message 2',
            role: 'assistant',
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      });
      
      const messages = await service.getRecentMessages(10);
      
      // All messages should belong to same conversation
      expect(messages).toHaveLength(2);
      expect(queryBuilder.eq).toHaveBeenCalledWith('conversation_id', service['CONTINUOUS_CONVERSATION_ID']);
    });

    it('should enforce unique constraints per user', async () => {
      const memoryBuilder = createMockQueryBuilder('memories');
      mockSupabase.from.mockReturnValue(memoryBuilder as any);
      
      // First insert succeeds
      memoryBuilder.insert.mockResolvedValueOnce({ error: null });
      
      // Second insert with same local_id fails
      memoryBuilder.insert.mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        data: null,
      });
      
      const messageId = 'test-message-id';
      
      // First mark should succeed
      await service.markAsImportant(messageId, 'Important message', 'Context');
      
      // Second mark with same ID should update, not insert
      memoryBuilder.update = jest.fn().mockResolvedValue({ error: null });
      await service.markAsImportant(messageId, 'Updated important message', 'New context');
      
      expect(memoryBuilder.update).toHaveBeenCalled();
    });
  });
});