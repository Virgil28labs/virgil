/**
 * TimezoneContext Provider
 *
 * Provides shared timezone state across all timezone components
 */

import type { ReactNode } from 'react';
import { useTimezones as useTimezonesHook } from './useTimezones';
import { TimezoneContext } from './TimezoneContextDefinition';

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const timezoneData = useTimezonesHook();

  return (
    <TimezoneContext.Provider value={timezoneData}>
      {children}
    </TimezoneContext.Provider>
  );
}