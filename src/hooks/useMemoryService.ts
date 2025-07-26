import { useEffect, useCallback } from 'react';
import type { Dispatch } from 'react';
import { memoryService } from '../services/MemoryService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { timeService } from '../services/TimeService';
import type { ChatMessage } from '../types/chat.types';
import type { DashboardContext } from '../services/DashboardContextService';
import type { ChatAction } from '../components/chat/chatTypes';
import { logger } from '../lib/logger';

interface UseMemoryServiceProps {
  dispatch: Dispatch<ChatAction>;
  setError: (error: string | null) => void;
  dashboardContext: DashboardContext | null;
}

interface UseMemoryServiceReturn {
  initializeMemory: () => Promise<void>;
  markAsImportant: (message: ChatMessage) => Promise<void>;
  loadRecentMessages: () => Promise<void>;
}

export function useMemoryService({
  dispatch,
  setError,
  dashboardContext,
}: UseMemoryServiceProps): UseMemoryServiceReturn {
  // Initialize memory service and load memory data
  const initializeMemory = useCallback(async () => {
    try {
      await memoryService.init();

      // Load all memory data
      const [lastConv, memories, conversations, context] = await Promise.all([
        memoryService.getLastConversation(),
        memoryService.getMarkedMemories(),
        memoryService.getRecentConversations(10),
        memoryService.getContextForPrompt(),
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
      logger.error('Failed to initialize memory service', error as Error, {
        component: 'useMemoryService',
        action: 'initialize',
      });
    }
  }, [dispatch]);

  // Load recent messages from continuous conversation
  const loadRecentMessages = useCallback(async () => {
    try {
      // Load last 20 messages from continuous conversation for UI
      const recentMessages = await memoryService.getRecentMessages(20);
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
      await memoryService.markAsImportant(message.id, message.content, context);

      const memories = await memoryService.getMarkedMemories();
      const newContext = await memoryService.getContextForPrompt();

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
        messageId: message.id,
      });
      setError('Unable to save memory. Please try again.');
    }
  }, [dashboardContext, dispatch, setError]);

  // Initialize on mount
  useEffect(() => {
    initializeMemory();
  }, [initializeMemory]);

  return {
    initializeMemory,
    markAsImportant,
    loadRecentMessages,
  };
}
