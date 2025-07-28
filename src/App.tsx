import React, { Suspense, useEffect } from 'react';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';

import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { LazyVirgilChatbot } from './components/LazyComponents';
import { LoadingFallback } from './components/LoadingFallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Skeleton } from './components/ui/skeleton';
import { ToastContainer } from './components/ToastNotification';
import { StorageMigration } from './services/StorageMigration';
import { logger } from './lib/logger';
// Import errorHandlerService to initialize global error handlers
import './services/ErrorHandlerService';
import './App.css';

// Configure styled-components to filter out problematic props
const shouldForwardProp = (propName: string) => {
  // Filter out known problematic props from react-camera-pro
  const excludedProps = ['aspectRatio', 'mirrored', 'facingMode'];
  if (excludedProps.includes(propName)) {
    return false;
  }

  // Use emotion's isPropValid for standard HTML attribute validation
  return isPropValid(propName);
};

function AppContent(): React.ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
          <Skeleton className="h-16 rounded-lg" />
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <Skeleton className="h-5 w-3/5" />
          </div>
          <Skeleton className="h-10" />
          <div style={{ marginTop: '2rem' }}>
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Dashboard />
      {user && (
        <ErrorBoundary fallback={(
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            color: 'var(--brand-light-gray)',
            fontSize: '0.875rem',
          }}
          >
            Chatbot unavailable
          </div>
        )}
        >
          <Suspense fallback={<LoadingFallback message="Loading chatbot..." size="small" variant="skeleton" />}>
            <LazyVirgilChatbot />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

function App(): React.ReactElement {
  const { toasts, removeToast } = useToast();

  // Run storage migrations on app startup
  useEffect(() => {
    StorageMigration.runMigrations().catch(error => {
      logger.error(
        'Storage migration failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'App',
          action: 'runMigrations',
        },
      );
    });
  }, []);

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <ErrorBoundary>
        <AuthProvider>
          <LocationProvider>
            <WeatherProvider>
              <div className="app">
                <a href="#main-content" className="skip-link">Skip to main content</a>
                <ErrorBoundary fallback={(
                  <div style={{ padding: '1rem', color: 'var(--brand-light-gray)' }}>
                    Dashboard temporarily unavailable. Please try refreshing.
                  </div>
                )}
                >
                  <AppContent />
                </ErrorBoundary>
                <ToastContainer
                  toasts={toasts}
                  onDismiss={removeToast}
                  position="top-right"
                />
              </div>
            </WeatherProvider>
          </LocationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StyleSheetManager>
  );
}

export default App;
