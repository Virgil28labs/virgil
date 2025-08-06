/**
 * Store utility hooks
 * Separated from ContextStoreProvider to avoid react-refresh warnings
 */

import { useActivityActions } from './useContextStore';
import { useContextStore } from '../ContextStore';

/**
 * Hook for manually logging activities from components
 */
export const useActivityLogger = () => {
  const activityActions = useActivityActions();

  return {
    logActivity: activityActions.logActivity,
    logComponentActivity: (component: string, action: string) => {
      activityActions.logActivity(`${component}_${action}`, component);
    },
    logUserAction: (action: string, details?: string) => {
      const fullAction = details ? `${action}_${details}` : action;
      activityActions.logActivity(fullAction);
    },
  };
};

/**
 * Hook for environment utilities
 */
export const useEnvironmentUtils = () => {
  const environmentState = useContextStore((state) => state.environment);
  
  return {
    isMobile: environmentState.deviceType === 'mobile',
    isDesktop: environmentState.deviceType === 'desktop',
    isTablet: environmentState.deviceType === 'tablet',
    isDarkMode: environmentState.colorScheme === 'dark',
    isOnline: environmentState.networkStatus === 'online',
    isOffline: environmentState.networkStatus === 'offline',
  };
};