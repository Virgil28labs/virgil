/**
 * RouteInfoBar Test Suite
 * 
 * Tests the route information bar component including:
 * - Route information display
 * - Traffic severity calculation
 * - Duration formatting
 * - Alternative routes
 * - Departure time integration
 * - Expand/collapse functionality
 * - Traffic color coding
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteInfoBar } from '../RouteInfoBar';

// Mock DepartureTimeSelector
jest.mock('../DepartureTimeSelector', () => ({
  DepartureTimeSelector: ({ selectedTime, onTimeChange, isCompact }: unknown) => (
    <div data-testid="departure-time-selector">
      <span data-testid="selected-time">{selectedTime.toString()}</span>
      <span data-testid="is-compact">{isCompact.toString()}</span>
      <button onClick={() => onTimeChange(new Date('2024-01-15T15:30:00'))}>
        Change Time
      </button>
    </div>
  ),
}));

describe('RouteInfoBar', () => {
  const mockOnRouteSelect = jest.fn();
  const mockOnToggleExpand = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnDepartureTimeChange = jest.fn();

  const createMockLatLng = (lat: number, lng: number) => ({
    lat: () => lat,
    lng: () => lng,
  } as google.maps.LatLng);

  const createMockRoute = (
    summary: string = 'US-101 N',
    duration: number = 1800, // 30 minutes
    durationInTraffic?: number,
    distance: string = '15.2 mi',
  ): google.maps.DirectionsRoute => ({
    legs: [{
      duration: { value: duration, text: `${Math.round(duration / 60)} min` },
      duration_in_traffic: durationInTraffic ? {
        value: durationInTraffic,
        text: `${Math.round(durationInTraffic / 60)} min`,
      } : undefined,
      distance: { value: 24460, text: distance },
      start_address: 'Start Address',
      end_address: 'End Address',
      start_location: createMockLatLng(37.7749, -122.4194),
      end_location: createMockLatLng(37.7849, -122.4094),
      steps: [],
      traffic_speed_entry: [],
      via_waypoints: [],
    }],
    summary,
    copyrights: '',
    fare: undefined,
    overview_path: [],
    overview_polyline: '',
    warnings: [],
    waypoint_order: [],
    bounds: { extend: jest.fn() } as unknown,
  });

  const defaultProps = {
    route: createMockRoute(),
    onRouteSelect: mockOnRouteSelect,
    onToggleExpand: mockOnToggleExpand,
    onClose: mockOnClose,
    onDepartureTimeChange: mockOnDepartureTimeChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when route is provided', () => {
      render(<RouteInfoBar {...defaultProps} />);

      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('15.2 mi')).toBeInTheDocument();
      expect(screen.getByText('via US-101 N')).toBeInTheDocument();
    });

    it('should not render when route is null', () => {
      const { container } = render(<RouteInfoBar {...defaultProps} route={null} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when route has no legs', () => {
      const routeWithoutLegs = { ...createMockRoute(), legs: [] };
      const { container } = render(<RouteInfoBar {...defaultProps} route={routeWithoutLegs} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render in expanded state by default', () => {
      const { container } = render(<RouteInfoBar {...defaultProps} />);

      expect(container?.querySelector('.route-info-bar')).toHaveClass('expanded');
      expect(screen.getByText('Light traffic')).toBeInTheDocument();
    });

    it('should render in collapsed state when specified', () => {
      const { container } = render(<RouteInfoBar {...defaultProps} isExpanded={false} />);

      expect(container?.querySelector('.route-info-bar')).toHaveClass('collapsed');
      expect(screen.queryByText('Light traffic')).not.toBeInTheDocument();
    });

    it('should render departure time selector when callback provided', () => {
      render(<RouteInfoBar {...defaultProps} />);

      expect(screen.getByTestId('departure-time-selector')).toBeInTheDocument();
      expect(screen.getByTestId('selected-time')).toHaveTextContent('now');
      expect(screen.getByTestId('is-compact')).toHaveTextContent('false');
    });

    it('should not render departure time selector when callback not provided', () => {
      render(<RouteInfoBar {...defaultProps} onDepartureTimeChange={undefined} />);

      expect(screen.queryByTestId('departure-time-selector')).not.toBeInTheDocument();
    });

    it('should render traffic light icon', () => {
      const { container } = render(<RouteInfoBar {...defaultProps} />);

      const trafficIcon = container?.querySelector('.traffic-icon svg');
      expect(trafficIcon).toBeInTheDocument();
      
      // Should have 3 traffic light rectangles
      const rects = trafficIcon?.querySelectorAll('rect');
      expect(rects).toHaveLength(3);
    });
  });

  describe('duration formatting', () => {
    it('should format minutes correctly', () => {
      const route = createMockRoute('US-101 N', 900); // 15 minutes
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('15 min')).toBeInTheDocument();
    });

    it('should format hours and minutes correctly', () => {
      const route = createMockRoute('US-101 N', 5400); // 90 minutes = 1 hr 30 min
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('1 hr 30 min')).toBeInTheDocument();
    });

    it('should handle zero minutes', () => {
      const route = createMockRoute('US-101 N', 1800); // 30 minutes
      route.legs[0].duration = { value: 0, text: '0 min' };
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('0 min')).toBeInTheDocument();
    });

    it('should show fallback when duration is missing', () => {
      const route = createMockRoute('US-101 N', 1800);
      route.legs[0].duration = undefined as unknown;
      route.legs[0].duration_in_traffic = undefined;
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('traffic severity calculation', () => {
    it('should detect light traffic (ratio <= 1.2)', () => {
      const route = createMockRoute('US-101 N', 1800, 2000); // 1.11 ratio
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('Light traffic')).toBeInTheDocument();
      
      const timeValue = screen.getByText('33 min');
      expect(timeValue).toHaveStyle({ color: '#34A853' }); // Green
    });

    it('should detect moderate traffic (1.2 < ratio <= 1.5)', () => {
      const route = createMockRoute('US-101 N', 1800, 2400); // 1.33 ratio
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('Moderate traffic')).toBeInTheDocument();
      
      const timeValue = screen.getByText('40 min');
      expect(timeValue).toHaveStyle({ color: '#FBBC04' }); // Yellow
    });

    it('should detect heavy traffic (ratio > 1.5)', () => {
      const route = createMockRoute('US-101 N', 1800, 3000); // 1.67 ratio
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('Heavy traffic')).toBeInTheDocument();
      
      const timeValue = screen.getByText('50 min');
      expect(timeValue).toHaveStyle({ color: '#EA4335' }); // Red
    });

    it('should default to normal when traffic data unavailable', () => {
      const route = createMockRoute('US-101 N', 1800); // No traffic data
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('Light traffic')).toBeInTheDocument();
      
      const timeValue = screen.getByText('30 min');
      expect(timeValue).toHaveStyle({ color: '#4285F4' }); // Blue (normal)
    });

    it('should show traffic comparison in expanded mode', () => {
      const route = createMockRoute('US-101 N', 1800, 2400); // Traffic delay
      render(<RouteInfoBar {...defaultProps} route={route} isExpanded />);

      expect(screen.getByText('40 min')).toBeInTheDocument();
      expect(screen.getByText('(typically 30 min)')).toBeInTheDocument();
    });

    it('should not show traffic comparison in collapsed mode', () => {
      const route = createMockRoute('US-101 N', 1800, 2400);
      render(<RouteInfoBar {...defaultProps} route={route} isExpanded={false} />);

      expect(screen.getByText('40 min')).toBeInTheDocument();
      expect(screen.queryByText('(typically 30 min)')).not.toBeInTheDocument();
    });
  });

  describe('alternative routes', () => {
    const alternativeRoutes = [
      createMockRoute('I-280 S', 2100, 2300, '16.8 mi'),
      createMockRoute('CA-1 S', 2700, 3000, '18.5 mi'),
    ];

    it('should render alternative routes when expanded', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={alternativeRoutes}
          isExpanded 
        />,
      );

      expect(screen.getByText('Routes')).toBeInTheDocument();
      expect(screen.getByText('US-101 N')).toBeInTheDocument();
      expect(screen.getByText('I-280 S')).toBeInTheDocument();
      expect(screen.getByText('CA-1 S')).toBeInTheDocument();
    });

    it('should not render alternative routes when collapsed', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={alternativeRoutes}
          isExpanded={false} 
        />,
      );

      expect(screen.queryByText('Routes')).not.toBeInTheDocument();
    });

    it('should limit to 3 routes maximum', () => {
      const manyRoutes = [
        createMockRoute('Route 2'),
        createMockRoute('Route 3'),
        createMockRoute('Route 4'),
        createMockRoute('Route 5'),
      ];

      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={manyRoutes}
          isExpanded 
        />,
      );

      // Should show main route + first 2 alternatives = 3 total
      expect(screen.getByText('US-101 N')).toBeInTheDocument();
      expect(screen.getByText('Route 2')).toBeInTheDocument();
      expect(screen.getByText('Route 3')).toBeInTheDocument();
      expect(screen.queryByText('Route 4')).not.toBeInTheDocument();
    });

    it('should mark first route as fastest', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={alternativeRoutes}
          isExpanded 
        />,
      );

      expect(screen.getByText('Fastest')).toBeInTheDocument();
    });

    it('should highlight selected route', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={alternativeRoutes}
          selectedRouteIndex={1}
          isExpanded 
        />,
      );

      const routeOptions = screen.getAllByRole('button').filter(btn => 
        btn.classList.contains('route-option'),
      );
      expect(routeOptions[0]).not.toHaveClass('selected');
      expect(routeOptions[1]).toHaveClass('selected');
    });

    it('should call onRouteSelect when route is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={alternativeRoutes}
          isExpanded 
        />,
      );

      const routeButton = screen.getByText('I-280 S').closest('button');
      await user.click(routeButton);

      expect(mockOnRouteSelect).toHaveBeenCalledWith(1);
    });
  });

  describe('control buttons', () => {
    it('should render expand/collapse button when callback provided and alternatives exist', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      expect(screen.getByTitle('Collapse')).toBeInTheDocument();
    });

    it('should not render expand/collapse button without alternatives', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[]}
          onToggleExpand={mockOnToggleExpand}
        />,
      );

      expect(screen.queryByTitle('Collapse')).not.toBeInTheDocument();
    });

    it('should show correct expand/collapse icon', () => {
      const { rerender } = render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
          isExpanded
        />,
      );

      expect(screen.getByTitle('Collapse')).toBeInTheDocument();

      rerender(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
          isExpanded={false}
        />,
      );

      expect(screen.getByTitle('Expand')).toBeInTheDocument();
    });

    it('should call onToggleExpand when expand/collapse button clicked', async () => {
      const user = userEvent.setup();
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
        />,
      );

      await user.click(screen.getByTitle('Collapse'));

      expect(mockOnToggleExpand).toHaveBeenCalled();
    });

    it('should render close button when callback provided', () => {
      render(<RouteInfoBar {...defaultProps} />);

      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('should not render close button when callback not provided', () => {
      render(<RouteInfoBar {...defaultProps} onClose={undefined} />);

      expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(<RouteInfoBar {...defaultProps} />);

      await user.click(screen.getByTitle('Close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('departure time integration', () => {
    it('should pass correct props to DepartureTimeSelector', () => {
      const departureTime = new Date('2024-01-15T15:30:00');
      render(
        <RouteInfoBar 
          {...defaultProps} 
          departureTime={departureTime}
          isExpanded={false}
        />,
      );

      expect(screen.getByTestId('selected-time')).toHaveTextContent(departureTime.toString());
      expect(screen.getByTestId('is-compact')).toHaveTextContent('true');
    });

    it('should call onDepartureTimeChange when time is changed', async () => {
      const user = userEvent.setup();
      render(<RouteInfoBar {...defaultProps} />);

      await user.click(screen.getByText('Change Time'));

      expect(mockOnDepartureTimeChange).toHaveBeenCalledWith(new Date('2024-01-15T15:30:00'));
    });

    it('should default to "now" when departureTime not specified', () => {
      render(<RouteInfoBar {...defaultProps} />);

      expect(screen.getByTestId('selected-time')).toHaveTextContent('now');
    });
  });

  describe('accessibility', () => {
    it('should have proper button roles for route options', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
          isExpanded 
        />,
      );

      const routeButtons = screen.getAllByRole('button').filter(btn => 
        btn.classList.contains('route-option'),
      );
      expect(routeButtons).toHaveLength(2); // Main + 1 alternative
    });

    it('should have proper titles for control buttons', () => {
      render(
        <RouteInfoBar 
          {...defaultProps} 
          alternativeRoutes={[createMockRoute('Alt Route')]}
        />,
      );

      expect(screen.getByTitle('Collapse')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing distance gracefully', () => {
      const route = createMockRoute();
      route.legs[0].distance = undefined as unknown;
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('should handle routes without summary', () => {
      const route = createMockRoute();
      route.summary = '';
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('via')).toBeInTheDocument();
    });

    it('should handle zero traffic ratio', () => {
      const route = createMockRoute('US-101 N', 1800, 0);
      render(<RouteInfoBar {...defaultProps} route={route} />);

      // Should not crash and should show fallback
      expect(screen.getByText('Light traffic')).toBeInTheDocument();
    });

    it('should handle negative duration', () => {
      const route = createMockRoute('US-101 N', -600);
      render(<RouteInfoBar {...defaultProps} route={route} />);

      expect(screen.getByText('-10 min')).toBeInTheDocument();
    });
  });

  describe('traffic icon states', () => {
    it('should highlight correct traffic light segment for light traffic', () => {
      const route = createMockRoute('US-101 N', 1800, 2000); // Light traffic
      const { container } = render(<RouteInfoBar {...defaultProps} route={route} />);

      const trafficIcon = container?.querySelector('.traffic-icon.light');
      expect(trafficIcon).toBeInTheDocument();
    });

    it('should highlight correct traffic light segment for moderate traffic', () => {
      const route = createMockRoute('US-101 N', 1800, 2400); // Moderate traffic
      const { container } = render(<RouteInfoBar {...defaultProps} route={route} />);

      const trafficIcon = container?.querySelector('.traffic-icon.moderate');
      expect(trafficIcon).toBeInTheDocument();
    });

    it('should highlight correct traffic light segment for heavy traffic', () => {
      const route = createMockRoute('US-101 N', 1800, 3000); // Heavy traffic
      const { container } = render(<RouteInfoBar {...defaultProps} route={route} />);

      const trafficIcon = container?.querySelector('.traffic-icon.heavy');
      expect(trafficIcon).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<RouteInfoBar {...defaultProps} />);
      const firstRender = screen.getByText('30 min');

      rerender(<RouteInfoBar {...defaultProps} />);
      const secondRender = screen.getByText('30 min');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<RouteInfoBar {...defaultProps} />);
      expect(screen.getByText('30 min')).toBeInTheDocument();

      const newRoute = createMockRoute('I-280 S', 3600); // 60 minutes
      rerender(<RouteInfoBar {...defaultProps} route={newRoute} />);

      expect(screen.getByText('1 hr 0 min')).toBeInTheDocument();
    });
  });
});