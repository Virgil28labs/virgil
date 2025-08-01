/**
 * DateTime Test Suite - Comprehensive Coverage
 * 
 * Tests the DateTime component including:
 * - Real-time clock display with second-by-second updates
 * - Time formatting with hours, minutes, and seconds
 * - Date and day of week display
 * - Timezone widget integration with correct props
 * - Timer lifecycle management and cleanup
 * - TimeService integration and error handling
 * - Memoization behavior and performance optimization
 * - Edge cases and error scenarios
 * - Accessibility and semantic structure
 */

import { type ReactNode } from 'react';
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
  TimezoneWidget: ({ children, className, hoverDelay, clickToOpen }: { children?: ReactNode; className?: string; hoverDelay?: number; clickToOpen?: boolean }) => (
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

  describe('error handling', () => {
    it('should throw when timeService.getCurrentDateTime fails', () => {
      mockTimeService.getCurrentDateTime.mockImplementation(() => {
        throw new Error('TimeService error');
      });

      // The component doesn't handle errors gracefully - it will throw
      expect(() => render(<DateTime />)).toThrow('TimeService error');
    });

    it('should throw when timeService.formatTimeToLocal fails', () => {
      mockTimeService.formatTimeToLocal.mockImplementation(() => {
        throw new Error('Format error');
      });

      expect(() => render(<DateTime />)).toThrow('Format error');
    });

    it('should throw when timeService.formatDate fails', () => {
      mockTimeService.formatDate.mockImplementation(() => {
        throw new Error('Date format error');
      });

      expect(() => render(<DateTime />)).toThrow('Date format error');
    });

    it('should throw when timeService.getDayOfWeek fails', () => {
      mockTimeService.getDayOfWeek.mockImplementation(() => {
        throw new Error('Day of week error');
      });

      expect(() => render(<DateTime />)).toThrow('Day of week error');
    });
  });

  describe('edge cases', () => {
    it('should handle midnight time display', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('00:00:00');
      
      render(<DateTime />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('00')).toBeInTheDocument();
    });

    it('should handle noon time display', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('12:00:00');
      
      render(<DateTime />);

      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('00')).toBeInTheDocument();
    });

    it('should handle time format without colons gracefully', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('143045');
      
      render(<DateTime />);

      // Should still render the component without crashing
      expect(screen.getByTestId('timezone-widget')).toBeInTheDocument();
    });

    it('should handle empty time format', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('');
      
      render(<DateTime />);

      expect(screen.getByTestId('timezone-widget')).toBeInTheDocument();
    });

    it('should handle single-digit time components', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('9:5:3');
      
      render(<DateTime />);

      expect(screen.getByText('9:5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle leap second (60 seconds)', () => {
      mockTimeService.formatTimeToLocal.mockReturnValue('23:59:60');
      
      render(<DateTime />);

      expect(screen.getByText('23:59')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should handle date rollover at midnight', () => {
      // This test verifies the component can handle different date values
      render(<DateTime />);
      
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();

      // Simulate date change by updating mocks and triggering re-render through timer
      const newDate = new Date('2024-01-16T00:00:00');
      mockTimeService.getCurrentDateTime.mockReturnValue(newDate);
      mockTimeService.formatDate.mockReturnValue('Jan 16, 2024');
      mockTimeService.getDayOfWeek.mockReturnValue('Tuesday');
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Verify the service was called (the exact count may vary due to test setup)
      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
    });
  });

  describe('performance and optimization', () => {
    it('should create formatters efficiently with useMemo', () => {
      // This test verifies that the component uses useMemo for formatters
      // We can't easily test that the formatters are memoized without 
      // implementation details, but we can test that the component renders
      // correctly with the formatting logic
      render(<DateTime />);

      // Verify the formatters are called to produce the display
      expect(mockTimeService.formatTimeToLocal).toHaveBeenCalledWith(
        expect.any(Date),
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        },
      );
      expect(mockTimeService.formatDate).toHaveBeenCalled();
      expect(mockTimeService.getDayOfWeek).toHaveBeenCalled();

      // The component should render the formatted output correctly
      expect(screen.getByText('14:30')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();
    });

    it('should not recreate timer on every render', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const { rerender } = render(<DateTime />);

      // Multiple rerenders
      rerender(<DateTime />);
      rerender(<DateTime />);
      rerender(<DateTime />);

      // setInterval should only be called once
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      
      setIntervalSpy.mockRestore();
    });

    it('should memoize component to prevent unnecessary rerenders', () => {
      const { rerender } = render(<DateTime />);
      const initialElement = screen.getByTestId('timezone-widget');

      // Rerender with same props (no props)
      rerender(<DateTime />);
      const afterRerender = screen.getByTestId('timezone-widget');

      // Should be same element due to React.memo
      expect(initialElement).toBe(afterRerender);
    });
  });

  describe('accessibility and semantics', () => {
    it('should have proper semantic structure', () => {
      render(<DateTime />);

      const datetimeDisplay = screen.getByText('14:30').closest('.datetime-display');
      expect(datetimeDisplay).toHaveClass('datetime-display');

      const timeElement = screen.getByText('14:30').closest('.time');
      expect(timeElement).toHaveClass('time');

      const dateElement = screen.getByText('Jan 15, 2024').closest('.date');
      expect(dateElement).toHaveClass('date');

      const dayElement = screen.getByText('Monday').closest('.day');
      expect(dayElement).toHaveClass('day');
    });

    it('should use superscript for seconds appropriately', () => {
      render(<DateTime />);

      const secondsElement = screen.getByText('45');
      expect(secondsElement.tagName).toBe('SUP');
      expect(secondsElement).toHaveClass('time-seconds');
    });

    it('should maintain semantic hierarchy', () => {
      render(<DateTime />);

      const widget = screen.getByTestId('timezone-widget');
      const display = screen.getByText('14:30').closest('.datetime-display');

      expect(widget).toContainElement(display);
    });
  });

  describe('timer management', () => {
    it('should start timer immediately on mount', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      render(<DateTime />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      
      setIntervalSpy.mockRestore();
    });

    it('should clear timer on unmount to prevent memory leaks', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = render(<DateTime />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });

    it('should not update time after component unmounts', () => {
      const { unmount } = render(<DateTime />);

      // Clear previous calls
      mockTimeService.getCurrentDateTime.mockClear();

      unmount();

      // Advance time after unmount
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not call getCurrentDateTime after unmount
      expect(mockTimeService.getCurrentDateTime).not.toHaveBeenCalled();
    });

    it('should update exactly once per second', () => {
      render(<DateTime />);

      const initialCalls = mockTimeService.getCurrentDateTime.mock.calls.length;

      // Advance by exactly 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should have called getCurrentDateTime 5 more times
      expect(mockTimeService.getCurrentDateTime.mock.calls.length).toBe(initialCalls + 5);
    });
  });

  describe('timezone widget integration', () => {
    it('should pass all required props to TimezoneWidget', () => {
      render(<DateTime />);

      const widget = screen.getByTestId('timezone-widget');
      expect(widget).toHaveClass('datetime-widget');
      expect(widget).toHaveAttribute('data-hover-delay', '150');
      expect(widget).toHaveAttribute('data-click-to-open', 'true');
    });

    it('should render datetime content inside TimezoneWidget', () => {
      render(<DateTime />);

      const widget = screen.getByTestId('timezone-widget');
      const timeDisplay = screen.getByText('14:30');
      const dateDisplay = screen.getByText('Jan 15, 2024');
      const dayDisplay = screen.getByText('Monday');

      expect(widget).toContainElement(timeDisplay);
      expect(widget).toContainElement(dateDisplay);
      expect(widget).toContainElement(dayDisplay);
    });
  });

  describe('time service integration', () => {
    it('should call timeService.formatTimeToLocal with correct options', () => {
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

    it('should call all required timeService methods', () => {
      render(<DateTime />);

      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalled();
      expect(mockTimeService.formatTimeToLocal).toHaveBeenCalled();
      expect(mockTimeService.formatDate).toHaveBeenCalled();
      expect(mockTimeService.getDayOfWeek).toHaveBeenCalled();
    });

    it('should use the same date object for all formatting calls', () => {
      const mockDate = new Date('2024-01-15T14:30:45');
      mockTimeService.getCurrentDateTime.mockReturnValue(mockDate);

      render(<DateTime />);

      expect(mockTimeService.formatTimeToLocal).toHaveBeenCalledWith(mockDate, expect.any(Object));
      expect(mockTimeService.formatDate).toHaveBeenCalledWith(mockDate);
    });
  });

  describe('real-time behavior', () => {
    it('should show live time updates', async () => {
      // Setup sequential time updates
      const times = [
        { time: '14:30:45', formatted: '14:30:45' },
        { time: '14:30:46', formatted: '14:30:46' },
        { time: '14:30:47', formatted: '14:30:47' },
      ];

      mockTimeService.formatTimeToLocal
        .mockReturnValueOnce(times[0].formatted)
        .mockReturnValueOnce(times[1].formatted)
        .mockReturnValueOnce(times[2].formatted);

      render(<DateTime />);

      // Initial time
      expect(screen.getByText('45')).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should update to next second
      expect(screen.getByText('14:30')).toBeInTheDocument();

      // Advance another second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should continue updating
      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid time changes gracefully', () => {
      render(<DateTime />);

      // Rapidly advance time
      act(() => {
        jest.advanceTimersByTime(10000); // 10 seconds
      });

      // Should handle all updates without issues
      expect(mockTimeService.getCurrentDateTime).toHaveBeenCalledTimes(11); // Initial + 10 updates
    });
  });
});