import { createContext } from 'react';
import type { ChatContextValue } from '../../types/chat.types';

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);