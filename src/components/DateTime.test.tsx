import { render, screen, act } from '@testing-library/react';
import { DateTime } from './DateTime';

// Mock timers for testing time updates
jest.useFakeTimers();

describe('DateTime', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('renders current date and time', () => {
    const mockDate = new Date('2024-01-15T14:30:00');
    jest.setSystemTime(mockDate);

    render(<DateTime />);

    // Check that date is displayed
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    // Check that time is displayed in 24-hour format
    expect(screen.getByText('14:30')).toBeInTheDocument();
    // Check that day is displayed
    expect(screen.getByText('monday')).toBeInTheDocument();
  });

  it('updates time every second', async () => {
    const mockDate = new Date('2024-01-15T14:30:00');
    jest.setSystemTime(mockDate);

    const { rerender } = render(<DateTime />);

    expect(screen.getByText('14:30')).toBeInTheDocument();

    // Advance time by 1 second to trigger the interval
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Update system time to match
    jest.setSystemTime(new Date('2024-01-15T14:30:01'));
    
    // Force re-render to see the update
    rerender(<DateTime />);

    // Now advance to next minute
    act(() => {
      jest.setSystemTime(new Date('2024-01-15T14:31:00'));
      jest.advanceTimersByTime(59000);
    });

    // Force another re-render
    rerender(<DateTime />);

    expect(screen.getByText('14:31')).toBeInTheDocument();
  });

  it('has proper structure and classes', () => {
    const { container } = render(<DateTime />);

    const dateTimeElement = container.querySelector('.datetime-display');
    expect(dateTimeElement).toBeInTheDocument();

    const dateElement = container.querySelector('.date');
    expect(dateElement).toBeInTheDocument();

    const timeElement = container.querySelector('.time');
    expect(timeElement).toBeInTheDocument();
    
    const dayElement = container.querySelector('.day');
    expect(dayElement).toBeInTheDocument();
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(<DateTime />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('formats date correctly', () => {
    // Test different dates to ensure formatting
    const testDates = [
      { date: new Date('2024-12-25T09:00:00'), expectedDate: 'Dec 25, 2024', expectedDay: 'wednesday' },
      { date: new Date('2024-07-04T18:45:00'), expectedDate: 'Jul 4, 2024', expectedDay: 'thursday' },
      { date: new Date('2024-02-29T23:59:00'), expectedDate: 'Feb 29, 2024', expectedDay: 'thursday' },
    ];

    testDates.forEach(({ date, expectedDate, expectedDay }) => {
      jest.setSystemTime(date);
      const { container } = render(<DateTime />);
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
      expect(screen.getByText(expectedDay)).toBeInTheDocument();
      container.remove();
    });
  });

  it('formats time correctly in 24-hour format', () => {
    // Test different times to ensure formatting
    const testTimes = [
      { date: new Date('2024-01-15T00:00:00'), expectedTime: '00:00' },
      { date: new Date('2024-01-15T12:00:00'), expectedTime: '12:00' },
      { date: new Date('2024-01-15T13:30:00'), expectedTime: '13:30' },
      { date: new Date('2024-01-15T23:45:00'), expectedTime: '23:45' },
    ];

    testTimes.forEach(({ date, expectedTime }) => {
      jest.setSystemTime(date);
      const { container } = render(<DateTime />);
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
      container.remove();
    });
  });
});