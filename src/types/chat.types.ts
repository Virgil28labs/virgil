/**
 * Chat and Messaging Types
 * For VirgilChatbot and chat functionality
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
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

export type ExportFormat = "json" | "markdown";

export interface ChatError {
  message: string;
  code?: string;
  recoverable?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score?: number;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  answer?: string;
  results: SearchResult[];
  total_results: number;
  timestamp: string;
}

export interface SearchRequest {
  query: string;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
}

export interface ChatMessageWithSearch extends ChatMessage {
  searchResults?: SearchResult[];
  searchQuery?: string;
}
