// Simplified Pomodoro Types
export type SessionType = "work" | "break";

export interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Storage keys for any future persistence needs
export const STORAGE_KEY_POMODOROS = "virgil_pomodoro_count";
