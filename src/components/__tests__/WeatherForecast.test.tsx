/**
 * WeatherForecast Test Suite
 * 
 * Tests the weather forecast component including:
 * - Rendering forecast data for multiple days
 * - Date formatting with day abbreviations
 * - Temperature display in Celsius/Fahrenheit
 * - Weather emoji display with fallbacks
 * - Weather condition text
 * - City name display
 * - Forecast layout and styling
 * - Memoization behavior
 * - Edge cases and error handling
 */

import { render, screen } from '@testing-library/react';
import { WeatherForecast } from '../WeatherForecast';
import { weatherService } from '../../lib/weatherService';
import { timeService } from '../../services/TimeService';
import type { ForecastData } from '../../types/weather.types';

// Mock the weatherService
jest.mock('../../lib/weatherService', () => ({
  weatherService: {
    getWeatherEmoji: jest.fn(),
  },
}));

// Mock the timeService
jest.mock('../../services/TimeService', () => ({
  timeService: {
    createDate: jest.fn(),
    formatDateToLocal: jest.fn(),
  },
}));

describe('WeatherForecast', () => {
  const mockForecastData: ForecastData = {
    cityName: 'New York',
    country: 'US',
    forecasts: [
      {
        date: '2024-01-01',
        tempMax: 25,
        tempMin: 18,
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
        tempMax: 22,
        tempMin: 15,
        condition: {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
        humidity: 65,
        windSpeed: 7,
      },
      {
        date: '2024-01-03',
        tempMax: 20,
        tempMin: 12,
        condition: {
          id: 500,
          main: 'Rain',
          description: 'light rain',
          icon: '10d',
        },
        humidity: 80,
        windSpeed: 10,
      },
      {
        date: '2024-01-04',
        tempMax: 23,
        tempMin: 16,
        condition: {
          id: 802,
          main: 'Clouds',
          description: 'scattered clouds',
          icon: '03d',
        },
        humidity: 70,
        windSpeed: 6,
      },
      {
        date: '2024-01-05',
        tempMax: 26,
        tempMin: 19,
        condition: {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
        humidity: 55,
        windSpeed: 4,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock timeService implementations
    (timeService.createDate as jest.Mock).mockImplementation((year, month, day) => 
      new Date(year, month, day),
    );
    
    (timeService.formatDateToLocal as jest.Mock).mockImplementation((date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    });
    
    // Mock weather emoji service
    (weatherService.getWeatherEmoji as jest.Mock).mockImplementation((id) => {
      const emojiMap: Record<number, string> = {
        800: '☀️',
        801: '⛅',
        802: '☁️',
        500: '🌧️',
      };
      return emojiMap[id] || '🌤️';
    });
  });

  describe('rendering', () => {
    it('should render forecast container', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const forecastContainer = screen.getByText('5-Day Forecast').closest('.weather-forecast');
      expect(forecastContainer).toBeInTheDocument();
    });

    it('should render forecast header with title', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      expect(screen.getByText('5-Day Forecast')).toBeInTheDocument();
      expect(screen.getByText('5-Day Forecast')).toHaveClass('forecast-title');
    });

    it('should render city name', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('New York')).toHaveClass('forecast-location');
    });

    it('should render all 5 forecast days', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const forecastDays = screen.getAllByText(/°C/).length / 2; // Each day has max and min temp
      expect(forecastDays).toBe(5);
    });
  });

  describe('date formatting', () => {
    it('should format dates as uppercase 3-letter day abbreviations', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      // Verify timeService was called with correct date parts
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 1); // January is month 0
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 2);
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 3);
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 4);
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 5);
      
      // Verify formatDateToLocal was called with weekday option
      expect(timeService.formatDateToLocal).toHaveBeenCalledWith(
        expect.any(Date),
        { weekday: 'short' },
      );
    });

    it('should display uppercase day names', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const dayNames = screen.getAllByText(/MON|TUE|WED|THU|FRI|SAT|SUN/);
      expect(dayNames.length).toBeGreaterThan(0);
      
      dayNames.forEach(dayName => {
        expect(dayName).toHaveClass('forecast-day-name');
        expect(dayName.textContent).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should handle different date formats correctly', () => {
      const customForecast = {
        ...mockForecastData,
        forecasts: [{
          ...mockForecastData.forecasts[0],
          date: '2024-12-31', // Test year boundary
        }],
      };
      
      render(<WeatherForecast forecast={customForecast} unit="celsius" />);
      
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 11, 31); // December is month 11
    });
  });

  describe('temperature display', () => {
    it('should display temperatures in Celsius', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      // Check first day temperatures
      expect(screen.getByText('25°C')).toBeInTheDocument();
      expect(screen.getByText('18°C')).toBeInTheDocument();
      
      // Verify temperature classes
      const highTemps = screen.getAllByText(/\d+°C/).filter(el => 
        el.classList.contains('forecast-temp-high'),
      );
      const lowTemps = screen.getAllByText(/\d+°C/).filter(el => 
        el.classList.contains('forecast-temp-low'),
      );
      
      expect(highTemps).toHaveLength(5);
      expect(lowTemps).toHaveLength(5);
    });

    it('should display temperatures in Fahrenheit', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="fahrenheit" />);
      
      // Check first day temperatures
      expect(screen.getByText('25°F')).toBeInTheDocument();
      expect(screen.getByText('18°F')).toBeInTheDocument();
      
      // Verify all temperatures show F
      const allTemps = screen.getAllByText(/\d+°F/);
      expect(allTemps).toHaveLength(10); // 5 days × 2 temps
    });

    it('should apply correct styling to high and low temps', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const highTemp = screen.getByText('25°C');
      const lowTemp = screen.getByText('18°C');
      
      expect(highTemp).toHaveClass('forecast-temp-high');
      expect(lowTemp).toHaveClass('forecast-temp-low');
    });
  });

  describe('weather emoji display', () => {
    it('should display correct weather emojis', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      expect(screen.getByText('☀️')).toBeInTheDocument();
      expect(screen.getByText('⛅')).toBeInTheDocument();
      expect(screen.getByText('☁️')).toBeInTheDocument();
      expect(screen.getByText('🌧️')).toBeInTheDocument();
    });

    it('should call weatherService.getWeatherEmoji with correct IDs', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(800);
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(801);
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(802);
      expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(500);
    });

    it('should display fallback emoji when condition ID is missing', () => {
      const forecastWithMissingId = {
        ...mockForecastData,
        forecasts: [{
          ...mockForecastData.forecasts[0],
          condition: {
            ...mockForecastData.forecasts[0].condition,
            id: undefined,
          },
        }],
      };
      
      render(<WeatherForecast forecast={forecastWithMissingId} unit="celsius" />);
      
      // Should return fallback emoji
      expect(screen.getByText('🌤️')).toBeInTheDocument();
    });

    it('should render emojis in forecast-icon containers', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const emojiContainers = screen.getAllByText(/☀️|⛅|☁️|🌧️/).map(
        emoji => emoji.parentElement,
      );
      
      emojiContainers.forEach(container => {
        expect(container).toHaveClass('forecast-icon');
      });
    });
  });

  describe('weather condition display', () => {
    it('should display weather condition text', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getAllByText('Clouds')).toHaveLength(2);
      expect(screen.getByText('Rain')).toBeInTheDocument();
    });

    it('should apply forecast-condition class', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const conditions = screen.getAllByText(/Clear|Clouds|Rain/);
      conditions.forEach(condition => {
        expect(condition).toHaveClass('forecast-condition');
      });
    });
  });

  describe('layout and structure', () => {
    it('should render forecast days in a container', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const daysContainer = screen.getByText('MON').closest('.forecast-days');
      expect(daysContainer).toBeInTheDocument();
      expect(daysContainer?.children).toHaveLength(5);
    });

    it('should structure each day with correct elements', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const firstDay = screen.getByText('MON').closest('.forecast-day');
      expect(firstDay).toBeInTheDocument();
      
      // Should contain all required elements
      expect(firstDay).toContainElement(screen.getByText('MON')); // Day name
      expect(firstDay).toContainElement(screen.getByText('☀️')); // Emoji
      expect(firstDay).toContainElement(screen.getByText('25°C')); // High temp
      expect(firstDay).toContainElement(screen.getByText('18°C')); // Low temp
      expect(firstDay).toContainElement(screen.getByText('Clear')); // Condition
    });

    it('should group temperatures together', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const tempContainers = screen.getAllByText(/\d+°C/).map(
        temp => temp.parentElement,
      );
      
      const uniqueContainers = Array.from(new Set(tempContainers));
      expect(uniqueContainers.length).toBe(5); // One container per day
      
      uniqueContainers.forEach(container => {
        expect(container).toHaveClass('forecast-temps');
      });
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(
        <WeatherForecast forecast={mockForecastData} unit="celsius" />,
      );
      
      const firstRender = screen.getByText('5-Day Forecast');
      
      rerender(
        <WeatherForecast forecast={mockForecastData} unit="celsius" />,
      );
      
      const secondRender = screen.getByText('5-Day Forecast');
      
      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(
        <WeatherForecast forecast={mockForecastData} unit="celsius" />,
      );
      
      expect(screen.getByText('25°C')).toBeInTheDocument();
      
      rerender(
        <WeatherForecast forecast={mockForecastData} unit="fahrenheit" />,
      );
      
      expect(screen.queryByText('25°C')).not.toBeInTheDocument();
      expect(screen.getByText('25°F')).toBeInTheDocument();
    });

    it('should re-render when forecast data changes', () => {
      const { rerender } = render(
        <WeatherForecast forecast={mockForecastData} unit="celsius" />,
      );
      
      expect(screen.getByText('New York')).toBeInTheDocument();
      
      const updatedForecast = {
        ...mockForecastData,
        cityName: 'Los Angeles',
      };
      
      rerender(
        <WeatherForecast forecast={updatedForecast} unit="celsius" />,
      );
      
      expect(screen.queryByText('New York')).not.toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty forecast array', () => {
      const emptyForecast: ForecastData = {
        cityName: 'New York',
        country: 'US',
        forecasts: [],
      };
      
      render(<WeatherForecast forecast={emptyForecast} unit="celsius" />);
      
      expect(screen.getByText('5-Day Forecast')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
      
      // No forecast days should be rendered
      const daysContainer = screen.getByText('5-Day Forecast')
        .closest('.weather-forecast')
        ?.querySelector('.forecast-days');
      expect(daysContainer?.children).toHaveLength(0);
    });

    it('should handle fewer than 5 days', () => {
      const shortForecast: ForecastData = {
        cityName: 'New York',
        country: 'US',
        forecasts: mockForecastData.forecasts.slice(0, 3),
      };
      
      render(<WeatherForecast forecast={shortForecast} unit="celsius" />);
      
      const forecastDays = screen.getAllByText(/°C/).length / 2;
      expect(forecastDays).toBe(3);
    });

    it('should handle missing condition data gracefully', () => {
      const forecastWithPartialCondition = {
        ...mockForecastData,
        forecasts: [{
          ...mockForecastData.forecasts[0],
          condition: {
            main: 'Unknown',
          } as unknown,
        }],
      };
      
      render(<WeatherForecast forecast={forecastWithPartialCondition} unit="celsius" />);
      
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByText('🌤️')).toBeInTheDocument(); // Fallback emoji
    });

    it('should handle very long city names', () => {
      const longNameForecast = {
        ...mockForecastData,
        cityName: 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch',
      };
      
      render(<WeatherForecast forecast={longNameForecast} unit="celsius" />);
      
      const locationElement = screen.getByText(longNameForecast.cityName);
      expect(locationElement).toBeInTheDocument();
      expect(locationElement).toHaveClass('forecast-location');
    });

    it('should handle negative temperatures', () => {
      const coldForecast = {
        ...mockForecastData,
        forecasts: [{
          ...mockForecastData.forecasts[0],
          tempMax: -5,
          tempMin: -15,
        }],
      };
      
      render(<WeatherForecast forecast={coldForecast} unit="celsius" />);
      
      expect(screen.getByText('-5°C')).toBeInTheDocument();
      expect(screen.getByText('-15°C')).toBeInTheDocument();
    });

    it('should handle decimal temperatures', () => {
      const decimalForecast = {
        ...mockForecastData,
        forecasts: [{
          ...mockForecastData.forecasts[0],
          tempMax: 22.5,
          tempMin: 18.3,
        }],
      };
      
      render(<WeatherForecast forecast={decimalForecast} unit="celsius" />);
      
      expect(screen.getByText('22.5°C')).toBeInTheDocument();
      expect(screen.getByText('18.3°C')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      const forecastContainer = screen.getByText('5-Day Forecast').closest('.weather-forecast');
      expect(forecastContainer).toBeInTheDocument();
      
      // Check for logical structure
      const header = forecastContainer?.querySelector('.forecast-header');
      const days = forecastContainer?.querySelector('.forecast-days');
      
      expect(header).toBeInTheDocument();
      expect(days).toBeInTheDocument();
    });

    it('should provide clear text hierarchy', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      // Title should be prominent
      const title = screen.getByText('5-Day Forecast');
      expect(title).toHaveClass('forecast-title');
      
      // Each day should have clear structure
      const dayContainers = screen.getAllByText(/MON|TUE|WED|THU|FRI|SAT|SUN/)
        .map(day => day.closest('.forecast-day'));
      
      expect(dayContainers).toHaveLength(5);
      dayContainers.forEach(container => {
        expect(container).toBeInTheDocument();
      });
    });

    it('should have descriptive content for screen readers', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      // All text content should be readable
      expect(screen.getByText('5-Day Forecast')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('25°C')).toBeInTheDocument();
    });
  });

  describe('date parsing', () => {
    it('should correctly parse date strings', () => {
      render(<WeatherForecast forecast={mockForecastData} unit="celsius" />);
      
      // Verify createDate is called with correct arguments
      const calls = (timeService.createDate as jest.Mock).mock.calls;
      
      expect(calls[0]).toEqual([2024, 0, 1]); // 2024-01-01
      expect(calls[1]).toEqual([2024, 0, 2]); // 2024-01-02
      expect(calls[2]).toEqual([2024, 0, 3]); // 2024-01-03
      expect(calls[3]).toEqual([2024, 0, 4]); // 2024-01-04
      expect(calls[4]).toEqual([2024, 0, 5]); // 2024-01-05
    });

    it('should handle different month boundaries', () => {
      const crossMonthForecast = {
        ...mockForecastData,
        forecasts: [
          { ...mockForecastData.forecasts[0], date: '2024-01-31' },
          { ...mockForecastData.forecasts[1], date: '2024-02-01' },
        ],
      };
      
      render(<WeatherForecast forecast={crossMonthForecast} unit="celsius" />);
      
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 0, 31); // January 31
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 1, 1);  // February 1
    });

    it('should handle leap year dates', () => {
      const leapYearForecast = {
        ...mockForecastData,
        forecasts: [
          { ...mockForecastData.forecasts[0], date: '2024-02-29' },
        ],
      };
      
      render(<WeatherForecast forecast={leapYearForecast} unit="celsius" />);
      
      expect(timeService.createDate).toHaveBeenCalledWith(2024, 1, 29); // February 29
    });
  });
});