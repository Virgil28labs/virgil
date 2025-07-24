/**
 * useTimezones Hook
 * 
 * Manages timezone state, localStorage persistence, and real-time updates
 * for the timezone widget functionality.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import type { SelectedTimezone } from './timezoneData';
import { getDefaultTimezones, generateTimezoneId, getTimezoneInfo } from './timezoneData';
import { dashboardContextService } from '../../services/DashboardContextService';

export interface TimezoneWithTime extends SelectedTimezone {
  currentTime: DateTime
  isValid: boolean
}

interface UseTimezonesReturn {
  selectedTimezones: SelectedTimezone[]
  timezonesWithTime: TimezoneWithTime[]
  addTimezone: (timezone: string, label?: string) => boolean
  removeTimezone: (id: string) => void
  updateTimezoneLabel: (id: string, label: string) => void
  reorderTimezones: (fromIndex: number, toIndex: number) => void
  clearAllTimezones: () => void
  canAddMoreTimezones: boolean
  isUpdating: boolean
}

const STORAGE_KEY = 'virgil_selected_timezones';
const MAX_TIMEZONES = 5;
const UPDATE_INTERVAL = 10000; // Update every 10 seconds for better performance

/**
 * Load timezones from localStorage with error handling
 */
function loadTimezonesFromStorage(): SelectedTimezone[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultTimezones();
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return getDefaultTimezones();
    
    // Validate structure
    const valid = parsed.every(tz => 
      tz && 
      typeof tz.id === 'string' && 
      typeof tz.timezone === 'string' && 
      typeof tz.label === 'string' && 
      typeof tz.order === 'number',
    );
    
    if (!valid) return getDefaultTimezones();
    
    // Sort by order and return
    return parsed.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.warn('Failed to load timezones from localStorage:', error);
    return getDefaultTimezones();
  }
}

/**
 * Save timezones to localStorage with error handling
 */
function saveTimezonesToStorage(timezones: SelectedTimezone[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timezones));
  } catch (error) {
    console.warn('Failed to save timezones to localStorage:', error);
  }
}

/**
 * Custom hook for managing timezone state and operations
 */
export function useTimezones(): UseTimezonesReturn {
  const [selectedTimezones, setSelectedTimezones] = useState<SelectedTimezone[]>(() => 
    loadTimezonesFromStorage(),
  );
  const [currentDateTime, setCurrentDateTime] = useState<DateTime>(() => 
    DateTime.fromJSDate(dashboardContextService.getCurrentDateTime())
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Subscribe to TimeService for coordinated updates (1-second precision)
  useEffect(() => {
    const unsubscribe = dashboardContextService.subscribeToTimeUpdates(({ dateObject }) => {
      setIsUpdating(true);
      setCurrentDateTime(DateTime.fromJSDate(dateObject));
      // Use setTimeout to avoid immediate state updates
      setTimeout(() => setIsUpdating(false), 0);
    });

    return unsubscribe;
  }, []);

  // Save to localStorage whenever selectedTimezones changes
  useEffect(() => {
    saveTimezonesToStorage(selectedTimezones);
  }, [selectedTimezones]);

  // Memoized timezone data with current times
  const timezonesWithTime = useMemo<TimezoneWithTime[]>(() => {
    return selectedTimezones.map(tz => {
      try {
        const timeInZone = currentDateTime.setZone(tz.timezone);
        return {
          ...tz,
          currentTime: timeInZone,
          isValid: timeInZone.isValid,
        };
      } catch (error) {
        console.warn(`Invalid timezone: ${tz.timezone}`, error);
        return {
          ...tz,
          currentTime: currentDateTime,
          isValid: false,
        };
      }
    });
  }, [selectedTimezones, currentDateTime]);

  // Add timezone with validation
  const addTimezone = useCallback((timezone: string, customLabel?: string): boolean => {
    if (selectedTimezones.length >= MAX_TIMEZONES) {
      return false;
    }

    // Check if timezone already exists
    if (selectedTimezones.some(tz => tz.timezone === timezone)) {
      return false;
    }

    // Validate timezone using TimeService
    try {
      const testTime = DateTime.fromJSDate(dashboardContextService.getCurrentDateTime()).setZone(timezone);
      if (!testTime.isValid) {
        return false;
      }
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}`, error);
      return false;
    }

    // Generate label
    const timezoneInfo = getTimezoneInfo(timezone);
    const label = customLabel || timezoneInfo?.city || timezone;

    const newTimezone: SelectedTimezone = {
      id: generateTimezoneId(),
      timezone,
      label,
      order: selectedTimezones.length,
    };

    setSelectedTimezones(prev => [...prev, newTimezone]);
    return true;
  }, [selectedTimezones]);

  // Remove timezone
  const removeTimezone = useCallback((id: string): void => {
    setSelectedTimezones(prev => {
      const filtered = prev.filter(tz => tz.id !== id);
      // Reorder after removal
      return filtered.map((tz, index) => ({ ...tz, order: index }));
    });
  }, []);

  // Update timezone label
  const updateTimezoneLabel = useCallback((id: string, label: string): void => {
    if (!label.trim()) return;

    setSelectedTimezones(prev => 
      prev.map(tz => 
        tz.id === id ? { ...tz, label: label.trim() } : tz,
      ),
    );
  }, []);

  // Reorder timezones (for drag and drop)
  const reorderTimezones = useCallback((fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= selectedTimezones.length) return;
    if (toIndex < 0 || toIndex >= selectedTimezones.length) return;

    setSelectedTimezones(prev => {
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      
      // Update order values
      return reordered.map((tz, index) => ({ ...tz, order: index }));
    });
  }, [selectedTimezones.length]);

  // Clear all timezones
  const clearAllTimezones = useCallback((): void => {
    setSelectedTimezones([]);
  }, []);

  // Check if more timezones can be added
  const canAddMoreTimezones = selectedTimezones.length < MAX_TIMEZONES;

  return {
    selectedTimezones,
    timezonesWithTime,
    addTimezone,
    removeTimezone,
    updateTimezoneLabel,
    reorderTimezones,
    clearAllTimezones,
    canAddMoreTimezones,
    isUpdating,
  };
}

/**
 * Utility hook for formatting timezone displays
 */
export function useTimezoneFormatters() {
  return useMemo(() => ({
    // Format time in 24-hour format
    formatTime: (dateTime: DateTime): string => {
      return dateTime.toFormat('HH:mm');
    },
    
    // Format relative time (e.g., "3 hours ahead")
    formatRelativeTime: (dateTime: DateTime, baseTime: DateTime): string => {
      const diffHours = dateTime.diff(baseTime, 'hours').hours;
      
      if (diffHours === 0) return 'Same time';
      if (diffHours > 0) {
        const hours = Math.floor(Math.abs(diffHours));
        return `${hours}h ahead`;
      } else {
        const hours = Math.floor(Math.abs(diffHours));
        return `${hours}h behind`;
      }
    },
  }), []);
}