import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error, 
    };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Reset error boundary when resetKeys change
    if (props.resetKeys && state.hasError) {
      const hasKeysChanged = props.resetKeys.some((key, index) => 
        key !== state.error?.message?.[index],
      );
      
      if (hasKeysChanged) {
        return {
          hasError: false,
          error: undefined,
          retryCount: 0,
        };
      }
    }
    
    return null;
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    const { retryCount } = this.state;

    // Check if this is an async error
    const isAsyncError = error.message.includes('async') || 
                        error.message.includes('Promise') ||
                        error.message.includes('fetch') ||
                        error.message.includes('network');

    logger.error('AsyncErrorBoundary caught error', error, {
      component: 'AsyncErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        isAsyncError,
        retryCount,
        errorInfo,
      },
    });

    // Call custom error handler
    if (onError) {
      onError(error);
    }

    // Update retry count
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Auto-retry for certain async errors (max 3 times)
    if (isAsyncError && retryCount < 3) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * (retryCount + 1)); // Exponential backoff
    }
  }

  override componentDidUpdate(prevProps: Props) {
    // Reset on props change if enabled
    if (this.props.resetOnPropsChange && this.state.hasError) {
      const propsChanged = Object.keys(this.props).some(key => {
        if (key === 'children' || key === 'fallback') return false;
        return this.props[key as keyof Props] !== prevProps[key as keyof Props];
      });

      if (propsChanged) {
        this.handleReset();
      }
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
    });
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      retryCount: 0, 
    });
  };

  override render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default async error UI
      return (
        <div 
          className="async-error-boundary"
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            background: 'rgba(255, 107, 157, 0.05)',
            border: '1px solid rgba(255, 107, 157, 0.2)',
            borderRadius: '8px',
            margin: '1rem 0',
          }}
        >
          <div style={{ 
            fontSize: '2rem', 
            marginBottom: '0.5rem',
            opacity: 0.7,
          }}
          >
            {retryCount >= 3 ? '❌' : '⚠️'}
          </div>
          
          <h4 style={{ 
            color: 'var(--brand-accent-pink)', 
            marginBottom: '0.5rem', 
          }}
          >
            {retryCount >= 3 ? 'Connection Failed' : 'Loading Error'}
          </h4>
          
          <p style={{ 
            color: 'var(--brand-light-gray)', 
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
          >
            {error?.message.includes('network') 
              ? 'Network connection issue. Please check your internet.'
              : error?.message || 'Failed to load content'}
          </p>

          {retryCount < 3 && (
            <p style={{ 
              fontSize: '0.8rem', 
              opacity: 0.7,
              marginBottom: '1rem',
            }}
            >
              Retrying... (Attempt {retryCount + 1}/3)
            </p>
          )}

          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--brand-accent-purple)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {retryCount >= 3 ? 'Try Again' : 'Retry Now'}
          </button>

          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              marginTop: '1rem', 
              fontSize: '0.75rem',
              textAlign: 'left',
              maxWidth: '500px',
              margin: '1rem auto 0',
            }}
            >
              <summary style={{ cursor: 'pointer', textAlign: 'center' }}>
                Error Details
              </summary>
              <pre style={{
                background: 'rgba(0,0,0,0.1)',
                padding: '0.5rem',
                borderRadius: '4px',
                overflow: 'auto',
                marginTop: '0.5rem',
              }}
              >
                {error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}