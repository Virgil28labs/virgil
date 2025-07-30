import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import type { ChatMessage } from '../types/chat.types';
import type { StoredConversation, MarkedMemory } from '../services/SupabaseMemoryService';
import { logger } from '../lib/logger';
import { timeService } from '../services/TimeService';

type Tables = Database['public']['Tables'];
type MessageRow = Tables['messages']['Row'];
type ConversationRow = Tables['conversations']['Row'];
type MemoryRow = Tables['memories']['Row'];

interface UseRealtimeSyncProps {
  enabled: boolean;
  userId: string | null;
  onNewMessage?: (message: ChatMessage) => void;
  onConversationUpdate?: (conversation: Partial<StoredConversation>) => void;
  onMemoryUpdate?: (memory: MarkedMemory) => void;
  onMemoryDelete?: (memoryId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useRealtimeSync({
  enabled,
  userId,
  onNewMessage,
  onConversationUpdate,
  onMemoryUpdate,
  onMemoryDelete,
  onConnectionChange,
}: UseRealtimeSyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle connection state changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionChange?.(connected);
    
    logger.info(`Realtime connection ${connected ? 'established' : 'lost'}`, {
      component: 'useRealtimeSync',
      action: 'connectionChange',
      metadata: { connected, userId },
    });
  }, [onConnectionChange, userId]);

  // Convert database row to ChatMessage
  const convertToMessage = useCallback((row: MessageRow): ChatMessage => ({
    id: row.local_id || row.id,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
    timestamp: row.timestamp || timeService.toISOString(timeService.getCurrentDateTime()),
  }), []);

  // Convert database row to MarkedMemory
  const convertToMemory = useCallback((row: MemoryRow): MarkedMemory => ({
    id: row.local_id || row.id,
    content: row.content,
    context: row.context || '',
    timestamp: timeService.getTimestamp(),
    tag: row.tag || undefined,
  }), []);

  // Handle message changes
  const handleMessageChange = useCallback((payload: RealtimePostgresChangesPayload<MessageRow>) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const message = convertToMessage(payload.new);
      onNewMessage?.(message);
      
      logger.info('Received new message via realtime', {
        component: 'useRealtimeSync',
        action: 'messageInsert',
        metadata: { messageId: message.id },
      });
    }
  }, [convertToMessage, onNewMessage]);

  // Handle conversation changes
  const handleConversationChange = useCallback((payload: RealtimePostgresChangesPayload<ConversationRow>) => {
    if ((payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') && payload.new) {
      const conversation: Partial<StoredConversation> = {
        id: payload.new.local_id || payload.new.id,
        firstMessage: payload.new.first_message || '',
        lastMessage: payload.new.last_message || '',
        messageCount: payload.new.message_count || 0,
        timestamp: timeService.getTimestamp(),
      };
      onConversationUpdate?.(conversation);
      
      logger.info('Received conversation update via realtime', {
        component: 'useRealtimeSync',
        action: 'conversationUpdate',
        metadata: { conversationId: conversation.id },
      });
    }
  }, [onConversationUpdate]);

  // Handle memory changes
  const handleMemoryChange = useCallback((payload: RealtimePostgresChangesPayload<MemoryRow>) => {
    if (payload.eventType === 'DELETE' && payload.old) {
      // Use id which is always required, fallback to local_id if available
      const memoryId = payload.old.id || payload.old.local_id;
      if (memoryId) {
        onMemoryDelete?.(memoryId);
      }
      
      logger.info('Received memory deletion via realtime', {
        component: 'useRealtimeSync',
        action: 'memoryDelete',
        metadata: { memoryId },
      });
    } else if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
      const memory = convertToMemory(payload.new);
      onMemoryUpdate?.(memory);
      
      logger.info('Received memory update via realtime', {
        component: 'useRealtimeSync',
        action: payload.eventType === 'INSERT' ? 'memoryInsert' : 'memoryUpdate',
        metadata: { memoryId: memory.id },
      });
    }
  }, [convertToMemory, onMemoryUpdate, onMemoryDelete]);

  // Setup subscriptions
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const setupSubscriptions = async () => {
      try {
        // Create a single channel for all subscriptions
        const channel = supabase
          .channel(`virgil-sync-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `user_id=eq.${userId}`,
            },
            handleMessageChange,
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'conversations',
              filter: `user_id=eq.${userId}`,
            },
            handleConversationChange,
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'memories',
              filter: `user_id=eq.${userId}`,
            },
            handleMemoryChange,
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              handleConnectionChange(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              handleConnectionChange(false);
              
              // Attempt to reconnect after a delay
              reconnectTimeoutRef.current = setTimeout(() => {
                logger.info('Attempting to reconnect realtime channel', {
                  component: 'useRealtimeSync',
                  action: 'reconnect',
                });
                setupSubscriptions();
              }, 5000);
            }
          });

        channelRef.current = channel;
      } catch (error) {
        logger.error('Failed to setup realtime subscriptions', error as Error, {
          component: 'useRealtimeSync',
          action: 'setup',
          metadata: { userId },
        });
        handleConnectionChange(false);
      }
    };

    setupSubscriptions();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      handleConnectionChange(false);
    };
  }, [enabled, userId, handleMessageChange, handleConversationChange, handleMemoryChange, handleConnectionChange]);

  return {
    isConnected,
  };
}