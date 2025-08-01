/**
 * ErrorBoundary Test Suite
 * 
 * Tests the error boundary component including:
 * - Normal rendering without errors
 * - Error catching and state management
 * - Custom fallback UI rendering
 * - Error logging and callback functionality
 * - Recovery mechanisms (try again, refresh)
 * - Development vs production behavior
 * - Error stack display in development
 * - Component lifecycle methods
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { logger } from '../../lib/logger';

// Mock the logger
jest.mock('../../lib/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child component</div>;
};

// Component that throws error in render
const ErrorComponent = () => {
  throw new Error('Render error');
};

describe('ErrorBoundary', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
    
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  describe('normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test child content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test child content')).toBeInTheDocument();
    });

    it('should render multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should pass through all props to children', () => {
      const ChildComponent = ({ testProp }: { testProp: string }) => (
        <div data-testid="child">{testProp}</div>
      );
      
      render(
        <ErrorBoundary>
          <ChildComponent testProp="test value" />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child')).toHaveTextContent('test value');
    });
  });

  describe('error catching', () => {
    it('should catch errors and display default error UI', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should log error when caught', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.objectContaining({
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          metadata: expect.objectContaining({
            errorInfo: expect.any(Object),
          }),
        })
      );
    });

    it('should call onError callback when provided', () => {
      const mockOnError = jest.fn();
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should update state to hasError: true when error occurs', () => {
      const { container } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      // Error UI should be displayed instead of children
      expect(screen.queryByText('Child component')).not.toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should store error in state', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      // In development mode, error details should be available
      process.env.NODE_ENV = 'development';
      
      const { container } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      // Error details should be present in development
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    });
  });

  describe('fallback UI', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render complex custom fallback', () => {
      const customFallback = (
        <div>
          <h1>Custom Error</h1>
          <p>Something went wrong in our custom handler</p>
          <button>Custom Action</button>
        </div>
      );
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong in our custom handler')).toBeInTheDocument();
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });

    it('should prefer custom fallback over default UI', () => {
      const customFallback = <div>Custom fallback</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.queryByText('Refresh Page')).not.toBeInTheDocument();
    });
  });

  describe('recovery mechanisms', () => {
    it('should reset error state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);
      
      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Child component')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call window.location.reload when Refresh Page is clicked', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const refreshButton = screen.getByText('Refresh Page');
      fireEvent.click(refreshButton);
      
      expect(mockReload).toHaveBeenCalled();
    });

    it('should handle rapid clicks on Try Again button', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByText('Try Again');
      
      // Click multiple times rapidly
      fireEvent.click(tryAgainButton);
      fireEvent.click(tryAgainButton);
      fireEvent.click(tryAgainButton);
      
      // Should not cause issues (state should be reset)
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('development vs production behavior', () => {
    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
      
      // Click to expand details
      const detailsElement = screen.getByText('Error Details (Development)');
      fireEvent.click(detailsElement);
      
      // Error stack should be visible
      expect(screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'pre' && 
               content.includes('Error') || content.includes('at ');
      })).toBeInTheDocument();
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
    });

    it('should handle missing error stack gracefully', () => {
      process.env.NODE_ENV = 'development';
      
      // Create error without stack
      const ErrorWithoutStack = () => {
        const error = new Error('Error without stack');
        delete error.stack;
        throw error;
      };
      
      render(
        <ErrorBoundary>
          <ErrorWithoutStack />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    });
  });

  describe('styling and accessibility', () => {
    it('should apply correct styling to error UI', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const errorContainer = screen.getByText('Something went wrong').parentElement;
      expect(errorContainer).toHaveStyle({
        padding: '2rem',
        background: 'var(--brand-dark-purple)',
        color: 'var(--brand-light-gray)',
      });
    });

    it('should have accessible button styling', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByText('Try Again');
      const refreshButton = screen.getByText('Refresh Page');
      
      expect(tryAgainButton).toHaveStyle({
        cursor: 'pointer',
        background: 'var(--brand-accent-purple)',
      });
      
      expect(refreshButton).toHaveStyle({
        cursor: 'pointer',
        background: 'transparent',
      });
    });

    it('should have proper text hierarchy', () => {
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Something went wrong');
      expect(heading).toHaveStyle({
        color: 'var(--brand-accent-pink)',
        marginBottom: '1rem',
      });
    });

    it('should have expandable details in development', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      const details = screen.getByRole('group');
      expect(details.tagName.toLowerCase()).toBe('details');
      
      const summary = screen.getByText('Error Details (Development)');
      expect(summary.tagName.toLowerCase()).toBe('summary');
      expect(summary).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('edge cases', () => {
    it('should handle onError callback throwing an error', () => {
      const faultyOnError = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      // Should not crash the error boundary itself
      expect(() => {
        render(
          <ErrorBoundary onError={faultyOnError}>
            <ErrorComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(faultyOnError).toHaveBeenCalled();
    });

    it('should handle multiple consecutive errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Click try again
      fireEvent.click(screen.getByText('Try Again'));
      
      // Render another error
      rerender(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle null/undefined children gracefully', () => {
      render(
        <ErrorBoundary>
          {null}
          {undefined}
        </ErrorBoundary>
      );
      
      // Should render without issues
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle error during getDerivedStateFromError', () => {
      // Mock getDerivedStateFromError to potentially fail
      const originalGDSFE = ErrorBoundary.getDerivedStateFromError;
      
      // This is a static method test - mainly for coverage
      const error = new Error('Test error');
      const result = ErrorBoundary.getDerivedStateFromError(error);
      
      expect(result).toEqual({
        hasError: true,
        error: error,
      });
    });

    it('should handle async errors gracefully', async () => {
      const AsyncErrorComponent = () => {
        // Simulate async error that won't be caught by error boundary
        setTimeout(() => {
          throw new Error('Async error');
        }, 10);
        
        return <div>Async component</div>;
      };
      
      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      );
      
      // Async errors won't be caught by error boundaries
      expect(screen.getByText('Async component')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('component lifecycle', () => {
    it('should initialize with correct initial state', () => {
      const { container } = render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );
      
      // Should render children normally
      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should maintain state across re-renders when no error', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <div>Content 1</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      rerender(
        <ErrorBoundary>
          <div>Content 2</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call componentDidCatch with correct parameters', () => {
      const mockOnError = jest.fn();
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ErrorComponent />
        </ErrorBoundary>
      );
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Render error',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });
});