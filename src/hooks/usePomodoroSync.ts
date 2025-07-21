import { useEffect, useCallback, useRef } from "react";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { PomodoroStorageState, PomodoroSWMessage } from "../types/pomodoro.types";

interface UsePomodoroSyncProps {
  onTimerTick?: (timeRemaining: number) => void;
  onTimerComplete?: () => void;
  onStateSync?: (state: PomodoroStorageState) => void;
}

export function usePomodoroSync({
  onTimerTick,
  onTimerComplete,
  onStateSync,
}: UsePomodoroSyncProps) {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Send message to Service Worker
  const sendToServiceWorker = useCallback((message: PomodoroSWMessage) => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "POMODORO_MESSAGE",
        data: message,
      });
    }
  }, []);

  // Start timer in Service Worker
  const startTimer = useCallback((duration: number) => {
    const state: PomodoroStorageState = {
      isRunning: true,
      selectedMinutes: Math.ceil(duration / 60),
      startTime: Date.now(),
      totalPausedTime: 0,
      soundEnabled: storage.get(STORAGE_KEYS.POMODORO_STATE)?.soundEnabled ?? true,
    };
    
    storage.set(STORAGE_KEYS.POMODORO_STATE, state);
    sendToServiceWorker({ type: "START_TIMER", duration });
  }, [sendToServiceWorker]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    const state = storage.get<PomodoroStorageState>(STORAGE_KEYS.POMODORO_STATE);
    if (state && state.isRunning) {
      const updatedState: PomodoroStorageState = {
        ...state,
        isRunning: false,
        pausedAt: Date.now(),
      };
      storage.set(STORAGE_KEYS.POMODORO_STATE, updatedState);
      sendToServiceWorker({ type: "PAUSE_TIMER" });
    }
  }, [sendToServiceWorker]);

  // Resume timer
  const resumeTimer = useCallback(() => {
    const state = storage.get<PomodoroStorageState>(STORAGE_KEYS.POMODORO_STATE);
    if (state && !state.isRunning && state.pausedAt) {
      const pauseDuration = Date.now() - state.pausedAt;
      const updatedState: PomodoroStorageState = {
        ...state,
        isRunning: true,
        totalPausedTime: state.totalPausedTime + pauseDuration,
        pausedAt: undefined,
      };
      storage.set(STORAGE_KEYS.POMODORO_STATE, updatedState);
      sendToServiceWorker({ type: "RESUME_TIMER" });
    }
  }, [sendToServiceWorker]);

  // Stop/Reset timer
  const stopTimer = useCallback(() => {
    storage.remove(STORAGE_KEYS.POMODORO_STATE);
    sendToServiceWorker({ type: "STOP_TIMER" });
  }, [sendToServiceWorker]);

  // Calculate current time remaining
  const getTimeRemaining = useCallback((): number => {
    const state = storage.get<PomodoroStorageState>(STORAGE_KEYS.POMODORO_STATE);
    if (!state) return 0;

    const totalDuration = state.selectedMinutes * 60 * 1000;
    
    if (state.completedAt) {
      return 0;
    }

    if (state.isRunning) {
      const elapsed = Date.now() - state.startTime - state.totalPausedTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      return Math.ceil(remaining / 1000);
    } else if (state.pausedAt) {
      const elapsed = state.pausedAt - state.startTime - state.totalPausedTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      return Math.ceil(remaining / 1000);
    }

    return Math.ceil(totalDuration / 1000);
  }, []);

  // Handle messages from Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "POMODORO_UPDATE") {
        const message = event.data.data as PomodoroSWMessage;
        
        switch (message.type) {
          case "TIMER_TICK":
            onTimerTick?.(message.timeRemaining);
            break;
          case "TIMER_COMPLETE":
            const state = storage.get<PomodoroStorageState>(STORAGE_KEYS.POMODORO_STATE);
            if (state) {
              storage.set(STORAGE_KEYS.POMODORO_STATE, {
                ...state,
                isRunning: false,
                completedAt: Date.now(),
              });
            }
            onTimerComplete?.();
            break;
          case "SYNC_STATE":
            onStateSync?.(message.state);
            break;
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
      
      // Get SW registration
      navigator.serviceWorker.ready.then((registration) => {
        swRegistrationRef.current = registration;
      });
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, [onTimerTick, onTimerComplete, onStateSync]);

  // Sync state on mount and visibility change
  useEffect(() => {
    const syncState = () => {
      const state = storage.get<PomodoroStorageState>(STORAGE_KEYS.POMODORO_STATE);
      if (state) {
        sendToServiceWorker({ type: "SYNC_STATE", state });
        onStateSync?.(state);
      }
    };

    // Initial sync
    syncState();

    // Sync on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendToServiceWorker, onStateSync]);

  return {
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTimeRemaining,
    sendToServiceWorker,
  };
}