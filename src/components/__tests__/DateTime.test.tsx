/**
 * DateTime Test Suite
 * 
 * Tests the DateTime component including:
 * - Real-time updates
 * - Time formatting
 * - Date formatting
 * - Day of week display
 * - Timezone widget integration
 * - Memory optimization
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DateTime } from '../DateTime';
import { timeService } from '../../services/TimeService';

// Mock dependencies
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getCurrentDateTime: jest.fn(),
    formatTimeToLocal: jest.fn(),
    formatDate: jest.fn(),
    getDayOfWeek: jest.fn(),
  },
}));

jest.mock('../timezone/TimezoneWidget', () => ({
  TimezoneWidget: ({ children, className, hoverDelay, clickToOpen }: any) => (
    <div 
      data-testid="timezone-widget" 
      className={className}
      data-hover-delay={hoverDelay}
      data-click-to-open={clickToOpen}
    >
      {children}
    </div>
  ),
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('DateTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    const mockDate = new Date('2024-01-15T14:30:45');
    mockTimeService.getCurrentDateTime.mockReturnValue(mockDate);
    mockTimeService.formatTimeToLocal.mockReturnValue('14:30:45');
    mockTimeService.formatDate.mockReturnValue('Jan 15, 2024');
    mockTimeService.getDayOfWeek.mockReturnValue('Monday');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with initial time and date', () => {
    render(<DateTime />);

    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
  });

  it('should wrap content in timezone widget', () => {
    render(<DateTime />);

    const widget = screen.getByTestId('timezone-widget');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveClass('datetime-widget');
    expect(widget).toHaveAttribute('data-hover-delay', '150');
    expect(widget).toHaveAttribute('data-click-to-open', 'true');
  });

  it('should update time every second', () => {
    render(<DateTime />);

    expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(1);

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(2);

    // Advance by another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(3);
  });

  it('should display time with seconds as superscript', () => {
    render(<DateTime />);

    const secondsElement = screen.getByText('45');
    expect(secondsElement).toHaveClass('time-seconds');
    expect(secondsElement.tagName).toBe('SUP');
  });

  it('should format time correctly', () => {
    render(<DateTime />);

    expect(mockTimeService.formatTimeToLocal).toHaveBeenCalledWith(
      expect.any(Date),
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      },
    );
  });

  it('should call formatDate for date display', () => {
    render(<DateTime />);

    expect(mockTimeService.formatDate).toHaveBeenCalledWith(expect.any(Date));
  });

  it('should call getDayOfWeek for day display', () => {
    render(<DateTime />);

    expect(mockTimeService.getDayOfWeek).toHaveBeenCalled();
  });

  it('should clean up timer on unmount', () => {
    const { unmount } = render(<DateTime />);

    // Advance timer to trigger interval
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(2);

    unmount();

    // Timer should no longer trigger after unmount
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(2);
  });

  it('should handle time format changes', () => {
    mockTimeService.formatTimeToLocal.mockReturnValue('09:05:03');

    render(<DateTime />);

    expect(screen.getByText('09:05')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('should be memoized', () => {
    const { rerender } = render(<DateTime />);
    const firstRender = screen.getByTestId('timezone-widget');

    rerender(<DateTime />);
    const secondRender = screen.getByTestId('timezone-widget');

    // Should be the same instance due to memo (props haven't changed)
    expect(firstRender).toBe(secondRender);
  });

  it('should have correct CSS classes', () => {
    render(<DateTime />);

    expect(screen.getByTestId('timezone-widget')).toHaveClass('datetime-widget');
    
    const timeElement = screen.getByText('14:30').closest('.time');
    expect(timeElement).toBeInTheDocument();
    
    const dateElement = screen.getByText('Jan 15, 2024').closest('.date');
    expect(dateElement).toBeInTheDocument();
    
    const dayElement = screen.getByText('Monday').closest('.day');
    expect(dayElement).toBeInTheDocument();
  });

  it('should update when time service returns new values', () => {
    render(<DateTime />);

    // Change the mock return values
    const newDate = new Date('2024-01-15T15:45:30');
    mockTimeService.getCurrentDateTime.mockReturnValue(newDate);
    mockTimeService.formatTimeToLocal.mockReturnValue('15:45:30');
    mockTimeService.formatDate.mockReturnValue('Jan 15, 2024');
    mockTimeService.getDayOfWeek.mockReturnValue('Monday');

    // Trigger timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('15:45')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});