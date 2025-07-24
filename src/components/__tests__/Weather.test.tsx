import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Weather } from '../Weather';
import { useWeather } from '../../contexts/WeatherContext';
import { weatherService } from '../../lib/weatherService';

// Mock dependencies
jest.mock('../../contexts/WeatherContext');
jest.mock('../../lib/weatherService');
jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));
jest.mock('../WeatherForecast', () => ({
  WeatherForecast: ({ forecast, unit }: any) => (
    <div data-testid="forecast">
      Forecast for {forecast.length} days in {unit}
    </div>
  ),
}));

describe('Weather', () => {
  const mockWeatherData = {
    temperature: 72,
    condition: {
      id: 800,
      main: 'Clear',
      description: 'clear sky',
    },
  };

  const mockForecast = [
    { date: '2024-01-01', temp: 70 },
    { date: '2024-01-02', temp: 75 },
  ];

  const mockToggleUnit = jest.fn();

  const defaultMockWeather = {
    data: mockWeatherData,
    forecast: mockForecast,
    loading: false,
    error: null,
    unit: 'fahrenheit' as const,
    toggleUnit: mockToggleUnit,
    hasWeather: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (weatherService.getWeatherEmoji as jest.Mock).mockReturnValue('☀️');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders weather data correctly', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    expect(screen.getByText('72°F')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(800);
  });

  it('renders in celsius when unit is celsius', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      unit: 'celsius',
    });
    
    render(<Weather />);
    
    expect(screen.getByText('72°C')).toBeInTheDocument();
  });

  it('toggles unit when clicked', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherContent = screen.getByText('72°F').parentElement?.parentElement;
    fireEvent.click(weatherContent!);
    
    expect(mockToggleUnit).toHaveBeenCalled();
  });

  it('shows loading state on initial load', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      data: null,
      loading: true,
      hasWeather: false,
    });
    
    render(<Weather />);
    
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows error state when error occurs', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      data: null,
      error: 'Failed to fetch weather',
      hasWeather: false,
    });
    
    render(<Weather />);
    
    expect(screen.getByText('🌡️')).toBeInTheDocument();
    
    // In development, shows 'ERR'
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const { rerender } = render(<Weather />);
    expect(screen.getByText('ERR')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('shows forecast on hover after delay', async () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    
    fireEvent.mouseEnter(weatherWidget);
    
    // Forecast should not be visible immediately
    expect(screen.queryByTestId('forecast')).not.toBeInTheDocument();
    
    // Fast-forward 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Now forecast should be visible
    await waitFor(() => {
      expect(screen.getByTestId('forecast')).toBeInTheDocument();
      expect(screen.getByText('Forecast for 2 days in fahrenheit')).toBeInTheDocument();
    });
  });

  it('hides forecast on mouse leave', async () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    
    // Show forecast
    fireEvent.mouseEnter(weatherWidget);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('forecast')).toBeInTheDocument();
    });
    
    // Hide forecast
    fireEvent.mouseLeave(weatherWidget);
    
    expect(screen.queryByTestId('forecast')).not.toBeInTheDocument();
  });

  it('cancels hover timeout on quick mouse leave', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    
    fireEvent.mouseEnter(weatherWidget);
    
    // Leave before timeout completes
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    fireEvent.mouseLeave(weatherWidget);
    
    // Complete the timeout
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Forecast should never appear
    expect(screen.queryByTestId('forecast')).not.toBeInTheDocument();
  });

  it('does not show forecast if no forecast data', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      forecast: null,
    });
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    
    fireEvent.mouseEnter(weatherWidget);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(screen.queryByTestId('forecast')).not.toBeInTheDocument();
  });

  it('cleans up timeout on unmount', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    fireEvent.mouseEnter(weatherWidget);
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    expect(weatherWidget).toBeInTheDocument();
    
    const emoji = screen.getByText('☀️');
    expect(emoji).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows loading when data exists but is updating', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      loading: true,
      hasWeather: true,
    });
    
    render(<Weather />);
    
    // Should show existing data, not skeleton
    expect(screen.getByText('72°F')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });

  it('handles missing condition id gracefully', () => {
    (useWeather as jest.Mock).mockReturnValue({
      ...defaultMockWeather,
      data: {
        ...mockWeatherData,
        condition: {
          ...mockWeatherData.condition,
          id: undefined,
        },
      },
    });
    
    render(<Weather />);
    
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(0);
  });

  it('applies expanded class when showing forecast', async () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherWidget = screen.getByRole('region', { name: 'Weather information' });
    
    expect(weatherWidget).not.toHaveClass('weather-widget-expanded');
    
    fireEvent.mouseEnter(weatherWidget);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    await waitFor(() => {
      expect(weatherWidget).toHaveClass('weather-widget-expanded');
    });
  });

  it('shows proper title with weather description', () => {
    (useWeather as jest.Mock).mockReturnValue(defaultMockWeather);
    
    render(<Weather />);
    
    const weatherContent = screen.getByText('72°F').parentElement?.parentElement;
    expect(weatherContent).toHaveAttribute('title', 'clear sky - Click to toggle unit');
  });
});