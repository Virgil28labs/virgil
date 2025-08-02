/**
 * ToastNotification Test Suite
 * 
 * Tests the toast notification component including:
 * - Rendering different toast types
 * - Auto-dismiss functionality  
 * - Manual dismiss functionality
 * - Persistent toasts
 * - Action button handling
 * - Animation and styling
 * - Toast container positioning
 * - Accessibility features
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Toast } from '../ToastNotification';
import { ToastNotification, ToastContainer } from '../ToastNotification';

describe('ToastNotification', () => {
  const mockOnDismiss = jest.fn();

  const baseToast: Toast = {
    id: 'test-toast',
    type: 'info',
    message: 'Test message',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render toast with message', () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render toast with title and message', () => {
      const toastWithTitle = {
        ...baseToast,
        title: 'Test Title',
      };
      
      render(<ToastNotification toast={toastWithTitle} onDismiss={mockOnDismiss} />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render different toast types with correct icons', () => {
      const toastTypes: Array<{ type: Toast['type'], icon: string }> = [
        { type: 'success', icon: '✓' },
        { type: 'error', icon: '✕' },
        { type: 'warning', icon: '⚠' },
        { type: 'info', icon: 'ℹ' },
      ];

      toastTypes.forEach(({ type, icon }) => {
        const { unmount } = render(
          <ToastNotification 
            toast={{ ...baseToast, type }} 
            onDismiss={mockOnDismiss} 
          />,
        );
        
        expect(screen.getByText(icon)).toBeInTheDocument();
        unmount();
      });
    });

    it('should render action button when provided', () => {
      const toastWithAction = {
        ...baseToast,
        action: {
          label: 'Retry',
          onClick: jest.fn(),
        },
      };
      
      render(<ToastNotification toast={toastWithAction} onDismiss={mockOnDismiss} />);
      
      expect(screen.getByLabelText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
      
      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply correct styles for success type', () => {
      const successToast = { ...baseToast, type: 'success' as const };
      render(<ToastNotification toast={successToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle('background-color: #10b981');
    });

    it('should apply correct styles for error type', () => {
      const errorToast = { ...baseToast, type: 'error' as const };
      render(<ToastNotification toast={errorToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle('background-color: #ef4444');
    });

    it('should apply correct styles for warning type', () => {
      const warningToast = { ...baseToast, type: 'warning' as const };
      render(<ToastNotification toast={warningToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle('background-color: #f59e0b');
    });

    it('should apply correct styles for info type', () => {
      const infoToast = { ...baseToast, type: 'info' as const };
      render(<ToastNotification toast={infoToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveStyle('background-color: var(--violet-purple)');
    });
  });

  describe('auto-dismiss functionality', () => {
    it('should auto-dismiss after default duration', async () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      // Fast-forward past the default 5000ms duration
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Wait for the dismiss animation (300ms)
      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
      });
    });

    it('should auto-dismiss after custom duration', async () => {
      const customToast = { ...baseToast, duration: 2000 };
      render(<ToastNotification toast={customToast} onDismiss={mockOnDismiss} />);
      
      // Fast-forward past the custom 2000ms duration
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
      });
    });

    it('should not auto-dismiss persistent toasts', () => {
      const persistentToast = { ...baseToast, persistent: true };
      render(<ToastNotification toast={persistentToast} onDismiss={mockOnDismiss} />);
      
      // Fast-forward past the default duration
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss when duration is 0', () => {
      const noDurationToast = { ...baseToast, duration: 0 };
      render(<ToastNotification toast={noDurationToast} onDismiss={mockOnDismiss} />);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('manual dismiss functionality', () => {
    it('should dismiss when close button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);
      
      // Fast-forward through the dismiss animation
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
    });

    it('should handle dismiss with animation delay', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);
      
      // Should not be dismissed immediately
      expect(mockOnDismiss).not.toHaveBeenCalled();
      
      // Should be dismissed after animation delay
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast');
    });
  });

  describe('action button functionality', () => {
    it('should call action onClick when action button is clicked', async () => {
      const mockActionClick = jest.fn();
      const toastWithAction = {
        ...baseToast,
        action: {
          label: 'Retry',
          onClick: mockActionClick,
        },
      };
      
      const user = userEvent.setup();
      render(<ToastNotification toast={toastWithAction} onDismiss={mockOnDismiss} />);
      
      const actionButton = screen.getByLabelText('Retry');
      await user.click(actionButton);
      
      expect(mockActionClick).toHaveBeenCalled();
    });

    it('should not render action button when action is not provided', () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('should render progress bar for non-persistent toasts with duration', () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      const progressBar = alert?.querySelector('[style*="toast-progress"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not render progress bar for persistent toasts', () => {
      const persistentToast = { ...baseToast, persistent: true };
      render(<ToastNotification toast={persistentToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      const progressBar = alert?.querySelector('[style*="toast-progress"]');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should not render progress bar when duration is 0', () => {
      const noDurationToast = { ...baseToast, duration: 0 };
      render(<ToastNotification toast={noDurationToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      const progressBar = alert?.querySelector('[style*="toast-progress"]');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('animations', () => {
    it('should trigger entrance animation on mount', () => {
      render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const alert = screen.getByRole('alert');
      
      // Initially should be positioned off-screen
      expect(alert).toHaveStyle('transform: translateX(100%)');
      expect(alert).toHaveStyle('opacity: 0');
      
      // After animation timer
      act(() => {
        jest.advanceTimersByTime(10);
      });
      
      expect(alert).toHaveStyle('transform: translateX(0)');
      expect(alert).toHaveStyle('opacity: 1');
    });
  });

  describe('cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      const firstRender = screen.getByRole('alert');

      rerender(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      const secondRender = screen.getByRole('alert');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when toast changes', () => {
      const { rerender } = render(<ToastNotification toast={baseToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('Test message')).toBeInTheDocument();

      const newToast = { ...baseToast, message: 'New message' };
      rerender(<ToastNotification toast={newToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('New message')).toBeInTheDocument();
    });
  });
});

describe('ToastContainer', () => {
  const mockOnDismiss = jest.fn();

  const sampleToasts: Toast[] = [
    {
      id: 'toast-1',
      type: 'success',
      message: 'Success message',
    },
    {
      id: 'toast-2',
      type: 'error',
      message: 'Error message',
    },
    {
      id: 'toast-3',
      type: 'info',
      message: 'Info message',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render multiple toasts', () => {
      render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should not render when no toasts', () => {
      const { container } = render(<ToastContainer toasts={[]} onDismiss={mockOnDismiss} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should have proper accessibility attributes', () => {
      render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const container = screen.getByLabelText('Notifications');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('positioning', () => {
    it('should apply top-right positioning by default', () => {
      const { container } = render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const positionedContainer = container.firstChild as HTMLElement;
      expect(positionedContainer).toHaveStyle({
        position: 'fixed',
        top: '20px',
        right: '20px',
      });
    });

    it('should apply custom positioning', () => {
      const positions: Array<{ position: Parameters<typeof ToastContainer>[0]['position'], styles: Record<string, string> }> = [
        { position: 'top-left', styles: { top: '20px', left: '20px' } },
        { position: 'bottom-right', styles: { bottom: '20px', right: '20px' } },
        { position: 'bottom-left', styles: { bottom: '20px', left: '20px' } },
        { position: 'top-center', styles: { top: '20px', left: '50%', transform: 'translateX(-50%)' } },
        { position: 'bottom-center', styles: { bottom: '20px', left: '50%', transform: 'translateX(-50%)' } },
      ];

      positions.forEach(({ position, styles }) => {
        const { container, unmount } = render(
          <ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} position={position} />,
        );
        
        const positionedContainer = container.firstChild as HTMLElement;
        Object.entries(styles).forEach(([property, value]) => {
          expect(positionedContainer).toHaveStyle({ [property]: value });
        });
        
        unmount();
      });
    });

    it('should have correct z-index for overlay', () => {
      const { container } = render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const positionedContainer = container.firstChild as HTMLElement;
      expect(positionedContainer).toHaveStyle('z-index: 9999');
    });

    it('should have pointer events disabled on container but enabled on content', () => {
      const { container } = render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const positionedContainer = container.firstChild as HTMLElement;
      const contentContainer = positionedContainer.firstChild as HTMLElement;
      
      expect(positionedContainer).toHaveStyle('pointer-events: none');
      expect(contentContainer).toHaveStyle('pointer-events: auto');
    });
  });

  describe('toast management', () => {
    it('should pass onDismiss to each toast', async () => {
      const user = userEvent.setup();
      render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const dismissButtons = screen.getAllByLabelText('Dismiss notification');
      await user.click(dismissButtons[0]);
      
      expect(mockOnDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('should render toasts in order', () => {
      render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
      
      // Check that toasts are rendered in the same order as the array
      expect(alerts[0]).toHaveTextContent('Success message');
      expect(alerts[1]).toHaveTextContent('Error message');
      expect(alerts[2]).toHaveTextContent('Info message');
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      const firstRender = screen.getByLabelText('Notifications');

      rerender(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      const secondRender = screen.getByLabelText('Notifications');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when toasts change', () => {
      const { rerender } = render(<ToastContainer toasts={sampleToasts} onDismiss={mockOnDismiss} />);
      expect(screen.getAllByRole('alert')).toHaveLength(3);

      const newToasts = [sampleToasts[0]];
      rerender(<ToastContainer toasts={newToasts} onDismiss={mockOnDismiss} />);
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
  });
});

describe('CSS Animation Injection', () => {
  it('should inject CSS animation styles when document is available', () => {
    // Mock document.querySelector to simulate no existing styles
    const originalQuerySelector = document.querySelector;
    document.querySelector = jest.fn().mockReturnValue(null);
    
    const originalCreateElement = document.createElement;
    const mockStyleElement = {
      setAttribute: jest.fn(),
      textContent: '',
    };
    document.createElement = jest.fn().mockReturnValue(mockStyleElement);
    
    const mockAppendChild = jest.fn();
    Object.defineProperty(document.head, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    
    // Re-import the module to trigger the CSS injection
    jest.resetModules();
    require('../ToastNotification');
    
    expect(document.createElement).toHaveBeenCalledWith('style');
    expect(mockStyleElement.setAttribute).toHaveBeenCalledWith('data-toast-styles', 'true');
    expect(mockStyleElement.textContent).toContain('@keyframes toast-progress');
    expect(mockAppendChild).toHaveBeenCalledWith(mockStyleElement);
    
    // Restore original methods
    document.querySelector = originalQuerySelector;
    document.createElement = originalCreateElement;
  });

  it('should not inject CSS styles if they already exist', () => {
    // Mock document.querySelector to simulate existing styles
    const mockExistingElement = document.createElement('style');
    const originalQuerySelector = document.querySelector;
    document.querySelector = jest.fn().mockReturnValue(mockExistingElement);
    
    const mockAppendChild = jest.fn();
    Object.defineProperty(document.head, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    
    // Re-import the module
    jest.resetModules();
    require('../ToastNotification');
    
    expect(mockAppendChild).not.toHaveBeenCalled();
    
    // Restore original method
    document.querySelector = originalQuerySelector;
  });
});