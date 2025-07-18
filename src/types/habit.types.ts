// Simple habit interface
export interface Habit {
  id: string
  name: string
  emoji: string
  streak: number
  longestStreak: number
  lastCheckIn: string | null
  checkIns: string[]
  createdAt: string
  frequency: 'daily' | 'weekly' | 'custom'
  targetDays?: number[] // 0-6 for weekly, specific days for custom
}

// Achievement types
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: string
  progress: number // 0-100
  requirement: {
    type: 'streak' | 'total-checkins' | 'perfect-week' | 'all-habits'
    value: number
    habitId?: string // for habit-specific achievements
  }
}

// User habits data structure
export interface UserHabitsData {
  habits: Habit[]
  achievements: Achievement[]
  settings: {
    soundEnabled: boolean
  }
  stats: {
    totalCheckIns: number
    currentStreak: number // across all habits
    perfectDays: string[] // days when all habits were completed
  }
}

// Motivational messages based on progress
export interface Message {
  message: string
  emoji: string
}

// Emoji suggestions for habit creation
export interface EmojiSuggestion {
  emoji: string
  keywords: string[]
}