/**
 * Type definitions for the Notes application
 * Provides comprehensive type safety for all notes-related operations
 */

/**
 * Represents a single task within a note entry
 */
export interface Task {
  /** The text content of the task */
  text: string
  /** Whether the task has been completed */
  completed: boolean
  /** Whether this task was extracted by AI (vs manually created) */
  extracted: boolean
}

/**
 * Represents a note entry in the system
 */
export interface Entry {
  /** Unique identifier for the entry */
  id: string
  /** ISO timestamp when the entry was created */
  timestamp: Date
  /** The raw text content of the note */
  content: string
  /** Tags assigned to this entry from life domains */
  tags: TagType[]
  /** Action type classification for this entry */
  actionType?: ActionType
  /** Tasks contained within or extracted from this entry */
  tasks: Task[]
  /** Whether AI processing has been completed for this entry */
  aiProcessed: boolean
  /** Whether the entry has been edited after creation */
  isEdited: boolean
}

/**
 * Response structure from the AI service
 */
export interface AIResponse {
  /** Suggested tags for the entry */
  tags: TagType[]
  /** Classified action type for the entry */
  actionType?: ActionType
  /** Tasks extracted from the content */
  tasks: string[]
  /** Detected mood/sentiment if applicable */
  mood?: 'positive' | 'neutral' | 'negative'
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  STORAGE_ERROR = 'STORAGE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for Notes application
 */
export class NotesError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'NotesError';
  }
}

/**
 * Filter options for the notes list
 * Based on life domains for clearer categorization
 */
export type FilterType = 'all' | 'work' | 'health' | 'money' | 'people' | 'growth' | 'life'

/**
 * Action filter options
 */
export type ActionFilterType = 'all' | 'task' | 'note' | 'idea' | 'goal' | 'reflect'

/**
 * Valid tag options (excluding 'all' which is only for filtering)
 * Categories represent WHERE in your life this belongs
 */
export type TagType = 'work' | 'health' | 'money' | 'people' | 'growth' | 'life'

/**
 * Action types for the second dimension of categorization
 * Represents WHAT kind of content this is
 */
export type ActionType = 'task' | 'note' | 'idea' | 'goal' | 'reflect'

/**
 * Settings for the notes application
 */
export interface NotesSettings {
  /** Whether AI processing is enabled */
  aiEnabled: boolean
  /** Default filter to apply on load */
  defaultFilter?: FilterType
  /** Whether to show keyboard shortcuts */
  showKeyboardHints?: boolean
}

/**
 * State for loading and error handling
 */
export interface LoadingState {
  isLoading: boolean
  error: NotesError | null
}

/**
 * Props for components that handle entries
 */
export interface EntryHandlers {
  onToggleTask: (entryId: string, taskIndex: number) => void
  onUpdateEntry: (id: string, updates: Partial<Entry>) => void
  onDeleteEntry: (id: string) => void
}