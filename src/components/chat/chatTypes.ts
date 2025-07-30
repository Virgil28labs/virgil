import type { ChatMessage } from '../../types/chat.types';
import type { StoredConversation, MarkedMemory } from '../../services/SupabaseMemoryService';
import type { DashboardContext, ContextualSuggestion } from '../../services/DashboardContextService';

export interface ChatState {
  // UI State
  isOpen: boolean;
  windowSize: 'normal' | 'large' | 'fullscreen';

  // Chat State
  messages: ChatMessage[];
  input: string;
  isTyping: boolean;
  error: string | null;

  // Model State
  selectedModel: string;
  customSystemPrompt: string;

  // Memory State
  lastConversation: StoredConversation | null;
  markedMemories: MarkedMemory[];
  showMemoryIndicator: boolean;
  memoryContext: string;
  showMemoryModal: boolean;
  recentConversations: StoredConversation[];

  // Context State
  dashboardContext: DashboardContext | null;
  contextualSuggestions: ContextualSuggestion[];
}

export type ChatAction =
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_WINDOW_SIZE'; payload: 'normal' | 'large' | 'fullscreen' }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_SYSTEM_PROMPT'; payload: string }
  | { type: 'SET_MEMORY_DATA'; payload: {
      lastConversation?: StoredConversation | null;
      markedMemories?: MarkedMemory[];
      recentConversations?: StoredConversation[];
      memoryContext?: string;
      showMemoryIndicator?: boolean;
    }}
  | { type: 'SET_MEMORY_MODAL'; payload: boolean }
  | { type: 'SET_DASHBOARD_CONTEXT'; payload: {
      context: DashboardContext | null;
      suggestions: ContextualSuggestion[];
    }}
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'NEW_CHAT' };

export const initialChatState: ChatState = {
  isOpen: false,
  windowSize: 'normal',
  messages: [],
  input: '',
  isTyping: false,
  error: null,
  selectedModel: 'gpt-4.1-mini',
  customSystemPrompt: '',
  lastConversation: null,
  markedMemories: [],
  showMemoryIndicator: true, // Always show memory button
  memoryContext: '',
  showMemoryModal: false,
  recentConversations: [],
  dashboardContext: null,
  contextualSuggestions: [],
};
