/**
 * useTime - React hook for time operations
 * 
 * Provides easy access to time-related functionality through React hooks.
 * All operations use TimeService internally for consistency.
 */

import { useState, useEffect, useCallback } from 'react';
import { timeService } from '../services/TimeService';
import type { TimeUpdate } from '../services/TimeService';

/**
 * Hook for getting the current time with live updates
 * @param updateInterval - Update interval in milliseconds (default: 1000)
 * @returns Current time information
 */
export function useCurrentTime(updateInterval = 1000) {
  const [time, setTime] = useState<TimeUpdate>(() => ({
    currentTime: timeService.getCurrentTime(),
    currentDate: timeService.getCurrentDate(),
    dateObject: timeService.getCurrentDateTime(),
  }));

  useEffect(() => {
    // Update immediately
    const updateTime = () => {
      const now = timeService.getCurrentDateTime();
      setTime({
        currentTime: timeService.getCurrentTime(),
        currentDate: timeService.getCurrentDate(),
        dateObject: now,
      });
    };

    // Set up interval
    const interval = setInterval(updateTime, updateInterval);
    
    // Subscribe to TimeService updates for 1-second precision
    const unsubscribe = timeService.subscribeToTimeUpdates(setTime);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [updateInterval]);

  return time;
}

/**
 * Hook for getting relative time with automatic updates
 * @param date - Date to compare against current time
 * @param updateInterval - Update interval in milliseconds (default: 60000)
 * @returns Relative time string (e.g., "2 hours ago")
 */
export function useTimeAgo(date: Date | null | undefined, updateInterval = 60000) {
  const [timeAgo, setTimeAgo] = useState(() => 
    date ? timeService.getTimeAgo(date) : '',
  );

  useEffect(() => {
    if (!date) {
      setTimeAgo('');
      return;
    }

    const updateTimeAgo = () => {
      setTimeAgo(timeService.getTimeAgo(date));
    };

    // Update immediately
    updateTimeAgo();

    // Set up interval
    const interval = setInterval(updateTimeAgo, updateInterval);

    return () => clearInterval(interval);
  }, [date, updateInterval]);

  return timeAgo;
}

/**
 * Hook for getting relative time (past or future) with automatic updates
 * @param date - Date to compare against current time
 * @param updateInterval - Update interval in milliseconds (default: 60000)
 * @returns Relative time string (e.g., "in 2 hours", "3 days ago")
 */
export function useRelativeTime(date: Date | null | undefined, updateInterval = 60000) {
  const [relativeTime, setRelativeTime] = useState(() => 
    date ? timeService.getRelativeTime(date) : '',
  );

  useEffect(() => {
    if (!date) {
      setRelativeTime('');
      return;
    }

    const updateRelativeTime = () => {
      setRelativeTime(timeService.getRelativeTime(date));
    };

    // Update immediately
    updateRelativeTime();

    // Set up interval
    const interval = setInterval(updateRelativeTime, updateInterval);

    return () => clearInterval(interval);
  }, [date, updateInterval]);

  return relativeTime;
}

/**
 * Hook for formatting dates with memoization
 * @returns Object with formatting functions
 */
export function useDateFormatter() {
  const formatDate = useCallback((date?: Date) => {
    return timeService.formatDate(date);
  }, []);

  const formatDateToLocal = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return timeService.formatDateToLocal(date, options);
  }, []);

  const formatTime = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return timeService.formatTimeToLocal(date, options);
  }, []);

  const formatDateTime = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return timeService.formatDateTimeToLocal(date, options);
  }, []);

  const toISOString = useCallback((date?: Date) => {
    return timeService.toISOString(date);
  }, []);

  const toISODateString = useCallback((date?: Date) => {
    return timeService.toISODateString(date);
  }, []);

  return {
    formatDate,
    formatDateToLocal,
    formatTime,
    formatDateTime,
    toISOString,
    toISODateString,
  };
}

/**
 * Hook for date arithmetic operations
 * @returns Object with date arithmetic functions
 */
export function useDateMath() {
  const addDays = useCallback((date: Date, days: number) => {
    return timeService.addDays(date, days);
  }, []);

  const subtractDays = useCallback((date: Date, days: number) => {
    return timeService.subtractDays(date, days);
  }, []);

  const addMonths = useCallback((date: Date, months: number) => {
    return timeService.addMonths(date, months);
  }, []);

  const subtractMonths = useCallback((date: Date, months: number) => {
    return timeService.subtractMonths(date, months);
  }, []);

  const addHours = useCallback((date: Date, hours: number) => {
    return timeService.addHours(date, hours);
  }, []);

  const subtractHours = useCallback((date: Date, hours: number) => {
    return timeService.subtractHours(date, hours);
  }, []);

  const getDaysBetween = useCallback((date1: Date, date2: Date) => {
    return timeService.getDaysBetween(date1, date2);
  }, []);

  const getHoursDifference = useCallback((date1: Date, date2: Date) => {
    return timeService.getHoursDifference(date1, date2);
  }, []);

  return {
    addDays,
    subtractDays,
    addMonths,
    subtractMonths,
    addHours,
    subtractHours,
    getDaysBetween,
    getHoursDifference,
  };
}

/**
 * Hook for date boundary operations
 * @returns Object with date boundary functions
 */
export function useDateBoundaries() {
  const startOfDay = useCallback((date?: Date) => {
    return timeService.startOfDay(date);
  }, []);

  const endOfDay = useCallback((date?: Date) => {
    return timeService.endOfDay(date);
  }, []);

  const startOfWeek = useCallback((date?: Date) => {
    return timeService.startOfWeek(date);
  }, []);

  const endOfWeek = useCallback((date?: Date) => {
    return timeService.endOfWeek(date);
  }, []);

  const startOfMonth = useCallback((date?: Date) => {
    return timeService.startOfMonth(date);
  }, []);

  const endOfMonth = useCallback((date?: Date) => {
    return timeService.endOfMonth(date);
  }, []);

  return {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
  };
}

/**
 * Hook for date validation and parsing
 * @returns Object with validation functions
 */
export function useDateValidation() {
  const isValidDate = useCallback((date: unknown): date is Date => {
    return timeService.isValidDate(date);
  }, []);

  const parseDate = useCallback((dateString: string) => {
    return timeService.parseDate(dateString);
  }, []);

  const isToday = useCallback((date: Date) => {
    return timeService.isToday(date);
  }, []);

  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return timeService.isSameDay(date1, date2);
  }, []);

  return {
    isValidDate,
    parseDate,
    isToday,
    isSameDay,
  };
}

/**
 * Hook for getting common time values
 * @returns Object with common time values and functions
 */
export function useTimeHelpers() {
  const [localDate, setLocalDate] = useState(() => timeService.getLocalDate());
  const [timeOfDay, setTimeOfDay] = useState(() => timeService.getTimeOfDay());
  const [dayOfWeek, setDayOfWeek] = useState(() => timeService.getDayOfWeek());

  useEffect(() => {
    const updateValues = () => {
      setLocalDate(timeService.getLocalDate());
      setTimeOfDay(timeService.getTimeOfDay());
      setDayOfWeek(timeService.getDayOfWeek());
    };

    // Update every minute
    const interval = setInterval(updateValues, 60000);

    return () => clearInterval(interval);
  }, []);

  const getCurrentDateTime = useCallback(() => {
    return timeService.getCurrentDateTime();
  }, []);

  const getTimestamp = useCallback(() => {
    return timeService.getTimestamp();
  }, []);

  return {
    localDate,
    timeOfDay,
    dayOfWeek,
    getCurrentDateTime,
    getTimestamp,
  };
}