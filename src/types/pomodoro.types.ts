// Simplified Pomodoro Types
export type SessionType = "work" | "break";

export interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Storage state for persistent timer
export interface PomodoroStorageState {
  isRunning: boolean;
  selectedMinutes: number;
  startTime: number;
  pausedAt?: number;
  totalPausedTime: number;
  soundEnabled: boolean;
  completedAt?: number;
}

// Service Worker message types
export type PomodoroSWMessage = 
  | { type: "START_TIMER"; duration: number }
  | { type: "PAUSE_TIMER" }
  | { type: "RESUME_TIMER" }
  | { type: "STOP_TIMER" }
  | { type: "TIMER_TICK"; timeRemaining: number }
  | { type: "TIMER_COMPLETE" }
  | { type: "SYNC_STATE"; state: PomodoroStorageState };

// Storage keys for any future persistence needs
export const STORAGE_KEY_POMODOROS = "virgil_pomodoro_count";
