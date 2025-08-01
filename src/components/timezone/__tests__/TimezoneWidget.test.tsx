/**
 * TimezoneWidget Test Suite
 * 
 * Tests the timezone widget component including:
 * - Click and hover interactions
 * - Modal integration
 * - Hover panel display
 * - Keyboard navigation
 * - Accessibility features
 * - Timeout management
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimezoneWidget } from '../TimezoneWidget';
import { useTimezones } from '../useTimezones';

// Mock dependencies
jest.mock('../TimezoneModal');
jest.mock('../TimezoneHoverPanel');
jest.mock('../useTimezones');

const mockUseTimezones = useTimezones as jest.MockedFunction<typeof useTimezones>;

// Mock components
jest.mock('../TimezoneModal', () => ({
  TimezoneModal: ({ isOpen, onClose, className }: any) => (
    isOpen ? (
      <div data-testid="timezone-modal" className={className}>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

jest.mock('../TimezoneHoverPanel', () => ({
  PositionedTimezoneHoverPanel: ({ isVisible, triggerRef, className }: any) => (
    isVisible ? (
      <div data-testid="timezone-hover-panel" className={className}>
        <span data-testid="trigger-ref-exists">{!!triggerRef?.current}</span>
      </div>
    ) : null
  ),
}));

describe('TimezoneWidget', () => {
  const defaultProps = {
    children: <div>Test Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock - no selected timezones
    mockUseTimezones.mockReturnValue({
      selectedTimezones: [],
      timezonesWithTime: [],
      addTimezone: jest.fn(),
      removeTimezone: jest.fn(),
      updateTimezoneLabel: jest.fn(),
      reorderTimezones: jest.fn(),
      clearAllTimezones: jest.fn(),
      canAddMoreTimezones: true,
      isUpdating: false,
    });
  });

  describe('rendering', () => {
    it('should render children content', () => {
      render(<TimezoneWidget {...defaultProps} />);

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <TimezoneWidget {...defaultProps} className="custom-widget" />,
      );

      expect(container.querySelector('.timezone-widget-trigger')).toHaveClass('custom-widget');
    });

    it('should apply disabled class when disabled', () => {
      const { container } = render(
        <TimezoneWidget {...defaultProps} disabled />,
      );

      expect(container.querySelector('.timezone-widget-trigger')).toHaveClass('disabled');
    });

    it('should have proper aria attributes', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-label', 'Click to add timezones');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('tabIndex', '0');
    });

    it('should update aria-label based on selected timezones', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
          { id: '2', timezone: 'Europe/London', label: 'London', order: 1, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-label', 'View 2 selected timezones');
    });

    it('should have correct cursor style when disabled', () => {
      render(<TimezoneWidget {...defaultProps} disabled />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveStyle({ cursor: 'default' });
      expect(trigger).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('modal interactions', () => {
    it('should open modal on click', async () => {
      const user = userEvent.setup();
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();
    });

    it('should not open modal when disabled', async () => {
      const user = userEvent.setup();
      render(<TimezoneWidget {...defaultProps} disabled />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should not open modal when clickToOpen is false', async () => {
      render(<TimezoneWidget {...defaultProps} clickToOpen={false} />);

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should close modal when close button clicked', async () => {
      render(<TimezoneWidget {...defaultProps} />);

      // Open modal
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should update aria-expanded when modal opens/closes', async () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('hover panel interactions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Mock multiple selected timezones to enable hover panel
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
          { id: '2', timezone: 'Europe/London', label: 'London', order: 1, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show hover panel on mouse enter after delay', async () => {
      render(<TimezoneWidget {...defaultProps} hoverDelay={100} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      fireEvent.mouseEnter(container);

      // Should not show immediately
      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();

      // Should show after delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();
    });

    it('should hide hover panel on mouse leave after delay', async () => {
      render(<TimezoneWidget {...defaultProps} hoverDelay={100} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      
      // Show panel
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();

      // Hide panel
      fireEvent.mouseLeave(container);
      
      // Should still be visible immediately
      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();

      // Should hide after delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });

    it('should not show hover panel when disabled', () => {
      render(<TimezoneWidget {...defaultProps} disabled />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      fireEvent.mouseEnter(container);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });

    it('should not show hover panel with only one timezone', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneWidget {...defaultProps} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      fireEvent.mouseEnter(container);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });

    it('should show hover panel on focus for accessibility', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      fireEvent.focus(trigger);

      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();
    });

    it('should hide hover panel on blur after delay', async () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      fireEvent.focus(trigger);
      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();

      fireEvent.blur(trigger);

      // Should hide after delay
      await waitFor(() => {
        expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
      }, { timeout: 150 });
    });

    it('should hide hover panel when modal opens', async () => {
      render(<TimezoneWidget {...defaultProps} hoverDelay={50} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      
      // Show hover panel
      fireEvent.mouseEnter(container);
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();

      // Open modal
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();
    });
  });

  describe('keyboard interactions', () => {
    it('should open modal on Enter key', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'Enter' });

      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();
    });

    it('should open modal on Space key', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: ' ' });

      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();
    });

    it('should close modal on Escape key', async () => {
      render(<TimezoneWidget {...defaultProps} />);

      // Open modal
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();

      // Close with Escape
      fireEvent.keyDown(trigger, { key: 'Escape' });

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should not respond to keyboard when disabled', () => {
      render(<TimezoneWidget {...defaultProps} disabled />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'Enter' });
      fireEvent.keyDown(trigger, { key: ' ' });

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should not open modal on keyboard when clickToOpen is false', () => {
      render(<TimezoneWidget {...defaultProps} clickToOpen={false} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'Enter' });

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });

    it('should ignore other keys', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      fireEvent.keyDown(trigger, { key: 'a' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });

      expect(screen.queryByTestId('timezone-modal')).not.toBeInTheDocument();
    });
  });

  describe('timeout management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
          { id: '2', timezone: 'Europe/London', label: 'London', order: 1, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clear hover timeout when component unmounts', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = render(<TimezoneWidget {...defaultProps} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      fireEvent.mouseEnter(container);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should cancel hover timeout on mouse leave', () => {
      render(<TimezoneWidget {...defaultProps} hoverDelay={1000} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);

      // Advance past the hover delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not show panel since mouse left
      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });

    it('should clear hover timeouts when opening modal', async () => {
      render(<TimezoneWidget {...defaultProps} hoverDelay={1000} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      const trigger = screen.getByRole('button');
      
      // Start hover
      fireEvent.mouseEnter(container);
      
      // Open modal before hover completes
      fireEvent.click(trigger);

      // Advance past hover delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should show modal, not hover panel
      expect(screen.getByTestId('timezone-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle rapid mouse enter/leave', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
          { id: '2', timezone: 'Europe/London', label: 'London', order: 1, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneWidget {...defaultProps} hoverDelay={100} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      
      // Rapid mouse movements
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);
      fireEvent.mouseEnter(container);
      fireEvent.mouseLeave(container);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();
    });

    it('should handle focus/blur with no container ref', () => {
      render(<TimezoneWidget {...defaultProps} />);

      const trigger = screen.getByRole('button');
      
      // Should not throw error
      expect(() => {
        fireEvent.focus(trigger);
        fireEvent.blur(trigger);
      }).not.toThrow();
    });

    it('should use default hover delay when not specified', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [
          { id: '1', timezone: 'America/New_York', label: 'New York', order: 0, currentTime: {} as any, isValid: true },
          { id: '2', timezone: 'Europe/London', label: 'London', order: 1, currentTime: {} as any, isValid: true },
        ],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneWidget {...defaultProps} />);

      const container = screen.getByRole('button').closest('.timezone-widget-container')!;
      fireEvent.mouseEnter(container);

      // Should use default delay of 150ms
      act(() => {
        jest.advanceTimersByTime(149);
      });
      expect(screen.queryByTestId('timezone-hover-panel')).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('timezone-hover-panel')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<TimezoneWidget {...defaultProps} />);
      const firstRender = screen.getByRole('button');

      rerender(<TimezoneWidget {...defaultProps} />);
      const secondRender = screen.getByRole('button');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<TimezoneWidget {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

      rerender(<TimezoneWidget {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toHaveClass('disabled');
    });
  });
});