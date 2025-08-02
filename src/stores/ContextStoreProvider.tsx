/**
 * Context Store Provider - React Integration
 * 
 * Provides React integration for the Zustand context store,
 * including initialization, cleanup, and environment monitoring.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useContextStore, cleanupContextStore } from './ContextStore';
import { useEnvironmentActions, useActivityActions } from './hooks/useContextStore';
import { timeService } from '../services/TimeService';
import { useAutoSync } from './utils/environmentSync';

interface ContextStoreProviderProps {
  children: ReactNode;
  options?: {
    enableEnvironmentMonitoring?: boolean;
    enableActivityTracking?: boolean;
    enableNetworkMonitoring?: boolean;
    enableVisibilityTracking?: boolean;
  };
}

const defaultOptions = {
  enableEnvironmentMonitoring: true,
  enableActivityTracking: true,
  enableNetworkMonitoring: true,
  enableVisibilityTracking: true,
};

/**
 * Context Store Provider Component
 * 
 * Sets up environment monitoring and activity tracking for the store.
 * Should be placed high in the React component tree.
 */
export const ContextStoreProvider = ({ 
  children, 
  options = defaultOptions, 
}: ContextStoreProviderProps) => {
  const environmentActions = useEnvironmentActions();
  const activityActions = useActivityActions();
  const initialized = useRef(false);

  // Enable automatic synchronization of environment context and user profile
  useAutoSync();

  // Initialize store environment
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize environment state
    if (options.enableEnvironmentMonitoring) {
      const detectDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
        const width = window.innerWidth;
        if (width <= 768) return 'mobile';
        if (width <= 1024) return 'tablet';
        return 'desktop';
      };

      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

      environmentActions.updateEnvironment({
        isOnline: navigator.onLine,
        deviceType: detectDeviceType(),
        prefersDarkMode,
        language: navigator.language || 'en-US',
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        capabilities: {
          geolocation: 'geolocation' in navigator,
          camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
          notifications: 'Notification' in window,
        },
      });
    }

    // Log initial activity
    if (options.enableActivityTracking) {
      activityActions.logActivity('app_initialized');
    }

    // Cleanup function
    return () => {
      cleanupContextStore();
    };
  }, [environmentActions, activityActions, options]);

  // Network status monitoring
  useEffect(() => {
    if (!options.enableNetworkMonitoring) return;

    const handleOnline = () => {
      environmentActions.setOnlineStatus(true);
      if (options.enableActivityTracking) {
        activityActions.logActivity('network_online');
      }
    };

    const handleOffline = () => {
      environmentActions.setOnlineStatus(false);
      if (options.enableActivityTracking) {
        activityActions.logActivity('network_offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [environmentActions, activityActions, options]);

  // Viewport size monitoring
  useEffect(() => {
    if (!options.enableEnvironmentMonitoring) return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Update viewport
      environmentActions.updateViewport(width, height);

      // Update device type based on new width
      const deviceType: 'mobile' | 'tablet' | 'desktop' = 
        width <= 768 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
      
      environmentActions.setDeviceType(deviceType);

      if (options.enableActivityTracking) {
        activityActions.logActivity('viewport_resized');
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [environmentActions, activityActions, options]);

  // Dark mode preference monitoring
  useEffect(() => {
    if (!options.enableEnvironmentMonitoring) return;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      environmentActions.setDarkMode(e.matches);
      if (options.enableActivityTracking) {
        activityActions.logActivity('theme_changed', 'system');
      }
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, [environmentActions, activityActions, options]);

  // Page visibility monitoring
  useEffect(() => {
    if (!options.enableVisibilityTracking) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (options.enableActivityTracking) {
        activityActions.logActivity(isVisible ? 'page_visible' : 'page_hidden');
        if (isVisible) {
          activityActions.setLastInteraction(useContextStore.getState().time.timestamp);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activityActions, options]);

  // User interaction tracking
  useEffect(() => {
    if (!options.enableActivityTracking) return;

    const handleUserInteraction = () => {
      activityActions.setLastInteraction(timeService.getTimestamp());
    };

    // Track various user interactions
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [activityActions, options]);

  // Periodic activity cleanup
  useEffect(() => {
    if (!options.enableActivityTracking) return;

    const cleanupInterval = setInterval(() => {
      activityActions.clearOldActivities();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [activityActions, options]);

  return <>{children}</>;
};

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
    isTablet: environmentState.deviceType === 'tablet',
    isDesktop: environmentState.deviceType === 'desktop',
    isOnline: environmentState.isOnline,
    isDarkMode: environmentState.prefersDarkMode,
    hasGeolocation: environmentState.capabilities.geolocation,
    hasCamera: environmentState.capabilities.camera,
    hasNotifications: environmentState.capabilities.notifications,
    viewportWidth: environmentState.viewport.width,
    viewportHeight: environmentState.viewport.height,
  };
};

/**
 * Component for debugging store state in development
 */
export const ContextStoreDebugger = () => {
  const state = useContextStore((state) => state);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 10000,
    }}
    >
      <h4>Context Store Debug</h4>
      <details>
        <summary>Time State</summary>
        <pre>{JSON.stringify(state.time, null, 2)}</pre>
      </details>
      <details>
        <summary>Location State</summary>
        <pre>{JSON.stringify(state.location, null, 2)}</pre>
      </details>
      <details>
        <summary>Weather State</summary>
        <pre>{JSON.stringify(state.weather, null, 2)}</pre>
      </details>
      <details>
        <summary>Environment State</summary>
        <pre>{JSON.stringify(state.environment, null, 2)}</pre>
      </details>
    </div>
  );
};

export default ContextStoreProvider;