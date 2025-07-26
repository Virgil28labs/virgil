import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`Error in ${this.props.sectionName || 'section'}`, error, {
      component: 'SectionErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        sectionName: this.props.sectionName,
        errorInfo,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div style={{
          padding: '2rem',
          margin: '1rem',
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
        }}
        >
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>
            {this.props.sectionName ? `Error in ${this.props.sectionName}` : 'Something went wrong'}
          </h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c3baa',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}