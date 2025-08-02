/**
 * TimezoneContext
 *
 * Provides shared timezone state across all timezone components
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { useTimezones as useTimezonesHook } from './useTimezones';
import type { SelectedTimezone } from './timezoneData';
import type { TimezoneWithTime } from './useTimezones';

interface TimezoneContextValue {
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

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const timezoneData = useTimezonesHook();

  return (
    <TimezoneContext.Provider value={timezoneData}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezones() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezones must be used within a TimezoneProvider');
  }
  return context;
}