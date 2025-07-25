import { render, screen } from '@testing-library/react';
import { Weather } from './Weather';
import { useWeather } from '../contexts/WeatherContext';
import { timeService } from '../services/TimeService';

// Mock the weather context and service
jest.mock('../contexts/WeatherContext');
jest.mock('../lib/weatherService');

describe('Weather', () => {
  const mockUseWeather = useWeather as jest.MockedFunction<typeof useWeather>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseWeather.mockReturnValue({
      data: null,
      forecast: null,
      loading: true,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<Weather />);
    
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state', () => {
    mockUseWeather.mockReturnValue({
      data: null,
      forecast: null,
      loading: false,
      error: 'Failed to fetch weather data',
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<Weather />);
    
    // It shows '--°' in test environment
    expect(screen.getByText('--°')).toBeInTheDocument();
    // Should also show the error emoji
    expect(screen.getByText('🌡️')).toBeInTheDocument();
  });

  it('renders weather data correctly', () => {
    const mockWeatherData = {
      temperature: 72,
      feelsLike: 70,
      tempMin: 68,
      tempMax: 76,
      humidity: 45,
      pressure: 1013,
      windSpeed: 8,
      windDeg: 180,
      clouds: 20,
      visibility: 10000,
      condition: {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
      sunrise: 1643000000,
      sunset: 1643040000,
      timezone: -28800,
      cityName: 'New York, NY',
      country: 'US',
      timestamp: timeService.getTimestamp(),
    };

    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      forecast: null,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: timeService.getTimestamp(),
    });

    render(<Weather />);
    
    // Check temperature
    expect(screen.getByText('72°F')).toBeInTheDocument();
    
    // Check condition
    expect(screen.getByText('Clear')).toBeInTheDocument();
    
    // Check weather emoji
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('renders without weather data', () => {
    mockUseWeather.mockReturnValue({
      data: null,
      forecast: null,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    const { container } = render(<Weather />);
    
    // When there's no data and no error, the widget shows a skeleton loader
    const weatherContent = container.querySelector('.weather-content');
    expect(weatherContent).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('has proper structure and accessibility', () => {
    const mockWeatherData = {
      temperature: 72,
      feelsLike: 70,
      tempMin: 68,
      tempMax: 76,
      humidity: 60,
      pressure: 1013,
      windSpeed: 12,
      windDeg: 180,
      clouds: 40,
      visibility: 10000,
      condition: {
        id: 802,
        main: 'Clouds',
        description: 'scattered clouds',
        icon: '02d',
      },
      sunrise: 1643000000,
      sunset: 1643040000,
      timezone: -28800,
      cityName: 'San Francisco, CA',
      country: 'US',
      timestamp: timeService.getTimestamp(),
    };

    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      forecast: null,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: timeService.getTimestamp(),
    });

    const { container } = render(<Weather />);
    
    // Check structure
    expect(container.querySelector('.weather-widget')).toBeInTheDocument();
    expect(container.querySelector('.weather-content')).toBeInTheDocument();
    
    // Check accessibility
    const weatherWidget = container.querySelector('.weather-widget');
    expect(weatherWidget).toHaveAttribute('role', 'region');
    expect(weatherWidget).toHaveAttribute('aria-label', 'Weather information');
  });

  it('renders weather emoji correctly', () => {
    const mockWeatherData = {
      temperature: 65,
      feelsLike: 63,
      tempMin: 61,
      tempMax: 68,
      humidity: 80,
      pressure: 1010,
      windSpeed: 15,
      windDeg: 270,
      clouds: 90,
      visibility: 8000,
      condition: {
        id: 501,  // Rain
        main: 'Rain',
        description: 'moderate rain',
        icon: '10d',
      },
      sunrise: 1643000000,
      sunset: 1643040000,
      timezone: -28800,
      cityName: 'Seattle, WA',
      country: 'US',
      timestamp: timeService.getTimestamp(),
    };

    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      forecast: null,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: timeService.getTimestamp(),
    });

    render(<Weather />);
    
    // Check that weather emoji is rendered (Rain emoji should be 🌧️)
    expect(screen.getByText('🌧️')).toBeInTheDocument();
  });

  it('handles missing location gracefully', () => {
    const mockWeatherData = {
      temperature: 68,
      feelsLike: 66,
      tempMin: 64,
      tempMax: 72,
      humidity: 50,
      pressure: 1015,
      windSpeed: 5,
      windDeg: 90,
      clouds: 0,
      visibility: 10000,
      condition: {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01n',
      },
      sunrise: 1643000000,
      sunset: 1643040000,
      timezone: -28800,
      cityName: '',  // Empty location
      country: 'US',
      timestamp: timeService.getTimestamp(),
    };

    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      forecast: null,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: timeService.getTimestamp(),
    });

    render(<Weather />);
    
    // Should still render temperature and condition
    expect(screen.getByText('68°F')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});