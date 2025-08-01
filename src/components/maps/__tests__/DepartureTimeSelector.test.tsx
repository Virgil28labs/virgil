/**
 * DepartureTimeSelector Test Suite
 * 
 * Tests the departure time selector component including:
 * - Display modes (compact/normal)
 * - Quick time options
 * - Custom date/time picker
 * - Outside click handling
 * - Time formatting
 * - Date calculations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartureTimeSelector } from '../DepartureTimeSelector';
import { timeService } from '../../../services/TimeService';

// Mock timeService
jest.mock('../../../services/TimeService', () => ({
  timeService: {
    getCurrentDateTime: jest.fn(),
    isSameDay: jest.fn(),
    formatTimeToLocal: jest.fn(),
    formatDateToLocal: jest.fn(),
    addMinutes: jest.fn(),
    addDays: jest.fn(),
    addHours: jest.fn(),
    addYears: jest.fn(),
    startOfDay: jest.fn(),
    parseDate: jest.fn(),
    formatForDateTimeInput: jest.fn(),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('DepartureTimeSelector', () => {
  const mockOnTimeChange = jest.fn();
  const mockDate = new Date('2024-01-15T14:30:00');

  const defaultProps = {
    selectedTime: 'now' as const,
    onTimeChange: mockOnTimeChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getCurrentDateTime.mockReturnValue(mockDate);
    mockTimeService.isSameDay.mockReturnValue(true);
    mockTimeService.formatTimeToLocal.mockReturnValue('2:30 PM');
    mockTimeService.formatDateToLocal.mockReturnValue('Jan 15, 2:30 PM');
    mockTimeService.addMinutes.mockImplementation((date, minutes) => {
      const newDate = new Date(date);
      newDate.setMinutes(newDate.getMinutes() + minutes);
      return newDate;
    });
    mockTimeService.addDays.mockImplementation((date, days) => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
    mockTimeService.addHours.mockImplementation((date, hours) => {
      const newDate = new Date(date);
      newDate.setHours(newDate.getHours() + hours);
      return newDate;
    });
    mockTimeService.addYears.mockImplementation((date, years) => {
      const newDate = new Date(date);
      newDate.setFullYear(newDate.getFullYear() + years);
      return newDate;
    });
    mockTimeService.startOfDay.mockImplementation((date) => {
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    });
    mockTimeService.parseDate.mockImplementation((str) => new Date(str));
    mockTimeService.formatForDateTimeInput.mockReturnValue('2024-01-15T14:30');
  });

  describe('rendering', () => {
    it('should render with "Leave now" text when selectedTime is "now"', () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      expect(screen.getByText('Leave now')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('departure-time-btn');
    });

    it('should render with "Now" text in compact mode', () => {
      render(<DepartureTimeSelector {...defaultProps} isCompact />);

      expect(screen.getByText('Now')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('compact');
    });

    it('should render formatted time when selectedTime is a Date', () => {
      const specificDate = new Date('2024-01-15T15:45:00');
      render(
        <DepartureTimeSelector 
          {...defaultProps} 
          selectedTime={specificDate} 
        />,
      );

      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
      expect(mockTimeService.formatTimeToLocal).toHaveBeenCalledWith(
        specificDate,
        { hour: 'numeric', minute: '2-digit' },
      );
    });

    it('should show clock icon', () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      const clockIcon = screen.getByRole('button').querySelector('svg');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should show chevron icon when not compact', () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      const chevron = screen.getByRole('button').querySelector('.chevron');
      expect(chevron).toBeInTheDocument();
    });

    it('should not show chevron icon when compact', () => {
      render(<DepartureTimeSelector {...defaultProps} isCompact />);

      const chevron = screen.getByRole('button').querySelector('.chevron');
      expect(chevron).not.toBeInTheDocument();
    });
  });

  describe('dropdown functionality', () => {
    it('should show dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      // Use getAllByText to handle multiple "Leave now" texts
      expect(screen.getAllByText('Leave now')).toHaveLength(2); // Button text + dropdown option
      expect(screen.getByText('In 15 minutes')).toBeInTheDocument();
      expect(screen.getByText('In 30 minutes')).toBeInTheDocument();
      expect(screen.getByText('In 1 hour')).toBeInTheDocument();
      expect(screen.getByText('In 2 hours')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow at 9 AM')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow at 5 PM')).toBeInTheDocument();
      expect(screen.getByText('Next week')).toBeInTheDocument();
      expect(screen.getByText('Pick specific date & time...')).toBeInTheDocument();
    });

    it('should hide dropdown when button is clicked again', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByText('In 15 minutes')).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByText('In 15 minutes')).not.toBeInTheDocument();
    });

    it('should apply "open" class when dropdown is shown', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      const container = screen.getByRole('button').closest('.departure-time-selector');
      expect(container).not.toHaveClass('open');

      await user.click(screen.getByRole('button'));
      expect(container).toHaveClass('open');
    });
  });

  describe('quick time options', () => {
    it('should handle "Leave now" option', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      // Use more specific selector for dropdown option
      const leaveNowOptions = screen.getAllByText('Leave now');
      const dropdownOption = leaveNowOptions.find(option => 
        option.closest('.departure-time-dropdown'),
      );
      await user.click(dropdownOption!);

      expect(mockOnTimeChange).toHaveBeenCalledWith('now');
    });

    it('should handle "In 15 minutes" option', async () => {
      const user = userEvent.setup();
      const expectedTime = new Date(mockDate.getTime() + 15 * 60000);
      mockTimeService.addMinutes.mockReturnValue(expectedTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('In 15 minutes'));

      expect(mockTimeService.addMinutes).toHaveBeenCalledWith(mockDate, 15);
      expect(mockOnTimeChange).toHaveBeenCalledWith(expectedTime);
    });

    it('should handle "In 30 minutes" option', async () => {
      const user = userEvent.setup();
      const expectedTime = new Date(mockDate.getTime() + 30 * 60000);
      mockTimeService.addMinutes.mockReturnValue(expectedTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('In 30 minutes'));

      expect(mockTimeService.addMinutes).toHaveBeenCalledWith(mockDate, 30);
      expect(mockOnTimeChange).toHaveBeenCalledWith(expectedTime);
    });

    it('should handle "In 1 hour" option', async () => {
      const user = userEvent.setup();
      const expectedTime = new Date(mockDate.getTime() + 60 * 60000);
      mockTimeService.addMinutes.mockReturnValue(expectedTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('In 1 hour'));

      expect(mockTimeService.addMinutes).toHaveBeenCalledWith(mockDate, 60);
      expect(mockOnTimeChange).toHaveBeenCalledWith(expectedTime);
    });

    it('should handle "In 2 hours" option', async () => {
      const user = userEvent.setup();
      const expectedTime = new Date(mockDate.getTime() + 120 * 60000);
      mockTimeService.addMinutes.mockReturnValue(expectedTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('In 2 hours'));

      expect(mockTimeService.addMinutes).toHaveBeenCalledWith(mockDate, 120);
      expect(mockOnTimeChange).toHaveBeenCalledWith(expectedTime);
    });
  });

  describe('quick date options', () => {
    it('should handle "Tomorrow at 9 AM" option', async () => {
      const user = userEvent.setup();
      const tomorrowDate = new Date(mockDate);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const startOfDay = new Date(tomorrowDate);
      startOfDay.setHours(0, 0, 0, 0);
      const finalTime = new Date(startOfDay);
      finalTime.setHours(9);

      mockTimeService.addDays.mockReturnValue(tomorrowDate);
      mockTimeService.startOfDay.mockReturnValue(startOfDay);
      mockTimeService.addHours.mockReturnValue(finalTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Tomorrow at 9 AM'));

      expect(mockTimeService.addDays).toHaveBeenCalledWith(mockDate, 1);
      expect(mockTimeService.startOfDay).toHaveBeenCalledWith(tomorrowDate);
      expect(mockTimeService.addHours).toHaveBeenCalledWith(startOfDay, 9);
      expect(mockOnTimeChange).toHaveBeenCalledWith(finalTime);
    });

    it('should handle "Tomorrow at 5 PM" option', async () => {
      const user = userEvent.setup();
      const tomorrowDate = new Date(mockDate);
      const startOfDay = new Date(tomorrowDate);
      const finalTime = new Date(startOfDay);

      mockTimeService.addDays.mockReturnValue(tomorrowDate);
      mockTimeService.startOfDay.mockReturnValue(startOfDay);
      mockTimeService.addHours.mockReturnValue(finalTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Tomorrow at 5 PM'));

      expect(mockTimeService.addHours).toHaveBeenCalledWith(startOfDay, 17);
    });

    it('should handle "Next week" option', async () => {
      const user = userEvent.setup();
      const nextWeekDate = new Date(mockDate);
      const startOfDay = new Date(nextWeekDate);
      const finalTime = new Date(startOfDay);

      mockTimeService.addDays.mockReturnValue(nextWeekDate);
      mockTimeService.startOfDay.mockReturnValue(startOfDay);
      mockTimeService.addHours.mockReturnValue(finalTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Next week'));

      expect(mockTimeService.addDays).toHaveBeenCalledWith(mockDate, 7);
      expect(mockTimeService.addHours).toHaveBeenCalledWith(startOfDay, 9);
    });
  });

  describe('custom date/time picker', () => {
    it('should show custom picker when clicked', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Pick specific date & time...'));

      expect(screen.getByDisplayValue('2024-01-15T14:30')).toBeInTheDocument();
      expect(screen.getByText('Select any date and time')).toBeInTheDocument();
    });

    it('should handle custom time input change', async () => {
      const user = userEvent.setup();
      const customTime = new Date('2024-01-16T10:30:00');
      mockTimeService.parseDate.mockReturnValue(customTime);

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Pick specific date & time...'));

      const input = screen.getByDisplayValue('2024-01-15T14:30');
      
      // Use fireEvent for datetime-local inputs as userEvent may not work properly
      fireEvent.change(input, { target: { value: '2024-01-16T10:30' } });

      expect(mockTimeService.parseDate).toHaveBeenCalledWith('2024-01-16T10:30');
      expect(mockOnTimeChange).toHaveBeenCalledWith(customTime);
    });

    it('should set correct min and max dates for custom picker', async () => {
      const user = userEvent.setup();
      const minDate = new Date(mockDate);
      minDate.setFullYear(minDate.getFullYear() - 1);
      const maxDate = new Date(mockDate);
      maxDate.setFullYear(maxDate.getFullYear() + 1);

      mockTimeService.addYears.mockImplementation((date, years) => {
        if (years === -1) return minDate;
        if (years === 1) return maxDate;
        return date;
      });
      mockTimeService.formatForDateTimeInput.mockImplementation((date) => {
        if (date === minDate) return '2023-01-15T14:30';
        if (date === maxDate) return '2025-01-15T14:30';
        return '2024-01-15T14:30';
      });

      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Pick specific date & time...'));

      const input = screen.getByDisplayValue('2024-01-15T14:30') as HTMLInputElement;
      expect(input.min).toBe('2023-01-15T14:30');
      expect(input.max).toBe('2025-01-15T14:30');
    });
  });

  describe('outside click handling', () => {
    it('should close dropdown when clicking outside', async () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('In 15 minutes')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('In 15 minutes')).not.toBeInTheDocument();
      });
    });

    it('should close custom picker when clicking outside', async () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      // Open dropdown and custom picker
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Pick specific date & time...'));
      expect(screen.getByDisplayValue('2024-01-15T14:30')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('2024-01-15T14:30')).not.toBeInTheDocument();
      });
    });

    it('should not close dropdown when clicking inside', async () => {
      const { container } = render(<DepartureTimeSelector {...defaultProps} />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('In 15 minutes')).toBeInTheDocument();

      // Click inside dropdown
      const dropdown = container.querySelector('.departure-time-dropdown');
      fireEvent.mouseDown(dropdown!);

      expect(screen.getByText('In 15 minutes')).toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('should format time for same day', () => {
      const specificDate = new Date('2024-01-15T15:45:00');
      mockTimeService.isSameDay.mockReturnValue(true);

      render(
        <DepartureTimeSelector 
          {...defaultProps} 
          selectedTime={specificDate} 
        />,
      );

      expect(mockTimeService.isSameDay).toHaveBeenCalledWith(specificDate, mockDate);
      expect(mockTimeService.formatTimeToLocal).toHaveBeenCalledWith(
        specificDate,
        { hour: 'numeric', minute: '2-digit' },
      );
    });

    it('should format date and time for different day', () => {
      const specificDate = new Date('2024-01-16T15:45:00');
      mockTimeService.isSameDay.mockReturnValue(false);

      render(
        <DepartureTimeSelector 
          {...defaultProps} 
          selectedTime={specificDate} 
        />,
      );

      expect(mockTimeService.formatDateToLocal).toHaveBeenCalledWith(
        specificDate,
        {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        },
      );
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<DepartureTimeSelector {...defaultProps} />);
      const firstRender = screen.getByRole('button');

      rerender(<DepartureTimeSelector {...defaultProps} />);
      const secondRender = screen.getByRole('button');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<DepartureTimeSelector {...defaultProps} />);
      expect(screen.getByText('Leave now')).toBeInTheDocument();

      const newDate = new Date('2024-01-15T16:00:00');
      rerender(
        <DepartureTimeSelector 
          selectedTime={newDate}
          onTimeChange={mockOnTimeChange}
        />,
      );

      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper button type', () => {
      render(<DepartureTimeSelector {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have datetime-local input type for custom picker', async () => {
      const user = userEvent.setup();
      render(<DepartureTimeSelector {...defaultProps} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Pick specific date & time...'));

      const input = screen.getByDisplayValue('2024-01-15T14:30');
      expect(input).toHaveAttribute('type', 'datetime-local');
    });
  });
});