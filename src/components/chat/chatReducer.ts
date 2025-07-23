import type { ChatState, ChatAction } from './chatTypes';

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_OPEN':
      return { ...state, isOpen: action.payload };
      
    case 'SET_WINDOW_SIZE':
      return { ...state, windowSize: action.payload };
      
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
      
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
      
    case 'SET_INPUT':
      return { ...state, input: action.payload };
      
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_MODEL':
      return { ...state, selectedModel: action.payload };
      
    case 'SET_SYSTEM_PROMPT':
      return { ...state, customSystemPrompt: action.payload };
      
    case 'SET_MEMORY_DATA':
      return {
        ...state,
        ...(action.payload.lastConversation !== undefined && { lastConversation: action.payload.lastConversation }),
        ...(action.payload.markedMemories !== undefined && { markedMemories: action.payload.markedMemories }),
        ...(action.payload.recentConversations !== undefined && { recentConversations: action.payload.recentConversations }),
        ...(action.payload.memoryContext !== undefined && { memoryContext: action.payload.memoryContext }),
        ...(action.payload.showMemoryIndicator !== undefined && { showMemoryIndicator: action.payload.showMemoryIndicator }),
      };
      
    case 'SET_MEMORY_MODAL':
      return { ...state, showMemoryModal: action.payload };
      
    case 'SET_DASHBOARD_CONTEXT':
      return {
        ...state,
        dashboardContext: action.payload.context,
        contextualSuggestions: action.payload.suggestions,
      };
      
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
      
    case 'NEW_CHAT':
      return {
        ...state,
        messages: [],
        error: null,
        input: '',
      };
      
    default:
      return state;
  }
}