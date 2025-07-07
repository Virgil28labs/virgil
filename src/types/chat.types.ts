/**
 * Chat and Messaging Types
 * For VirgilChatbot and chat functionality
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  streaming?: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  input: string;
  isTyping: boolean;
  error: string | null;
  selectedModel: string;
  showModelDropdown: boolean;
  showTooltip: boolean;
}

export interface ChatHookOptions {
  model?: string;
  temperature?: number;
  enableCache?: boolean;
  systemPrompt?: string;
}

export interface ChatContextData {
  userContext: string;
  systemPrompt: string;
  currentTime: string;
  currentDate: string;
  currentDay: string;
}

export interface QuickAction {
  text: string;
  action: () => void;
}

export interface ConversationSummary {
  userMessages: number;
  assistantMessages: number;
  totalMessages: number;
  lastMessage: ChatMessage | null;
  conversationStarted: string | null;
}

export interface ExportData {
  systemPrompt?: string;
  messages: ChatMessage[];
  exportedAt: string;
  summary: ConversationSummary;
}

export type ExportFormat = 'json' | 'markdown';

export interface ChatError {
  message: string;
  code?: string;
  recoverable?: boolean;
}