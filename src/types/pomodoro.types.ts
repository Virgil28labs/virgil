export type TimerState = 'idle' | 'running' | 'paused'
export type SessionType = 'work' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  workDuration: number        // in minutes (15-60)
  shortBreakDuration: number  // in minutes (3-15)
  longBreakDuration: number   // in minutes (15-45)
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  soundEnabled: boolean
  soundVolume: number         // 0-100
  tickSoundEnabled: boolean
  tickSoundDuration: number   // seconds before end to start ticking
  notificationsEnabled: boolean
}

export interface PomodoroSession {
  id: string
  type: SessionType
  startTime: number
  endTime?: number
  completedAt?: number
  wasSkipped?: boolean
}

export interface PomodoroStats {
  dailyGoal: number
  todayCompleted: number
  weeklyCompleted: number[]  // Last 7 days
  totalCompleted: number
  currentStreak: number
  bestStreak: number
  lastCompletedDate?: string
  averagePerDay: number
}

export interface PomodoroState {
  currentSession: PomodoroSession | null
  timerState: TimerState
  timeRemaining: number      // in seconds
  completedPomodoros: number // in current cycle (resets after long break)
  totalPomodoros: number     // total for the day
  sessions: PomodoroSession[]
}

export interface PomodoroSounds {
  sessionComplete: AudioBuffer | null
  tick: AudioBuffer | null
  ambient?: AudioBuffer | null
}

export interface PomodoroModalProps {
  isOpen: boolean
  onClose: () => void
}

export interface CircularProgressProps {
  progress: number          // 0-100
  size?: number            // diameter in pixels
  strokeWidth?: number     // stroke width in pixels
  className?: string
}

export interface PomodoroPhrase {
  text: string
  author?: string
  type: 'focus' | 'break' | 'motivation'
}

// Default settings
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 20,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundEnabled: true,
  soundVolume: 50,
  tickSoundEnabled: true,
  tickSoundDuration: 10,
  notificationsEnabled: false
}

// Constants
export const POMODOROS_UNTIL_LONG_BREAK = 4
export const STORAGE_KEY_SETTINGS = 'virgil_pomodoro_settings'
export const STORAGE_KEY_STATS = 'virgil_pomodoro_stats'
export const STORAGE_KEY_SESSIONS = 'virgil_pomodoro_sessions'

// Duration constraints (in minutes)
export const DURATION_CONSTRAINTS = {
  work: { min: 15, max: 60, step: 5 },
  shortBreak: { min: 3, max: 15, step: 1 },
  longBreak: { min: 15, max: 45, step: 5 }
}

// Motivational phrases
export const POMODORO_PHRASES: PomodoroPhrase[] = [
  { text: "Focus is a muscle. Train it well.", type: 'focus' },
  { text: "Deep work creates deep value.", type: 'focus' },
  { text: "One task at a time, one moment at a time.", type: 'focus' },
  { text: "Progress, not perfection.", type: 'motivation' },
  { text: "Your future self will thank you.", type: 'motivation' },
  { text: "Rest is not a reward for work completed, but a requirement for work to continue.", type: 'break' },
  { text: "Take a breath. Stretch. You've earned it.", type: 'break' },
  { text: "A rested mind is a creative mind.", type: 'break' }
]