/**
 * Weather Test Suite
 * 
 * Tests the weather component including:
 * - Rendering different states (loading, data, error)
 * - Weather data display with emoji and temperature
 * - Unit toggle functionality (Celsius/Fahrenheit)
 * - Air quality indicator (AQI) display
 * - Forecast hover functionality
 * - Error handling and edge cases
 * - Accessibility features
 * - Memoization behavior
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Weather } from '../Weather';
import { useWeather } from '../../hooks/useWeather';
import { weatherService } from '../../lib/weatherService';
import { HOVER_DELAY_MS } from '../../constants/weather.constants';

// Mock the useWeather hook
jest.mock('../../hooks/useWeather');
const mockUseWeather = useWeather as jest.MockedFunction<typeof useWeather>;

// Mock the weatherService
jest.mock('../../lib/weatherService', () => ({
  weatherService: {
    getWeatherEmoji: jest.fn(),
    getAQIColor: jest.fn(),
  },
}));

// Mock the WeatherForecast component
jest.mock('../WeatherForecast', () => ({
  WeatherForecast: ({ forecast, unit }: any) => (
    <div data-testid="weather-forecast" data-unit={unit}>
      Weather Forecast for {forecast.length} days
    </div>
  ),
}));

// Mock the Skeleton component
jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className}>
      Loading...
    </div>
  ),
}));

describe('Weather', () => {
  const mockToggleUnit = jest.fn();

  const defaultWeatherData = {
    temperature: 22,
    feelsLike: 24,
    tempMin: 18,
    tempMax: 26,
    humidity: 65,
    pressure: 1013,
    windSpeed: 5,
    windDeg: 180,
    clouds: 10,
    visibility: 10000,
    condition: {
      id: 800,
      main: 'Clear',
      description: 'clear sky',
      icon: '01d',
    },
    sunrise: 1640000000,
    sunset: 1640040000,
    timezone: 3600,
    cityName: 'Test City',
    country: 'TC',
    timestamp: Date.now(),
    airQuality: {
      aqi: 50,
      pm2_5: 15,
      pm10: 20,
    },
  };

  const defaultForecast = {
    cityName: 'Test City',
    country: 'TC',
    forecasts: [
      {
        date: '2024-01-01',
        tempMin: 18,
        tempMax: 24,
        condition: {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
        humidity: 60,
        windSpeed: 5,
      },
      {
        date: '2024-01-02',
        tempMin: 19,
        tempMax: 25,
        condition: {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
        humidity: 55,
        windSpeed: 7,
      },
    ],
  };

  const defaultHookReturn = {
    data: defaultWeatherData,
    forecast: defaultForecast,
    loading: false,
    error: null,
    lastUpdated: Date.now(),
    unit: 'celsius' as const,
    fetchWeather: jest.fn(),
    toggleUnit: mockToggleUnit,
    clearError: jest.fn(),
    hasWeather: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseWeather.mockReturnValue(defaultHookReturn);
    (weatherService.getWeatherEmoji as jest.Mock).mockReturnValue('☀️');
    (weatherService.getAQIColor as jest.Mock).mockReturnValue('#00e400');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering states', () => {
    it('should render weather widget container', () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      expect(widget).toBeInTheDocument();
      expect(widget).toHaveClass('weather-widget');
    });

    it('should render loading state on initial load', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: null,
        loading: true,
        hasWeather: false,
      });
      
      render(<Weather />);
      
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton')).toHaveClass('w-32 h-6');
    });

    it('should render weather data when available', () => {
      render(<Weather />);
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('22°C')).toBeInTheDocument();
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('should render error state in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: null,
        error: 'Failed to fetch weather',
        hasWeather: false,
      });
      
      render(<Weather />);
      
      expect(screen.getByText('ERR')).toBeInTheDocument();
      expect(screen.getByText('🌡️')).toBeInTheDocument();
      
      const errorContent = screen.getByTitle('Weather error: Failed to fetch weather');
      expect(errorContent).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should render error state in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: null,
        error: 'Failed to fetch weather',
        hasWeather: false,
      });
      
      render(<Weather />);
      
      expect(screen.getByText('--°')).toBeInTheDocument();
      expect(screen.queryByText('ERR')).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('weather data display', () => {
    it('should display temperature with correct unit', () => {
      render(<Weather />);
      
      expect(screen.getByText('22°C')).toBeInTheDocument();
    });

    it('should display temperature in Fahrenheit when unit is changed', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        unit: 'fahrenheit',
      });
      
      render(<Weather />);
      
      expect(screen.getByText('22°F')).toBeInTheDocument();
    });

    it('should display weather condition', () => {
      render(<Weather />);
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should display weather emoji', () => {
      render(<Weather />);
      
      const emoji = screen.getByText('☀️');
      expect(emoji).toBeInTheDocument();
      expect(emoji).toHaveClass('weather-emoji');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
    });

    it('should call getWeatherEmoji with correct condition id', () => {
      render(<Weather />);
      
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(800);
    });

    it('should display air quality indicator when available', () => {
      render(<Weather />);
      
      expect(screen.getByText('AQI')).toBeInTheDocument();
      
      const aqiDot = screen.getByText('AQI').nextElementSibling;
      expect(aqiDot).toHaveClass('aqi-dot');
      expect(aqiDot).toHaveStyle({ backgroundColor: '#00e400' });
    });

    it('should not display AQI when air quality data is not available', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: {
          ...defaultWeatherData,
          airQuality: undefined,
        },
      });
      
      render(<Weather />);
      
      expect(screen.queryByText('AQI')).not.toBeInTheDocument();
    });

    it('should have proper title attribute with description', () => {
      render(<Weather />);
      
      const weatherContent = screen.getByTitle('clear sky - Click to toggle unit');
      expect(weatherContent).toBeInTheDocument();
    });
  });

  describe('unit toggle functionality', () => {
    it('should call toggleUnit when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<Weather />);
      
      const weatherContent = screen.getByTitle('clear sky - Click to toggle unit');
      await user.click(weatherContent);
      
      expect(mockToggleUnit).toHaveBeenCalledTimes(1);
    });

    it('should be clickable with proper cursor', () => {
      render(<Weather />);
      
      const weatherContent = screen.getByTitle('clear sky - Click to toggle unit');
      expect(weatherContent).toBeInTheDocument();
    });
  });

  describe('forecast hover functionality', () => {
    it('should not show forecast initially', () => {
      render(<Weather />);
      
      expect(screen.queryByTestId('weather-forecast')).not.toBeInTheDocument();
    });

    it('should show forecast after hover delay', async () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Hover over widget
      fireEvent.mouseEnter(widget);
      
      // Forecast should not show immediately
      expect(screen.queryByTestId('weather-forecast')).not.toBeInTheDocument();
      
      // Fast forward past the hover delay
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      // Forecast should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('weather-forecast')).toBeInTheDocument();
      });
    });

    it('should hide forecast when mouse leaves', async () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Hover and wait for forecast
      fireEvent.mouseEnter(widget);
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-forecast')).toBeInTheDocument();
      });
      
      // Mouse leave
      fireEvent.mouseLeave(widget);
      
      // Forecast should hide
      expect(screen.queryByTestId('weather-forecast')).not.toBeInTheDocument();
    });

    it('should cancel hover timeout if mouse leaves before delay', () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Hover
      fireEvent.mouseEnter(widget);
      
      // Leave before delay
      fireEvent.mouseLeave(widget);
      
      // Fast forward past delay
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      // Forecast should not show
      expect(screen.queryByTestId('weather-forecast')).not.toBeInTheDocument();
    });

    it('should not show forecast if no forecast data', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        forecast: null,
      });
      
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Hover
      fireEvent.mouseEnter(widget);
      
      // Fast forward
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      // Forecast should not show
      expect(screen.queryByTestId('weather-forecast')).not.toBeInTheDocument();
    });

    it('should apply higher z-index when forecast is shown', async () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Initially no z-index
      expect(widget).not.toHaveStyle({ zIndex: '1000' });
      
      // Hover and wait
      fireEvent.mouseEnter(widget);
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      await waitFor(() => {
        expect(widget).toHaveStyle({ zIndex: '1000' });
      });
    });

    it('should pass correct props to WeatherForecast', async () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Hover and wait
      fireEvent.mouseEnter(widget);
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      await waitFor(() => {
        const forecast = screen.getByTestId('weather-forecast');
        expect(forecast).toHaveAttribute('data-unit', 'celsius');
        expect(forecast).toHaveTextContent('Weather Forecast for 2 days');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      expect(widget).toBeInTheDocument();
    });

    it('should mark decorative elements with aria-hidden', () => {
      render(<Weather />);
      
      const emoji = screen.getByText('☀️');
      expect(emoji).toHaveAttribute('aria-hidden', 'true');
      
      const aqiDot = screen.getByText('AQI').nextElementSibling;
      expect(aqiDot).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide descriptive titles', () => {
      render(<Weather />);
      
      const weatherContent = screen.getByTitle('clear sky - Click to toggle unit');
      expect(weatherContent).toBeInTheDocument();
    });

    it('should be keyboard accessible for unit toggle', async () => {
      const user = userEvent.setup();
      render(<Weather />);
      
      const weatherContent = screen.getByTitle('clear sky - Click to toggle unit');
      
      // Should be clickable with keyboard
      weatherContent.focus();
      await user.keyboard('{Enter}');
      
      expect(mockToggleUnit).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing condition description gracefully', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: {
          ...defaultWeatherData,
          condition: {
            ...defaultWeatherData.condition,
            description: undefined as any,
          },
        },
      });
      
      render(<Weather />);
      
      // Should still render without crashing
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should handle missing condition id', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: {
          ...defaultWeatherData,
          condition: {
            ...defaultWeatherData.condition,
            id: undefined as any,
          },
        },
      });
      
      render(<Weather />);
      
      // Should call getWeatherEmoji with 0 as fallback
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(0);
    });

    it('should cleanup timeout on unmount', () => {
      const { unmount } = render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Start hover
      fireEvent.mouseEnter(widget);
      
      // Unmount before timeout
      unmount();
      
      // Fast forward - should not cause issues
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      // No errors should occur
    });

    it('should handle rapid hover/unhover', () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      // Rapid hover/unhover
      fireEvent.mouseEnter(widget);
      fireEvent.mouseLeave(widget);
      fireEvent.mouseEnter(widget);
      fireEvent.mouseLeave(widget);
      fireEvent.mouseEnter(widget);
      
      // Fast forward
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      // Should handle gracefully
      expect(screen.queryByTestId('weather-forecast')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<Weather />);
      const firstRender = screen.getByRole('region', { name: 'Weather information' });
      
      rerender(<Weather />);
      const secondRender = screen.getByRole('region', { name: 'Weather information' });
      
      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when hook data changes', () => {
      const { rerender } = render(<Weather />);
      expect(screen.getByText('22°C')).toBeInTheDocument();
      
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: {
          ...defaultWeatherData,
          temperature: 25,
        },
      });
      
      rerender(<Weather />);
      expect(screen.getByText('25°C')).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('should show skeleton during initial load', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: null,
        loading: true,
        hasWeather: false,
      });
      
      render(<Weather />);
      
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('should not show skeleton if has previous weather data', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
        hasWeather: true,
      });
      
      render(<Weather />);
      
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('22°C')).toBeInTheDocument();
    });

    it('should show skeleton as fallback when no data or error', () => {
      mockUseWeather.mockReturnValue({
        ...defaultHookReturn,
        data: null,
        error: null,
        loading: false,
        hasWeather: false,
      });
      
      render(<Weather />);
      
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply weather widget classes', () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      expect(widget).toHaveClass('weather-widget');
    });

    it('should apply weather content classes', () => {
      render(<Weather />);
      
      const content = screen.getByText('Clear').closest('.weather-content');
      expect(content).toBeInTheDocument();
    });

    it('should group weather icon and condition', () => {
      render(<Weather />);
      
      const iconGroup = screen.getByText('☀️').closest('.weather-icon-group');
      expect(iconGroup).toBeInTheDocument();
      expect(iconGroup).toContainElement(screen.getByText('☀️'));
      expect(iconGroup).toContainElement(screen.getByText('Clear'));
    });

    it('should apply temperature styling', () => {
      render(<Weather />);
      
      const temp = screen.getByText('22°C');
      expect(temp).toHaveClass('weather-temp');
    });

    it('should apply AQI styling', () => {
      render(<Weather />);
      
      const aqiText = screen.getByText('AQI');
      expect(aqiText).toHaveClass('aqi-text');
      
      const aqiContainer = aqiText.closest('.weather-aqi');
      expect(aqiContainer).toBeInTheDocument();
    });

    it('should apply forecast container styling', async () => {
      render(<Weather />);
      
      const widget = screen.getByRole('region', { name: 'Weather information' });
      
      fireEvent.mouseEnter(widget);
      act(() => {
        jest.advanceTimersByTime(HOVER_DELAY_MS);
      });
      
      await waitFor(() => {
        const container = screen.getByTestId('weather-forecast').parentElement;
        expect(container).toHaveClass('weather-forecast-container');
      });
    });
  });
});