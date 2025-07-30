import { useReducer, useEffect, useRef, useCallback } from 'react';
import { logger } from '../../lib/logger';
import { dashboardContextService } from '../../services/DashboardContextService';

// State types
interface TimerState {
  selectedMinutes: number;
  timeRemaining: number;
  isRunning: boolean;
  soundEnabled: boolean;
  sessionType: 'work' | 'shortBreak' | 'longBreak';
  sessionCount: number;
  dailyStats: {
    totalMinutes: number;
    completedSessions: number;
    currentStreak: number;
  };
  currentTask: string;
}

type TimerAction =
  | { type: 'SET_MINUTES'; minutes: number }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'COMPLETE' }
  | { type: 'SET_SESSION_TYPE'; sessionType: 'work' | 'shortBreak' | 'longBreak' }
  | { type: 'SET_TASK'; task: string }
  | { type: 'UPDATE_DAILY_STATS' }
  | { type: 'LOAD_DAILY_STATS'; stats: TimerState['dailyStats'] };

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
    case 'COMPLETE': {
      // Update session count and stats
      const isWorkSession = state.sessionType === 'work';
      let nextSessionCount = state.sessionCount;
      
      // Only increment session count after completing a work session
      if (isWorkSession) {
        nextSessionCount = state.sessionCount >= 4 ? 1 : state.sessionCount + 1;
      }
      
      return {
        ...state,
        isRunning: false,
        sessionCount: nextSessionCount,
        dailyStats: isWorkSession ? {
          ...state.dailyStats,
          totalMinutes: state.dailyStats.totalMinutes + state.selectedMinutes,
          completedSessions: state.dailyStats.completedSessions + 1,
        } : state.dailyStats,
      };
    }
    case 'SET_SESSION_TYPE': {
      const minutes = action.sessionType === 'work' ? 25 : 
        action.sessionType === 'shortBreak' ? 5 : 15;
      return {
        ...state,
        sessionType: action.sessionType,
        selectedMinutes: minutes,
        timeRemaining: minutes * 60,
        isRunning: false,
      };
    }
    case 'SET_TASK':
      return { ...state, currentTask: action.task };
    case 'UPDATE_DAILY_STATS':
      return {
        ...state,
        dailyStats: {
          ...state.dailyStats,
          currentStreak: state.dailyStats.currentStreak + 1,
        },
      };
    case 'LOAD_DAILY_STATS':
      return { ...state, dailyStats: action.stats };
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
    sessionType: 'work',
    sessionCount: 1,
    dailyStats: {
      totalMinutes: 0,
      completedSessions: 0,
      currentStreak: 0,
    },
    currentTask: '',
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load daily stats from localStorage
  useEffect(() => {
    const today = dashboardContextService.getLocalDate();
    const statsKey = `pomodoro-daily-stats-${today}`;
    const savedStats = localStorage.getItem(statsKey);
    
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        dispatch({ type: 'LOAD_DAILY_STATS', stats });
      } catch (error) {
        logger.error('Failed to load daily stats', error as Error, {
          component: 'usePomodoro',
          action: 'loadDailyStats',
        });
      }
    }
  }, []);

  // Save daily stats to localStorage
  useEffect(() => {
    const today = dashboardContextService.getLocalDate();
    const statsKey = `pomodoro-daily-stats-${today}`;
    
    localStorage.setItem(statsKey, JSON.stringify(state.dailyStats));
  }, [state.dailyStats]);

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
    
    // Auto-switch to break after work session
    setTimeout(() => {
      if (state.sessionType === 'work') {
        // Take long break after completing 4th work session
        const shouldTakeLongBreak = state.sessionCount === 4;
        dispatch({ 
          type: 'SET_SESSION_TYPE', 
          sessionType: shouldTakeLongBreak ? 'longBreak' : 'shortBreak',
        });
      } else {
        // After break, switch back to work
        dispatch({ type: 'SET_SESSION_TYPE', sessionType: 'work' });
      }
    }, 600);
  }, [playSound, state.sessionType, state.sessionCount]);

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
    setSessionType: (sessionType: 'work' | 'shortBreak' | 'longBreak') => 
      dispatch({ type: 'SET_SESSION_TYPE', sessionType }),
    setTask: (task: string) => dispatch({ type: 'SET_TASK', task }),
  };
}
