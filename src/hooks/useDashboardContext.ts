import { useEffect, useCallback } from 'react';
import { dashboardContextService } from '../services/DashboardContextService';

interface UseDashboardContextProps {
  dispatch: (action: any) => void;
}

interface UseDashboardContextReturn {
  initializeDashboardContext: () => void;
}

export function useDashboardContext({
  dispatch,
}: UseDashboardContextProps): UseDashboardContextReturn {
  // Initialize dashboard context service
  const initializeDashboardContext = useCallback(() => {
    const unsubscribe = dashboardContextService.subscribe((context) => {
      const suggestions = dashboardContextService.generateSuggestions();
      dispatch({
        type: 'SET_DASHBOARD_CONTEXT',
        payload: { context, suggestions },
      });
    });

    // Get initial context
    const initialContext = dashboardContextService.getContext();
    const initialSuggestions = dashboardContextService.generateSuggestions();
    dispatch({
      type: 'SET_DASHBOARD_CONTEXT',
      payload: { context: initialContext, suggestions: initialSuggestions },
    });

    return unsubscribe;
  }, [dispatch]);

  // Initialize on mount
  useEffect(() => {
    const unsubscribe = initializeDashboardContext();
    return unsubscribe;
  }, [initializeDashboardContext]);

  return {
    initializeDashboardContext,
  };
}