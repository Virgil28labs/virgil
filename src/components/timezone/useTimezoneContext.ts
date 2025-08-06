/**
 * Timezone context hook
 */

import { useContext } from 'react';
import { TimezoneContext } from './TimezoneContextDefinition';

export function useTimezones() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezones must be used within a TimezoneProvider');
  }
  return context;
}