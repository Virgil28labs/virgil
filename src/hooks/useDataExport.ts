import { useCallback } from 'react';
import type { ChatMessage } from '../types/chat.types';
import type { User } from '../types/auth.types';
import { dashboardContextService } from '../services/DashboardContextService';
import { timeService } from '../services/TimeService';

interface UseDataExportProps {
  user: User | null;
  messages: ChatMessage[];
}

interface UseDataExportReturn {
  handleExportMessages: () => void;
}

export function useDataExport({ user, messages }: UseDataExportProps): UseDataExportReturn {
  const handleExportMessages = useCallback(() => {
    const now = dashboardContextService.getCurrentDateTime();
    const chatData = {
      exportedAt: timeService.toISOString(now),
      user: user?.user_metadata?.name || 'Unknown',
      messages: messages,
      totalMessages: messages.length,
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virgil-chat-${dashboardContextService.getLocalDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [user, messages]);

  return {
    handleExportMessages,
  };
}
