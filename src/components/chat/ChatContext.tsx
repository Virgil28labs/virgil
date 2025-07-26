import { type ReactNode, useReducer, useCallback, useMemo, createContext } from 'react';
import { chatReducer } from './chatReducer';
import { initialChatState } from './chatTypes';
import type { ChatMessage, ChatContextValue } from '../../types/chat.types';
import { StorageService, STORAGE_KEYS } from '../../services/StorageService';

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Initialize state with localStorage values
  const [state, dispatch] = useReducer(chatReducer, initialChatState, (initial) => {
    try {
      const windowSize = StorageService.get<'normal' | 'large' | 'fullscreen'>(
        STORAGE_KEYS.WINDOW_SIZE, 
        initial.windowSize,
      );
      const customSystemPrompt = StorageService.get<string>(
        STORAGE_KEYS.CUSTOM_SYSTEM_PROMPT, 
        '',
      );
      const selectedModel = StorageService.get<string>(
        STORAGE_KEYS.SELECTED_MODEL, 
        'gpt-4.1-mini',
      );
      
      return {
        ...initial,
        windowSize,
        customSystemPrompt,
        selectedModel,
      };
    } catch {
      return initial;
    }
  });
  
  // Convenience methods
  const setOpen = useCallback((isOpen: boolean) => {
    dispatch({ type: 'SET_OPEN', payload: isOpen });
  }, []);
  
  const setWindowSize = useCallback((size: 'normal' | 'large' | 'fullscreen') => {
    dispatch({ type: 'SET_WINDOW_SIZE', payload: size });
    StorageService.set(STORAGE_KEYS.WINDOW_SIZE, size);
  }, []);
  
  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);
  
  const setInput = useCallback((input: string) => {
    dispatch({ type: 'SET_INPUT', payload: input });
  }, []);
  
  const setTyping = useCallback((isTyping: boolean) => {
    dispatch({ type: 'SET_TYPING', payload: isTyping });
  }, []);
  
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);
  
  const newChat = useCallback(() => {
    dispatch({ type: 'NEW_CHAT' });
    StorageService.remove(STORAGE_KEYS.ACTIVE_CONVERSATION);
  }, []);
  
  const value: ChatContextValue = useMemo(
    () => ({
      state,
      dispatch,
      setOpen,
      setWindowSize,
      addMessage,
      setInput,
      setTyping,
      setError,
      clearMessages,
      newChat,
    }),
    [
      state,
      dispatch,
      setOpen,
      setWindowSize,
      addMessage,
      setInput,
      setTyping,
      setError,
      clearMessages,
      newChat,
    ],
  );
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

