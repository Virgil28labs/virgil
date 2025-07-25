import { useContext } from 'react';
import { ChatContext } from './ChatContext';
import type { ChatContextValue } from './ChatContext';

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}