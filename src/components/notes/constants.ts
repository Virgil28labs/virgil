/**
 * Constants and configuration for the Notes application
 */

/**
 * AI Service Configuration
 */
export const AI_CONFIG = {
  MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 200,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
  MIN_CONTENT_LENGTH: 10
} as const

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  DB_NAME: 'VirgilNotesDB',
  DB_VERSION: 1,
  STORE_NAME: 'entries'
} as const

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  MAX_NOTE_LENGTH: 5000,
  PLACEHOLDER_ROTATION_INTERVAL: 4000,
  MAX_TAGS_PER_ENTRY: 2,
  DEFAULT_FILTER: 'all' as const
} as const

/**
 * Placeholder messages for the input field
 */
export const INPUT_PLACEHOLDERS = [
  "What's on your mind?",
  "Capture a thought...",
  "How was your day?",
  "What needs remembering?",
  "Share a reflection...",
  "Jot down an idea..."
] as const

/**
 * Life domain filters
 */
export const DOMAIN_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'work', label: 'Work' },
  { value: 'health', label: 'Health' },
  { value: 'money', label: 'Money' },
  { value: 'people', label: 'People' },
  { value: 'growth', label: 'Growth' },
  { value: 'life', label: 'Life' }
] as const

/**
 * Action type filters
 */
export const ACTION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'idea', label: 'Idea' },
  { value: 'goal', label: 'Goal' },
  { value: 'reflect', label: 'Reflect' }
] as const

/**
 * Tag type descriptions for AI prompt
 */
export const TAG_DESCRIPTIONS = {
  work: 'career, job, professional, meetings, projects, business, colleagues, education',
  health: 'fitness, medical, wellness, mental health, self-care, diet, exercise, therapy',
  money: 'finance, budget, bills, expenses, investments, purchases, savings, income',
  people: 'relationships, family, friends, social, community, communication, networking',
  growth: 'learning, skills, personal development, spirituality, self-improvement, courses',
  life: 'home, hobbies, daily routines, lifestyle, entertainment, travel, chores'
} as const

/**
 * Action type descriptions for AI prompt
 */
export const ACTION_DESCRIPTIONS = {
  task: 'actionable to-dos, things that need to be done, "need to", "must", "should"',
  note: 'information, facts, reference material, meeting notes, definitions, summaries',
  idea: 'creative thoughts, brainstorms, "what if", "maybe", possibilities, suggestions',
  goal: 'long-term objectives, aspirations, targets, "aim to", "by [date]", plans',
  reflect: 'journal entries, personal narratives, feelings, "I felt", introspection, diary'
} as const

/**
 * Keyboard shortcut configurations
 */
export const KEYBOARD_SHORTCUTS = {
  SUBMIT: { key: 'Enter', modifiers: ['cmd', 'ctrl'] },
  SEARCH: { key: 'k', modifiers: ['cmd', 'ctrl'] },
  SETTINGS: { key: ',', modifiers: ['cmd', 'ctrl'] },
  CLOSE: { key: 'Escape', modifiers: [] }
} as const