import React, { Suspense } from 'react'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LocationProvider } from './contexts/LocationContext'
import { WeatherProvider } from './contexts/WeatherContext'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { LazyVirgilChatbot } from './components/LazyComponents'
import { LoadingFallback } from './components/LoadingFallback'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SkeletonLoader } from './components/SkeletonLoader'
import { ToastContainer } from './components/ToastNotification'
import { useToast } from './hooks/useToast'

function AppContent(): React.ReactElement {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
          <SkeletonLoader height="60px" borderRadius="8px" />
          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <SkeletonLoader height="20px" width="60%" />
          </div>
          <SkeletonLoader height="40px" />
          <div style={{ marginTop: '2rem' }}>
            <SkeletonLoader height="200px" borderRadius="12px" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <>
      <Dashboard />
      {user && (
        <ErrorBoundary fallback={
          <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px',
            color: 'var(--brand-light-gray)',
            fontSize: '0.875rem'
          }}>
            Chatbot unavailable
          </div>
        }>
          <Suspense fallback={<LoadingFallback message="Loading chatbot..." size="small" variant="skeleton" />}>
            <LazyVirgilChatbot />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}

function App(): React.ReactElement {
  const { toasts, removeToast } = useToast();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <WeatherProvider>
            <div className="app">
              <a href="#main-content" className="skip-link">Skip to main content</a>
              <ErrorBoundary fallback={
                <div style={{ padding: '1rem', color: 'var(--brand-light-gray)' }}>
                  Dashboard temporarily unavailable. Please try refreshing.
                </div>
              }>
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
  )
}

export default App
