import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { logger } from '../../lib/logger';
import { toastService } from '../../services/ToastService';

interface Props {
  children: ReactNode;
  appName: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

export class DashboardAppErrorBoundary extends Component<Props, State> {
  private resetTimeoutId?: NodeJS.Timeout;
  private static errorCounts = new Map<string, number>();

  constructor(props: Props) {
    super(props);
    // Initialize error count from static map
    const errorCount = DashboardAppErrorBoundary.errorCounts.get(props.appName) || 0;
    this.state = { 
      hasError: false,
      errorCount, 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { appName, onError } = this.props;
    
    // Update error count for this app
    const currentCount = DashboardAppErrorBoundary.errorCounts.get(appName) || 0;
    const newCount = currentCount + 1;
    DashboardAppErrorBoundary.errorCounts.set(appName, newCount);
    
    // Update state with new error count
    this.setState({ errorCount: newCount });

    // Log the error
    logger.error(`Dashboard app error in ${appName}`, error, {
      component: 'DashboardAppErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        appName,
        errorCount: newCount,
        errorInfo,
      },
    });

    // Show toast notification for user awareness
    if (newCount <= 3) {
      toastService.error(`Error in ${appName} app. Click to retry.`);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error);
    }

    // Auto-reset after 5 seconds if this is the first error
    if (newCount === 1) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, 5000);
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    // Reset error count for this app
    DashboardAppErrorBoundary.errorCounts.set(this.props.appName, 0);
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorCount: 0, 
    });
  };

  handleClose = () => {
    // Find and click the close button of the parent modal/gallery
    const closeButton = document.querySelector('[aria-label*="Close"]') as HTMLButtonElement;
    if (closeButton) {
      closeButton.click();
    }
  };

  override render() {
    const { hasError, error, errorCount } = this.state;
    const { children, appName } = this.props;

    if (hasError) {
      // If too many errors, suggest closing the app
      const tooManyErrors = errorCount >= 3;

      return (
        <div 
          className="dashboard-app-error"
          style={{
            padding: '2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            background: 'rgba(108, 59, 170, 0.05)',
            borderRadius: '8px',
            border: '1px dashed rgba(108, 59, 170, 0.3)',
          }}
        >
          <div 
            style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              filter: 'grayscale(1)',
              opacity: 0.5,
            }}
          >
            😵
          </div>
          
          <h3 style={{ 
            color: 'var(--brand-accent-pink)', 
            marginBottom: '0.5rem',
            fontSize: '1.2rem',
          }}
          >
            Oops! {appName} hit a snag
          </h3>
          
          <p style={{ 
            color: 'var(--brand-light-gray)', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            maxWidth: '300px',
          }}
          >
            {tooManyErrors 
              ? 'This app seems to be having persistent issues. Try closing and reopening it.'
              : error?.message || 'Something unexpected happened'}
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!tooManyErrors && (
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--brand-accent-purple)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={this.handleClose}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: 'var(--brand-light-purple)',
                border: '1px solid var(--brand-light-purple)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-accent-pink)';
                e.currentTarget.style.color = 'var(--brand-accent-pink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-light-purple)';
                e.currentTarget.style.color = 'var(--brand-light-purple)';
              }}
            >
              Close App
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details style={{ 
              marginTop: '1rem', 
              fontSize: '0.75rem',
              color: 'var(--brand-light-gray)',
              maxWidth: '400px',
            }}
            >
              <summary style={{ 
                cursor: 'pointer',
                opacity: 0.7,
              }}
              >
                Developer Info
              </summary>
              <pre style={{
                textAlign: 'left',
                background: 'rgba(0,0,0,0.2)',
                padding: '0.5rem',
                borderRadius: '4px',
                marginTop: '0.5rem',
                overflow: 'auto',
                maxHeight: '150px',
              }}
              >
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}