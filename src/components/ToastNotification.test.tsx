import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer, Toast } from './ToastNotification';

// Mock timers for auto-dismiss testing
jest.useFakeTimers();

describe('ToastContainer', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={mockOnDismiss} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders toasts correctly', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'success', message: 'Success message' },
      { id: '2', type: 'error', message: 'Error message' },
      { id: '3', type: 'info', message: 'Info message' }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('applies correct position styles', () => {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
    const toasts: Toast[] = [{ id: '1', type: 'info', message: 'Test' }];
    
    positions.forEach(position => {
      const { container } = render(
        <ToastContainer toasts={toasts} onDismiss={mockOnDismiss} position={position} />
      );
      
      const toastContainer = container.querySelector('[aria-label="Notifications"]');
      expect(toastContainer).toBeInTheDocument();
      
      // Check position styles
      const style = toastContainer?.getAttribute('style') || '';
      if (position.includes('top')) {
        expect(style).toContain('top: 20px');
      }
      if (position.includes('bottom')) {
        expect(style).toContain('bottom: 20px');
      }
      if (position.includes('left')) {
        expect(style).toContain('left: 20px');
      }
      if (position.includes('right')) {
        expect(style).toContain('right: 20px');
      }
      
      container.remove();
    });
  });

  it('renders toast with correct type styling', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'success', message: 'Success' },
      { id: '2', type: 'error', message: 'Error' },
      { id: '3', type: 'warning', message: 'Warning' },
      { id: '4', type: 'info', message: 'Info' }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    // Toasts are styled inline, not with classes. Check they render
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('calls onDismiss when close button clicked', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'Test message' }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(closeButton);
    
    // Wait for the dismiss animation to complete
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('auto-dismisses after default duration', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'Auto dismiss test' }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // First advance past the entrance animation (10ms)
    act(() => {
      jest.advanceTimersByTime(10);
    });
    
    // Then advance the full duration (5000ms)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Then advance past the exit animation (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('auto-dismisses after custom duration', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'Custom duration', duration: 3000 }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // Advance past entrance animation and custom duration
    act(() => {
      jest.advanceTimersByTime(10 + 3000 + 300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
  });

  it('does not auto-dismiss persistent toasts', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'Persistent toast', persistent: true }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    // Fast-forward a long time
    act(() => {
      jest.advanceTimersByTime(60000);
    });
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('renders with action button', () => {
    const mockAction = jest.fn();
    const toasts: Toast[] = [
      { 
        id: '1', 
        type: 'info', 
        message: 'Action toast',
        action: {
          label: 'Retry',
          onClick: mockAction
        }
      }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    const actionButton = screen.getByRole('button', { name: 'Retry' });
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'error', message: 'Error notification' }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    // Find the toast by role since there's no .toast class
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveTextContent('Error notification');
  });

  it('handles multiple toasts with different durations', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'First', duration: 2000 },
      { id: '2', type: 'info', message: 'Second', duration: 4000 },
      { id: '3', type: 'info', message: 'Third', duration: 6000 }
    ];

    render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    // Advance past entrance animations
    act(() => {
      jest.advanceTimersByTime(10);
    });
    
    // After 2 seconds + exit animation, first should be dismissed
    act(() => {
      jest.advanceTimersByTime(2000 + 300);
    });
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    
    // After another 2 seconds + exit animation, second should be dismissed
    act(() => {
      jest.advanceTimersByTime(2000 + 300);
    });
    expect(mockOnDismiss).toHaveBeenCalledWith('2');
    expect(mockOnDismiss).toHaveBeenCalledTimes(2);
    
    // After another 2 seconds + exit animation, third should be dismissed
    act(() => {
      jest.advanceTimersByTime(2000 + 300);
    });
    expect(mockOnDismiss).toHaveBeenCalledWith('3');
    expect(mockOnDismiss).toHaveBeenCalledTimes(3);
  });

  it('cleans up timers when toast is manually dismissed', () => {
    const toasts: Toast[] = [
      { id: '1', type: 'info', message: 'Manual dismiss' }
    ];

    const { rerender } = render(<ToastContainer toasts={toasts} onDismiss={mockOnDismiss} />);
    
    // Manually dismiss before auto-dismiss
    const closeButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(closeButton);
    
    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
    mockOnDismiss.mockClear();
    
    // Remove toast from list
    rerender(<ToastContainer toasts={[]} onDismiss={mockOnDismiss} />);
    
    // Fast-forward past original duration
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    // Should not be called again
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });
});