/**
 * TrafficIndicator Test Suite
 * 
 * Tests the traffic indicator component including:
 * - Traffic level detection based on time
 * - Toggle functionality
 * - Color and label updates
 * - Animation states
 * - Icon rendering
 * - Accessibility features
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrafficIndicator } from '../TrafficIndicator';
import { timeService } from '../../../services/TimeService';

// Mock timeService
jest.mock('../../../services/TimeService', () => ({
  timeService: {
    getCurrentDateTime: jest.fn(),
    getHours: jest.fn(),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('TrafficIndicator', () => {
  const mockOnToggleTraffic = jest.fn();
  const mockMap = {} as google.maps.Map;

  const defaultProps = {
    map: mockMap,
    isTrafficEnabled: false,
    onToggleTraffic: mockOnToggleTraffic,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    const mockDate = new Date('2024-01-15T14:30:00');
    mockTimeService.getCurrentDateTime.mockReturnValue(mockDate);
    mockTimeService.getHours.mockReturnValue(14);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with disabled state initially', () => {
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('traffic-indicator', 'disabled');
      expect(button).not.toHaveClass('enabled');
      expect(screen.getByText('Traffic Off')).toBeInTheDocument();
    });

    it('should render with enabled state when traffic is enabled', () => {
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('traffic-indicator', 'enabled');
      expect(button).not.toHaveClass('disabled');
    });

    it('should have proper title attribute', () => {
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Traffic Off');
    });

    it('should show disabled icon when traffic is off', () => {
      render(<TrafficIndicator {...defaultProps} />);

      // Check for disabled icon (with X pattern)
      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Should have the X pattern paths
      const xPaths = svg?.querySelectorAll('path');
      expect(xPaths).toHaveLength(2); // location outline + 1 X pattern (combined paths)
    });

    it('should show enabled icon when traffic is on', () => {
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      // Check for enabled icon (with pulse circle)
      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      const circle = svg?.querySelector('.traffic-pulse');
      expect(circle).toBeInTheDocument();
    });

    it('should show status dot when traffic is enabled and level is known', () => {
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      // Wait for traffic level to be determined
      act(() => {
        jest.runOnlyPendingTimers();
      });

      const statusDot = screen.getByRole('button').querySelector('.traffic-status-dot');
      expect(statusDot).toBeInTheDocument();
    });

    it('should not show status dot when traffic is disabled', () => {
      render(<TrafficIndicator {...defaultProps} />);

      const statusDot = screen.getByRole('button').querySelector('.traffic-status-dot');
      expect(statusDot).not.toBeInTheDocument();
    });
  });

  describe('traffic level detection', () => {
    it('should detect heavy traffic during morning rush hour (7-9 AM)', () => {
      mockTimeService.getHours.mockReturnValue(8);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Heavy Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Heavy Traffic');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#F44336');
    });

    it('should detect heavy traffic during evening rush hour (5-7 PM)', () => {
      mockTimeService.getHours.mockReturnValue(18);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Heavy Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#F44336');
    });

    it('should detect moderate traffic during pre/post rush hours', () => {
      mockTimeService.getHours.mockReturnValue(6);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#FFA726');
    });

    it('should detect light traffic during late night/early morning', () => {
      mockTimeService.getHours.mockReturnValue(2);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Light Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#4CAF50');
    });

    it('should detect moderate traffic during regular day hours', () => {
      mockTimeService.getHours.mockReturnValue(14);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#FFA726');
    });

    it('should show unknown traffic level when disabled', () => {
      render(<TrafficIndicator {...defaultProps} />);

      expect(screen.getByText('Traffic Off')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#999');
    });

    it('should show unknown traffic level when map is null', () => {
      render(<TrafficIndicator {...defaultProps} map={null} isTrafficEnabled />);

      expect(screen.getByText('Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#999');
    });
  });

  describe('traffic level updates', () => {
    it('should update traffic level every 5 minutes', () => {
      mockTimeService.getHours.mockReturnValue(8);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      expect(screen.getByText('Heavy Traffic')).toBeInTheDocument();

      // Change hour and advance timers
      mockTimeService.getHours.mockReturnValue(2);
      act(() => {
        jest.advanceTimersByTime(300000); // 5 minutes
      });

      expect(screen.getByText('Light Traffic')).toBeInTheDocument();
    });

    it('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should not set interval when traffic is disabled', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      render(<TrafficIndicator {...defaultProps} />);
      
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('should update when isTrafficEnabled prop changes', () => {
      const { rerender } = render(<TrafficIndicator {...defaultProps} />);
      
      expect(screen.getByText('Traffic Off')).toBeInTheDocument();

      rerender(<TrafficIndicator {...defaultProps} isTrafficEnabled />);
      
      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
    });
  });

  describe('toggle functionality', () => {
    it('should call onToggleTraffic when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnToggleTraffic).toHaveBeenCalledWith(true);
    });

    it('should call onToggleTraffic with false when traffic is enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnToggleTraffic).toHaveBeenCalledWith(false);
    });

    it('should show animating class when toggled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      
      await user.click(button);
      
      expect(button).toHaveClass('animating');
    });

    it('should remove animating class after animation completes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(button).toHaveClass('animating');

      // Fast-forward animation
      act(() => {
        jest.advanceTimersByTime(500); // Increase timeout to ensure animation completes
      });

      await waitFor(() => {
        expect(button).not.toHaveClass('animating');
      });
    });
  });

  describe('color mapping', () => {
    it('should use correct color for light traffic', () => {
      mockTimeService.getHours.mockReturnValue(2);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#4CAF50');
    });

    it('should use correct color for moderate traffic', () => {
      mockTimeService.getHours.mockReturnValue(14);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#FFA726');
    });

    it('should use correct color for heavy traffic', () => {
      mockTimeService.getHours.mockReturnValue(8);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#F44336');
    });

    it('should use gray color when disabled', () => {
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#999');
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<TrafficIndicator {...defaultProps} />);
      const firstRender = screen.getByRole('button');

      rerender(<TrafficIndicator {...defaultProps} />);
      const secondRender = screen.getByRole('button');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<TrafficIndicator {...defaultProps} />);
      expect(screen.getByText('Traffic Off')).toBeInTheDocument();

      rerender(<TrafficIndicator {...defaultProps} isTrafficEnabled />);
      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be focusable as a button', () => {
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have descriptive title for screen readers', () => {
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Moderate Traffic');
    });

    it('should update title when traffic level changes', () => {
      mockTimeService.getHours.mockReturnValue(8);
      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Heavy Traffic');

      // Change to light traffic time
      mockTimeService.getHours.mockReturnValue(2);
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(button).toHaveAttribute('title', 'Light Traffic');
    });
  });

  describe('edge cases', () => {
    it('should handle null map gracefully', () => {
      expect(() => {
        render(<TrafficIndicator {...defaultProps} map={null} />);
      }).not.toThrow();
    });

    it('should handle rapid toggling', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TrafficIndicator {...defaultProps} />);

      const button = screen.getByRole('button');
      
      // Rapid clicks with proper timing
      await user.click(button);
      act(() => { jest.advanceTimersByTime(10); });
      await user.click(button);
      act(() => { jest.advanceTimersByTime(10); });
      await user.click(button);

      expect(mockOnToggleTraffic).toHaveBeenCalledTimes(3);
    });

    it('should handle component unmount during animation', () => {
      const { unmount } = render(<TrafficIndicator {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle timeService errors gracefully', () => {
      mockTimeService.getHours.mockImplementation(() => {
        throw new Error('Time service error');
      });

      render(<TrafficIndicator {...defaultProps} isTrafficEnabled />);

      // Should fallback to moderate traffic when time service fails
      expect(screen.getByText('Moderate Traffic')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button.style.getPropertyValue('--traffic-color')).toBe('#FFA726');
    });
  });
});