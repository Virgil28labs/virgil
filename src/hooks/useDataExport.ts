import { useCallback } from 'react';
import type { ChatMessage } from '../types/chat.types';
import type { User } from '../types/auth.types';

interface UseDataExportProps {
  user: User | null;
  messages: ChatMessage[];
}

interface UseDataExportReturn {
  handleExportMessages: () => void;
}

export function useDataExport({ user, messages }: UseDataExportProps): UseDataExportReturn {
  const handleExportMessages = useCallback(() => {
    const chatData = {
      exportedAt: new Date().toISOString(),
      user: user?.user_metadata?.name || 'Unknown',
      messages: messages,
      totalMessages: messages.length,
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virgil-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [user, messages]);

  return {
    handleExportMessages,
  };
}