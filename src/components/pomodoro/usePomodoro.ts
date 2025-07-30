import { useReducer, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../lib/logger';

// State types
interface TimerState {
  selectedMinutes: number;
  timeRemaining: number;
  isRunning: boolean;
  soundEnabled: boolean;
}

type TimerAction =
  | { type: 'SET_MINUTES'; minutes: number }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'COMPLETE' };

// Reducer
function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SET_MINUTES':
      return {
        ...state,
        selectedMinutes: action.minutes,
        timeRemaining: action.minutes * 60,
        isRunning: false,
      };
    case 'START':
      return { ...state, isRunning: true };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESET':
      return {
        ...state,
        timeRemaining: state.selectedMinutes * 60,
        isRunning: false,
      };
    case 'TICK':
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1),
      };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'COMPLETE':
      return { ...state, isRunning: false };
    default:
      return state;
  }
}

export function usePomodoro(defaultMinutes: number = 25) {
  const [state, dispatch] = useReducer(timerReducer, {
    selectedMinutes: defaultMinutes,
    timeRemaining: defaultMinutes * 60,
    isRunning: false,
    soundEnabled: true,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    return () => {
      // Cleanup interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Play sound
  const playSound = useCallback((frequency: number = 800, duration: number = 100) => {
    if (!state.soundEnabled || !audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      logger.error('Error playing sound', error as Error, {
        component: 'usePomodoro',
        action: 'playSound',
      });
    }
  }, [state.soundEnabled]);

  // Timer completion
  const handleComplete = useCallback(() => {
    dispatch({ type: 'COMPLETE' });
    // Play completion sound (3 beeps)
    playSound(1000, 150);
    setTimeout(() => playSound(1000, 150), 200);
    setTimeout(() => playSound(1000, 150), 400);
  }, [playSound]);

  // Timer tick
  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (state.isRunning && state.timeRemaining === 0) {
        handleComplete();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.timeRemaining, handleComplete]);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update browser tab title with countdown
  useEffect(() => {
    const originalTitle = document.title;
    
    if (state.isRunning && state.timeRemaining > 0) {
      document.title = `🍅 ${formatTime(state.timeRemaining)} - Virgil`;
    } else if (state.timeRemaining === 0) {
      // Flash title when complete
      document.title = '✅ Complete! - Virgil';
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [state.isRunning, state.timeRemaining, formatTime]);

  // Calculate progress
  const progress = ((state.selectedMinutes * 60 - state.timeRemaining) / (state.selectedMinutes * 60)) * 100;

  return {
    state,
    dispatch,
    progress,
    formatTime,
    setMinutes: (minutes: number) => dispatch({ type: 'SET_MINUTES', minutes }),
    start: () => dispatch({ type: 'START' }),
    pause: () => dispatch({ type: 'PAUSE' }),
    reset: () => dispatch({ type: 'RESET' }),
    toggleSound: () => dispatch({ type: 'TOGGLE_SOUND' }),
  };
}
