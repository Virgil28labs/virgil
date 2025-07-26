/**
 * Error boundary component for graceful error handling
 * Catches errors in child components and displays user-friendly messages
 */

import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import { NotesError, ErrorType } from './types';
import { logger } from '../../lib/logger';
import './notes.css';

interface Props {
  children: ReactNode
  /** Fallback UI to show when an error occurs */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary for the Notes application
 * Provides graceful error handling and recovery options
 */
export class NotesErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('Notes Error Boundary caught error', error, {
      component: 'NotesErrorBoundary',
      action: 'componentDidCatch',
      errorInfo: errorInfo.componentStack,
    });
    
    // Update state with error info
    this.setState({
      errorInfo,
    });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset error state
   */
  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: Error): string {
    if (error instanceof NotesError) {
      switch (error.type) {
        case ErrorType.STORAGE_ERROR:
          return 'Unable to access your notes storage. Please refresh the page.';
        case ErrorType.AI_SERVICE_ERROR:
          return 'AI processing failed. Your note has been saved without AI features.';
        case ErrorType.NETWORK_ERROR:
          return 'Network connection issue. Please check your internet connection.';
        case ErrorType.VALIDATION_ERROR:
          return 'Invalid data detected. Please try again.';
        default:
          return 'An unexpected error occurred. Please refresh the page.';
      }
    }
    
    return 'Something went wrong. Please refresh the page or try again later.';
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      return (
        <div className="notes-error-boundary">
          <div className="notes-error-content">
            <h2 className="notes-error-title">Oops! Something went wrong</h2>
            <p className="notes-error-message">
              {this.getErrorMessage(this.state.error)}
            </p>
            
            {/* Show technical details in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="notes-error-details">
                <summary>Technical Details</summary>
                <pre>{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            
            <div className="notes-error-actions">
              <button
                onClick={this.reset}
                className="notes-error-button primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="notes-error-button secondary"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
}