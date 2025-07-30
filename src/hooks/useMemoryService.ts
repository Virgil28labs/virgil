import { useEffect, useCallback, useState } from 'react';
import type { Dispatch } from 'react';
import { vectorMemoryService } from '../services/VectorMemoryService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { timeService } from '../services/TimeService';
import type { ChatMessage } from '../types/chat.types';
import type { DashboardContext } from '../services/DashboardContextService';
import type { ChatAction } from '../components/chat/chatTypes';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { useRealtimeSync } from './useRealtimeSync';
import { useAuth } from './useAuth';

interface UseMemoryServiceProps {
  dispatch: Dispatch<ChatAction>;
  setError: (error: string | null) => void;
  dashboardContext: DashboardContext | null;
}

interface UseMemoryServiceReturn {
  initializeMemory: () => Promise<void>;
  markAsImportant: (message: ChatMessage) => Promise<void>;
  loadRecentMessages: () => Promise<void>;
  isRealtimeConnected: boolean;
}

export function useMemoryService({
  dispatch,
  setError,
  dashboardContext,
}: UseMemoryServiceProps): UseMemoryServiceReturn {
  const { user } = useAuth();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  // Initialize memory service and load memory data
  const initializeMemory = useCallback(async () => {
    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('Skipping memory initialization - no authenticated user', {
          component: 'useMemoryService',
          action: 'initializeMemory',
        });
        return;
      }

      await vectorMemoryService.init();

      // Initialize intent embeddings for semantic matching
      await vectorMemoryService.initializeIntentEmbeddings();

      // Load all memory data
      const [lastConv, memories, conversations, context] = await Promise.all([
        vectorMemoryService.getLastConversation(),
        vectorMemoryService.getMarkedMemories(),
        vectorMemoryService.getRecentConversations(10),
        vectorMemoryService.getContextForPrompt(),
      ]);

      dispatch({
        type: 'SET_MEMORY_DATA',
        payload: {
          lastConversation: lastConv,
          markedMemories: memories,
          recentConversations: conversations,
          memoryContext: context,
          showMemoryIndicator: true, // Always show memory button
        },
      });
    } catch (error) {
      const err = error as Error & { message?: string; code?: string };
      
      // Handle specific error cases
      if (err?.message?.includes('Authentication error')) {
        logger.error('Authentication error during memory initialization', err, {
          component: 'useMemoryService',
          action: 'initializeMemory',
        });
        setError('Authentication error - please refresh the page');
        
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          // Retry initialization after refresh
          logger.info('Session refreshed, retrying memory initialization', {
            component: 'useMemoryService',
            action: 'initializeMemory',
          });
          setTimeout(() => initializeMemory(), 1000);
        }
      } else {
        logger.error('Failed to initialize memory service', error as Error, {
          component: 'useMemoryService',
          action: 'initialize',
        });
        
        // Don't show error for initialization failures - they're handled gracefully
        // The app can still function without memory service
      }
    }
  }, [dispatch, setError]);

  // Load recent messages from continuous conversation
  const loadRecentMessages = useCallback(async () => {
    try {
      // Load last 20 messages from continuous conversation for UI
      const recentMessages = await vectorMemoryService.getRecentMessages(20);
      if (recentMessages.length > 0) {
        dispatch({ type: 'SET_MESSAGES', payload: recentMessages });
      }
    } catch (error) {
      logger.error('Failed to load recent messages', error as Error, {
        component: 'useMemoryService',
        action: 'loadRecentMessages',
      });
    }
  }, [dispatch]);

  // Mark message as important
  const markAsImportant = useCallback(async (message: ChatMessage) => {
    try {
      let context = `From conversation on ${timeService.formatDateToLocal(timeService.getCurrentDateTime())}`;
      if (dashboardContext) {
        context = DynamicContextBuilder.createContextSummary(dashboardContext);
      }
      await vectorMemoryService.markAsImportant(message.id, message.content, context);

      const memories = await vectorMemoryService.getMarkedMemories();
      const newContext = await vectorMemoryService.getContextForPrompt();

      dispatch({
        type: 'SET_MEMORY_DATA',
        payload: {
          markedMemories: memories,
          memoryContext: newContext,
          showMemoryIndicator: true,
        },
      });
    } catch (error) {
      logger.error('Failed to mark message as important', error as Error, {
        component: 'useMemoryService',
        action: 'markAsImportant',
        metadata: {
          messageId: message.id,
        },
      });
      setError('Unable to save memory. Please try again.');
    }
  }, [dashboardContext, dispatch, setError]);

  // Real-time sync callbacks
  const handleNewMessage = useCallback((message: ChatMessage) => {
    // Add the new message to the UI
    dispatch({ type: 'ADD_MESSAGE', payload: message });
    
    logger.info('Real-time message received', {
      component: 'useMemoryService',
      action: 'handleNewMessage',
      metadata: { messageId: message.id },
    });
  }, [dispatch]);

  const handleConversationUpdate = useCallback(async () => {
    // Reload conversation metadata
    try {
      const conversation = await vectorMemoryService.getLastConversation();
      const context = await vectorMemoryService.getContextForPrompt();
      
      dispatch({
        type: 'SET_MEMORY_DATA',
        payload: {
          lastConversation: conversation,
          memoryContext: context,
        },
      });
    } catch (error) {
      logger.error('Failed to handle conversation update', error as Error, {
        component: 'useMemoryService',
        action: 'handleConversationUpdate',
      });
    }
  }, [dispatch]);

  const handleMemoryUpdate = useCallback(async () => {
    // Reload memories
    try {
      const memories = await vectorMemoryService.getMarkedMemories();
      const context = await vectorMemoryService.getContextForPrompt();
      
      dispatch({
        type: 'SET_MEMORY_DATA',
        payload: {
          markedMemories: memories,
          memoryContext: context,
        },
      });
    } catch (error) {
      logger.error('Failed to handle memory update', error as Error, {
        component: 'useMemoryService',
        action: 'handleMemoryUpdate',
      });
    }
  }, [dispatch]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    logger.info(`Real-time sync ${connected ? 'connected' : 'disconnected'}`, {
      component: 'useMemoryService',
      action: 'handleConnectionChange',
      metadata: { connected },
    });
    
    if (connected) {
      // Optionally show a toast notification
      // toastService.success('Real-time sync connected');
    }
  }, []);

  // Use real-time sync
  const { isConnected } = useRealtimeSync({
    enabled: realtimeEnabled,
    userId: user?.id || null,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onMemoryUpdate: handleMemoryUpdate,
    onMemoryDelete: handleMemoryUpdate, // Reload memories on delete
    onConnectionChange: handleConnectionChange,
  });

  // Enable real-time sync after successful initialization
  useEffect(() => {
    if (user?.id) {
      setRealtimeEnabled(true);
    } else {
      setRealtimeEnabled(false);
    }
  }, [user?.id]);

  // Initialize on mount with a small delay to ensure auth is ready
  useEffect(() => {
    // Small delay to ensure authentication context is fully established
    const initTimer = setTimeout(() => {
      initializeMemory();
    }, 500);
    
    return () => clearTimeout(initTimer);
  }, [initializeMemory]);

  return {
    initializeMemory,
    markAsImportant,
    loadRecentMessages,
    isRealtimeConnected: isConnected,
  };
}
