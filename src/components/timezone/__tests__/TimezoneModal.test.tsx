/**
 * TimezoneModal Test Suite
 * 
 * Tests the timezone modal component including:
 * - Modal display and accessibility
 * - Focus management and keyboard navigation
 * - Timezone search integration
 * - Timezone management (add, remove, edit labels)
 * - Clear all functionality
 * - Empty state and limit notices
 * - Focus trapping and escape handling
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';
import { TimezoneModal } from '../TimezoneModal';
import { useTimezones, useTimezoneFormatters } from '../useTimezones';
import { logger } from '../../../lib/logger';

// Mock dependencies
jest.mock('../TimezoneSearch');
jest.mock('../useTimezones');
jest.mock('../../../lib/logger');

const mockUseTimezones = useTimezones as jest.MockedFunction<typeof useTimezones>;
const mockUseTimezoneFormatters = useTimezoneFormatters as jest.MockedFunction<typeof useTimezoneFormatters>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock TimezoneSearch component
jest.mock('../TimezoneSearch', () => ({
  TimezoneSearch: ({ onSelect, excludeTimezones, autoFocus, className }: any) => (
    <div data-testid="timezone-search" className={className}>
      <input
        data-testid="search-input"
        autoFocus={autoFocus}
        placeholder="Search timezones"
      />
      <button onClick={() => onSelect('America/New_York')}>Add New York</button>
      <button onClick={() => onSelect('Europe/London')}>Add London</button>
      <div data-testid="excluded-count">{excludeTimezones?.length || 0}</div>
    </div>
  ),
}));

describe('TimezoneModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  const mockTimezones = [
    {
      id: '1',
      timezone: 'America/New_York',
      label: 'New York',
      currentTime: DateTime.fromISO('2023-12-01T12:00:00-05:00'),
      isValid: true,
      order: 0,
    },
    {
      id: '2',
      timezone: 'Europe/London',
      label: 'London',
      currentTime: DateTime.fromISO('2023-12-01T17:00:00Z'),
      isValid: true,
      order: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseTimezones.mockReturnValue({
      selectedTimezones: [],
      timezonesWithTime: [],
      addTimezone: jest.fn().mockReturnValue(true),
      removeTimezone: jest.fn(),
      updateTimezoneLabel: jest.fn(),
      reorderTimezones: jest.fn(),
      clearAllTimezones: jest.fn(),
      canAddMoreTimezones: true,
      isUpdating: false,
    });

    mockUseTimezoneFormatters.mockReturnValue({
      formatTime: jest.fn().mockReturnValue('12:00 PM'),
      formatRelativeTime: jest.fn().mockReturnValue('5 hours ahead'),
    });
  });

  describe('rendering and visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<TimezoneModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Manage Timezones')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <TimezoneModal {...defaultProps} className="custom-modal" />,
      );
      
      expect(container.querySelector('.timezone-modal-overlay')).toHaveClass('custom-modal');
    });

    it('should have proper accessibility attributes', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'timezone-modal-title');
      
      const document = screen.getByRole('document');
      expect(document).toBeInTheDocument();
    });

    it('should focus close button on open', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close timezone settings');
      expect(closeButton).toHaveFocus();
    });
  });

  describe('search integration', () => {
    it('should show search when can add more timezones', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByTestId('timezone-search')).toBeInTheDocument();
    });

    it('should not show search when at maximum timezones', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: new Array(5).fill(null).map((_, i) => ({ 
          id: `id${i}`,
          timezone: `tz${i}`,
          label: `Label ${i}`,
          order: i,
        })),
        timezonesWithTime: [],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: false,
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.queryByTestId('timezone-search')).not.toBeInTheDocument();
      expect(screen.getByText('Maximum of 5 timezones reached. Remove a timezone to add another.')).toBeInTheDocument();
    });

    it('should pass excluded timezones to search', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: 'America/New_York' }, { timezone: 'Europe/London' }] as any,
        timezonesWithTime: [],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByTestId('excluded-count')).toHaveTextContent('2');
    });

    it('should handle timezone selection from search', async () => {
      const mockAddTimezone = jest.fn().mockReturnValue(true);
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [],
        timezonesWithTime: [],
        addTimezone: mockAddTimezone,
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      const addButton = screen.getByText('Add New York');
      await user.click(addButton);
      
      expect(mockAddTimezone).toHaveBeenCalledWith('America/New_York');
    });

    it('should log warning when timezone addition fails', async () => {
      const mockAddTimezone = jest.fn().mockReturnValue(false);
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [],
        timezonesWithTime: [],
        addTimezone: mockAddTimezone,
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      const addButton = screen.getByText('Add New York');
      await user.click(addButton);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to add timezone', {
        component: 'TimezoneModal',
        action: 'handleAddTimezone',
        metadata: { timezone: 'America/New_York' },
      });
    });
  });

  describe('timezone list display', () => {
    beforeEach(() => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });
    });

    it('should display selected timezones', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByText('Selected Timezones (2/5)')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
    });

    it('should display timezone times', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getAllByText('12:00 PM')).toHaveLength(2);
    });

    it('should show invalid timezone state', () => {
      const invalidTimezone = {
        ...mockTimezones[0],
        isValid: false,
      };
      
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [{ timezone: invalidTimezone.timezone }] as any,
        timezonesWithTime: [invalidTimezone],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByText('Invalid')).toBeInTheDocument();
      expect(screen.getByRole('listitem')).toHaveClass('invalid');
    });

    it('should show empty state when no timezones selected', () => {
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

      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByText('No timezones selected yet.')).toBeInTheDocument();
      expect(screen.getByText('Search above to add your first timezone.')).toBeInTheDocument();
    });

    it('should show clear all button when timezones exist', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Remove all timezones')).toBeInTheDocument();
    });

    it('should not show clear all button when no timezones', () => {
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

      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.queryByLabelText('Remove all timezones')).not.toBeInTheDocument();
    });
  });

  describe('timezone management', () => {
    beforeEach(() => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });
    });

    it('should remove timezone when remove button clicked', async () => {
      const mockRemoveTimezone = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: mockRemoveTimezone,
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      const removeButton = screen.getByLabelText('Remove New York');
      await user.click(removeButton);
      
      expect(mockRemoveTimezone).toHaveBeenCalledWith('1');
    });

    it('should clear all timezones when clear all clicked', async () => {
      const mockClearAllTimezones = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: mockClearAllTimezones,
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      const clearAllButton = screen.getByLabelText('Remove all timezones');
      await user.click(clearAllButton);
      
      expect(mockClearAllTimezones).toHaveBeenCalled();
    });
  });

  describe('label editing', () => {
    beforeEach(() => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });
    });

    it('should start editing when label button clicked', async () => {
      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit timezone label')).toBeInTheDocument();
    });

    it('should save label on input blur', async () => {
      const mockUpdateTimezoneLabel = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: mockUpdateTimezoneLabel,
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      // Start editing
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      // Change label
      const input = screen.getByDisplayValue('New York');
      await user.clear(input);
      await user.type(input, 'NYC');
      
      // Blur to save
      fireEvent.blur(input);
      
      expect(mockUpdateTimezoneLabel).toHaveBeenCalledWith('1', 'NYC');
    });

    it('should save label on Enter key', async () => {
      const mockUpdateTimezoneLabel = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: mockUpdateTimezoneLabel,
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      // Start editing
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      // Change label
      const input = screen.getByDisplayValue('New York');
      await user.clear(input);
      await user.type(input, 'NYC');
      
      // Press Enter to save
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockUpdateTimezoneLabel).toHaveBeenCalledWith('1', 'NYC');
    });

    it('should cancel editing on Escape key', async () => {
      const mockUpdateTimezoneLabel = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: mockUpdateTimezoneLabel,
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      // Start editing
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      // Change label
      const input = screen.getByDisplayValue('New York');
      await user.clear(input);
      await user.type(input, 'NYC');
      
      // Press Escape to cancel
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // Should not save the label
      expect(mockUpdateTimezoneLabel).not.toHaveBeenCalled();
      // Should show original label button
      expect(screen.getByLabelText('Edit label for New York')).toBeInTheDocument();
    });

    it('should not save empty label', async () => {
      const mockUpdateTimezoneLabel = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: mockUpdateTimezoneLabel,
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      // Start editing
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      // Clear label
      const input = screen.getByDisplayValue('New York');
      await user.clear(input);
      
      // Try to save empty label
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockUpdateTimezoneLabel).not.toHaveBeenCalled();
    });

    it('should trim whitespace from label', async () => {
      const mockUpdateTimezoneLabel = jest.fn();
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: mockUpdateTimezoneLabel,
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} />);
      
      // Start editing
      const labelButton = screen.getByLabelText('Edit label for New York');
      await user.click(labelButton);
      
      // Change label with whitespace
      const input = screen.getByDisplayValue('New York');
      await user.clear(input);
      await user.type(input, '  NYC  ');
      
      // Save
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockUpdateTimezoneLabel).toHaveBeenCalledWith('1', 'NYC');
    });
  });

  describe('keyboard navigation and focus management', () => {
    it('should close modal on Escape key', () => {
      const mockOnClose = jest.fn();
      render(<TimezoneModal {...defaultProps} onClose={mockOnClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should trap focus within modal', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close timezone settings');
      const removeButton = screen.getByLabelText('Remove London'); // Last focusable element
      
      // Focus should be trapped at the end
      removeButton.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(closeButton).toHaveFocus();
    });

    it('should trap focus in reverse direction', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: mockTimezones.map(tz => ({ timezone: tz.timezone })) as any,
        timezonesWithTime: mockTimezones,
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: true,
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close timezone settings');
      const removeButton = screen.getByLabelText('Remove London'); // Last focusable element
      
      // Focus should be trapped at the beginning
      closeButton.focus();
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      
      expect(removeButton).toHaveFocus();
    });
  });

  describe('backdrop and close handling', () => {
    it('should close modal when backdrop clicked', async () => {
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} onClose={mockOnClose} />);
      
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when modal content clicked', async () => {
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} onClose={mockOnClose} />);
      
      const content = screen.getByRole('document');
      await user.click(content);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal when close button clicked', async () => {
      const mockOnClose = jest.fn();
      const user = userEvent.setup();
      render(<TimezoneModal {...defaultProps} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close timezone settings');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<TimezoneModal {...defaultProps} />);
      const firstRender = screen.getByRole('dialog');

      rerender(<TimezoneModal {...defaultProps} />);
      const secondRender = screen.getByRole('dialog');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<TimezoneModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<TimezoneModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing modal ref during focus trapping', () => {
      // Mock modalRef.current to be null
      const originalQuerySelectorAll = HTMLElement.prototype.querySelectorAll;
      HTMLElement.prototype.querySelectorAll = jest.fn().mockReturnValue([]);

      render(<TimezoneModal {...defaultProps} />);
      
      // Should not throw error
      expect(() => {
        fireEvent.keyDown(document, { key: 'Tab' });
      }).not.toThrow();

      // Restore original method
      HTMLElement.prototype.querySelectorAll = originalQuerySelectorAll;
    });

    it('should handle focus trapping with no focusable elements', () => {
      mockUseTimezones.mockReturnValue({
        selectedTimezones: [],
        timezonesWithTime: [],
        addTimezone: jest.fn(),
        removeTimezone: jest.fn(),
        updateTimezoneLabel: jest.fn(),
        reorderTimezones: jest.fn(),
        clearAllTimezones: jest.fn(),
        canAddMoreTimezones: false, // No search shown
        isUpdating: false,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      // Should not throw error
      expect(() => {
        fireEvent.keyDown(document, { key: 'Tab' });
      }).not.toThrow();
    });

    it('should handle activeElement being null during focus trapping', () => {
      const originalActiveElement = document.activeElement;
      Object.defineProperty(document, 'activeElement', {
        value: null,
        configurable: true,
      });

      render(<TimezoneModal {...defaultProps} />);
      
      // Should not throw error
      expect(() => {
        fireEvent.keyDown(document, { key: 'Tab' });
      }).not.toThrow();

      // Restore original activeElement
      Object.defineProperty(document, 'activeElement', {
        value: originalActiveElement,
        configurable: true,
      });
    });

    it('should handle footer info display', () => {
      render(<TimezoneModal {...defaultProps} />);
      
      expect(screen.getByText('Click labels to edit')).toBeInTheDocument();
    });
  });
});