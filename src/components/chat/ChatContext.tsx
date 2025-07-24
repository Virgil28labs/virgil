import type { ReactNode } from 'react';
import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { ChatState, ChatAction } from './chatTypes';
import { chatReducer } from './chatReducer';
import { initialChatState } from './chatTypes';
import type { ChatMessage } from '../../types/chat.types';
import { StorageService, STORAGE_KEYS } from '../../services/StorageService';

interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  
  // Convenience methods
  setOpen: (isOpen: boolean) => void;
  setWindowSize: (size: 'normal' | 'large' | 'fullscreen') => void;
  addMessage: (message: ChatMessage) => void;
  setInput: (input: string) => void;
  setTyping: (isTyping: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  newChat: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

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
    ]
  );
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}