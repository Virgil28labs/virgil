/**
 * Time Slice - Single Source of Truth for Time Operations
 * 
 * Integrates with TimeService to provide centralized time state management
 * through Zustand store. TimeService remains the authoritative source.
 */

import type { StateCreator } from 'zustand';
import { timeService, type TimeUpdate } from '../../services/TimeService';
import type { 
  TimeState, 
  TimeActions,
  ContextStoreWithActions, 
} from '../types/store.types';

// Combined time slice interface
export interface TimeSlice extends TimeState, TimeActions {}

// Default time state
const defaultTimeState: TimeState = {
  currentTime: '12:00',
  currentDate: 'January 1, 2024',
  timeOfDay: 'morning',
  dayOfWeek: 'monday',
  timestamp: timeService.getTimestamp(),
  dateObject: timeService.getCurrentDateTime(),
  isValid: true,
  lastUpdated: timeService.getTimestamp(),
  updateInterval: 1000,
  isActive: true,
};

// TimeService subscription management
let timeServiceUnsubscribe: (() => void) | null = null;

/**
 * Initialize time state from TimeService
 */
const initializeTimeState = (): TimeState => {
  try {
    return {
      currentTime: timeService.getCurrentTime(),
      currentDate: timeService.getCurrentDate(),
      timeOfDay: timeService.getTimeOfDay(),
      dayOfWeek: timeService.getDayOfWeek(),
      timestamp: timeService.getTimestamp(),
      dateObject: timeService.getCurrentDateTime(),
      isValid: true,
      lastUpdated: timeService.getTimestamp(),
      updateInterval: 1000,
      isActive: true,
    };
  } catch (error) {
    console.error('TimeSlice: Failed to initialize from TimeService:', error);
    return {
      ...defaultTimeState,
      isValid: false,
      timestamp: timeService.getTimestamp(),
      dateObject: timeService.getCurrentDateTime(),
      lastUpdated: timeService.getTimestamp(),
    };
  }
};

/**
 * Create time slice with TimeService integration
 */
export const createTimeSlice: StateCreator<
  ContextStoreWithActions,
  [],
  [],
  { time: TimeSlice }
> = (set, get, _api) => ({
  time: {
    // Initialize with TimeService data
    ...initializeTimeState(),

    // ========== Core Time Actions ==========

    updateTime: (timeData: Partial<TimeState>) => {
      set((state) => ({
        time: {
          ...state.time,
          ...timeData,
          lastUpdated: timeService.getTimestamp(),
        },
      }));
    },

    setTimeValid: (isValid: boolean) => {
      set((state) => ({
        time: {
          ...state.time,
          isValid,
          lastUpdated: timeService.getTimestamp(),
        },
      }));
    },

    setUpdateInterval: (interval: number) => {
      // Validate interval (min 100ms, max 60s)
      const validInterval = Math.max(100, Math.min(60000, interval));
      
      set((state) => ({
        time: {
          ...state.time,
          updateInterval: validInterval,
        },
      }));

      // Restart subscription with new interval if active
      const currentState = get();
      if (currentState.time.isActive) {
        currentState.time.unsubscribeFromTimeService();
        currentState.time.subscribeToTimeService();
      }
    },

    setActive: (isActive: boolean) => {
      set((state) => ({
        time: {
          ...state.time,
          isActive,
        },
      }));

      // Start or stop time service subscription
      if (isActive) {
        get().time.subscribeToTimeService();
      } else {
        get().time.unsubscribeFromTimeService();
      }
    },

    // ========== TimeService Integration Actions ==========

    syncWithTimeService: () => {
      try {
        const timeUpdate: TimeUpdate = {
          currentTime: timeService.getCurrentTime(),
          currentDate: timeService.getCurrentDate(),
          dateObject: timeService.getCurrentDateTime(),
        };

        set((state) => ({
          time: {
            ...state.time,
            currentTime: timeUpdate.currentTime,
            currentDate: timeUpdate.currentDate,
            timeOfDay: timeService.getTimeOfDay(),
            dayOfWeek: timeService.getDayOfWeek(),
            timestamp: timeService.getTimestamp(),
            dateObject: timeUpdate.dateObject,
            isValid: true,
            lastUpdated: timeService.getTimestamp(),
          },
        }));
      } catch (error) {
        console.error('TimeSlice: Failed to sync with TimeService:', error);
        
        // Set invalid state but maintain store functionality
        set((state) => ({
          time: {
            ...state.time,
            isValid: false,
            lastUpdated: timeService.getTimestamp(),
            // Use fallback values to prevent UI breaks
            timestamp: timeService.getTimestamp(),
            dateObject: timeService.getCurrentDateTime(),
          },
        }));
      }
    },

    subscribeToTimeService: () => {
      // Unsubscribe from any existing subscription
      if (timeServiceUnsubscribe) {
        timeServiceUnsubscribe();
        timeServiceUnsubscribe = null;
      }

      try {
        // Subscribe to TimeService updates
        timeServiceUnsubscribe = timeService.subscribeToTimeUpdates((timeUpdate: TimeUpdate) => {
          const currentState = get();
          
          // Only update if time slice is active
          if (!currentState.time.isActive) {
            return;
          }

          try {
            set((state) => ({
              time: {
                ...state.time,
                currentTime: timeUpdate.currentTime,
                currentDate: timeUpdate.currentDate,
                timeOfDay: timeService.getTimeOfDay(),
                dayOfWeek: timeService.getDayOfWeek(),
                timestamp: timeService.getTimestamp(),
                dateObject: timeUpdate.dateObject,
                isValid: true,
                lastUpdated: timeService.getTimestamp(),
              },
            }));
          } catch (error) {
            console.error('TimeSlice: Error updating time from subscription:', error);
            
            // Mark as invalid but don't crash
            set((state) => ({
              time: {
                ...state.time,
                isValid: false,
                lastUpdated: timeService.getTimestamp(),
              },
            }));
          }
        });

        // Successfully subscribed to TimeService updates
      } catch (error) {
        console.error('TimeSlice: Failed to subscribe to TimeService:', error);
        
        set((state) => ({
          time: {
            ...state.time,
            isValid: false,
          },
        }));
      }
    },

    unsubscribeFromTimeService: () => {
      if (timeServiceUnsubscribe) {
        try {
          timeServiceUnsubscribe();
          timeServiceUnsubscribe = null;
          // Successfully unsubscribed from TimeService
        } catch (error) {
          console.error('TimeSlice: Error unsubscribing from TimeService:', error);
        }
      }
    },
  },
});

// ========== Time Slice Utilities ==========

/**
 * Get formatted time string with fallback
 */
export const getFormattedTime = (state: TimeState): string => {
  if (!state.isValid) {
    return timeService.getCurrentTime();
  }
  return state.currentTime;
};

/**
 * Get formatted date string with fallback
 */
export const getFormattedDate = (state: TimeState): string => {
  if (!state.isValid) {
    return timeService.getCurrentDate();
  }
  return state.currentDate;
};

/**
 * Check if time data is fresh (within reasonable bounds)
 */
export const isTimeDataFresh = (state: TimeState): boolean => {
  const now = timeService.getTimestamp();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  return state.isValid && (now - state.lastUpdated) < maxAge;
};

/**
 * Get relative time string using TimeService
 */
export const getRelativeTime = (date: Date): string => {
  try {
    return timeService.getRelativeTime(date);
  } catch (error) {
    console.error('TimeSlice: Error getting relative time:', error);
    // Fallback to simple calculation
    const diff = Math.floor((timeService.getTimestamp() - timeService.toTimestamp(date)) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }
};

/**
 * Initialize time slice on store creation
 */
export const initializeTimeSlice = (store: { getState: () => { time: TimeSlice } }) => {
  // Start TimeService subscription automatically
  store.getState().time.subscribeToTimeService();
  
  // Sync once on initialization
  store.getState().time.syncWithTimeService();
  
  return () => {
    // Cleanup function
    store.getState().time.unsubscribeFromTimeService();
  };
};

// ========== Time Selectors ==========

export const timeSelectors = {
  getCurrentTime: (state: ContextStoreWithActions) => getFormattedTime(state.time),
  getCurrentDate: (state: ContextStoreWithActions) => getFormattedDate(state.time),
  getTimeOfDay: (state: ContextStoreWithActions) => state.time.timeOfDay,
  getDayOfWeek: (state: ContextStoreWithActions) => state.time.dayOfWeek,
  getTimestamp: (state: ContextStoreWithActions) => state.time.timestamp,
  getDateObject: (state: ContextStoreWithActions) => state.time.dateObject,
  isTimeValid: (state: ContextStoreWithActions) => state.time.isValid,
  isTimeDataFresh: (state: ContextStoreWithActions) => isTimeDataFresh(state.time),
  getLastUpdated: (state: ContextStoreWithActions) => state.time.lastUpdated,
  isActive: (state: ContextStoreWithActions) => state.time.isActive,
} as const;