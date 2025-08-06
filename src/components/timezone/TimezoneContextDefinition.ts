/**
 * Timezone Context Definition
 * 
 * Defines the timezone context interface and creates the context.
 * Separated from the provider to avoid react-refresh warnings.
 */

import { createContext } from 'react';
import type { SelectedTimezone } from './timezoneData';
import type { TimezoneWithTime } from './useTimezones';

export interface TimezoneContextValue {
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

export const TimezoneContext = createContext<TimezoneContextValue | null>(null);