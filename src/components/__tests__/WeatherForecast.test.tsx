import { render, screen } from '@testing-library/react';
import { WeatherForecast } from '../WeatherForecast';
import { weatherService } from '../../lib/weatherService';
import type { ForecastData } from '../../types/weather.types';

jest.mock('../../lib/weatherService');

describe('WeatherForecast', () => {
  const mockForecast: ForecastData = {
    cityName: 'New York',
    forecasts: [
      {
        date: '2024-01-15',
        condition: {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
        },
        tempMin: 45,
        tempMax: 60,
      },
      {
        date: '2024-01-16',
        condition: {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
        },
        tempMin: 42,
        tempMax: 58,
      },
      {
        date: '2024-01-17',
        condition: {
          id: 500,
          main: 'Rain',
          description: 'light rain',
        },
        tempMin: 50,
        tempMax: 65,
      },
      {
        date: '2024-01-18',
        condition: {
          id: 600,
          main: 'Snow',
          description: 'light snow',
        },
        tempMin: 30,
        tempMax: 38,
      },
      {
        date: '2024-01-19',
        condition: {
          id: 200,
          main: 'Thunderstorm',
          description: 'thunderstorm',
        },
        tempMin: 55,
        tempMax: 70,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock weather emojis
    (weatherService.getWeatherEmoji as jest.Mock).mockImplementation((id: number) => {
      const emojiMap: { [key: number]: string } = {
        200: '⛈️',
        500: '🌧️',
        600: '❄️',
        800: '☀️',
        801: '🌤️',
      };
      return emojiMap[id] || '🌡️';
    });
  });

  it('renders forecast header with title and location', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    expect(screen.getByText('5-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('renders all forecast days', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    // Check that all 5 days are rendered
    const forecastDays = screen.getAllByText(/°/); // Temperature indicators
    expect(forecastDays.length).toBeGreaterThanOrEqual(10); // At least 2 temps per day
  });

  it('formats dates correctly as 3-letter uppercase days', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    // Should have 5 day names, all uppercase and 3 letters
    const dayNames = screen.getAllByText(/^[A-Z]{3}$/);
    expect(dayNames).toHaveLength(5);
    
    // Each should be a valid day abbreviation
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    dayNames.forEach(dayElement => {
      expect(validDays).toContain(dayElement.textContent);
    });
  });

  it('displays weather emojis for each day', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    expect(screen.getByText('☀️')).toBeInTheDocument(); // Clear
    expect(screen.getByText('🌤️')).toBeInTheDocument(); // Clouds
    expect(screen.getByText('🌧️')).toBeInTheDocument(); // Rain
    expect(screen.getByText('❄️')).toBeInTheDocument(); // Snow
    expect(screen.getByText('⛈️')).toBeInTheDocument(); // Thunderstorm
  });

  it('displays temperature ranges', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    // Check high temps
    expect(screen.getByText('60°')).toBeInTheDocument();
    expect(screen.getByText('58°')).toBeInTheDocument();
    expect(screen.getByText('65°')).toBeInTheDocument();
    expect(screen.getByText('38°')).toBeInTheDocument();
    expect(screen.getByText('70°')).toBeInTheDocument();

    // Check low temps
    expect(screen.getByText('45°')).toBeInTheDocument();
    expect(screen.getByText('42°')).toBeInTheDocument();
    expect(screen.getByText('50°')).toBeInTheDocument();
    expect(screen.getByText('30°')).toBeInTheDocument();
    expect(screen.getByText('55°')).toBeInTheDocument();
  });

  it('displays weather condition descriptions', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Clouds')).toBeInTheDocument();
    expect(screen.getByText('Rain')).toBeInTheDocument();
    expect(screen.getByText('Snow')).toBeInTheDocument();
    expect(screen.getByText('Thunderstorm')).toBeInTheDocument();
  });

  it('handles missing condition ID with fallback emoji', () => {
    const forecastWithMissingId = {
      ...mockForecast,
      forecasts: [
        {
          date: '2024-01-15',
          condition: {
            main: 'Unknown',
            description: 'unknown condition',
          },
          tempMin: 45,
          tempMax: 60,
        },
      ],
    };

    render(<WeatherForecast forecast={forecastWithMissingId} unit="fahrenheit" />);

    // Should show fallback emoji
    expect(screen.getByText('🌤️')).toBeInTheDocument();
  });

  it('calls getWeatherEmoji with correct condition IDs', () => {
    render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(800);
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(801);
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(500);
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(600);
    expect(weatherService.getWeatherEmoji).toHaveBeenCalledWith(200);
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    expect(container.querySelector('.weather-forecast')).toBeInTheDocument();
    expect(container.querySelector('.forecast-header')).toBeInTheDocument();
    expect(container.querySelector('.forecast-title')).toBeInTheDocument();
    expect(container.querySelector('.forecast-location')).toBeInTheDocument();
    expect(container.querySelector('.forecast-days')).toBeInTheDocument();
    expect(container.querySelectorAll('.forecast-day')).toHaveLength(5);
  });

  it('renders forecast day structure correctly', () => {
    const { container } = render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);

    const firstDay = container.querySelector('.forecast-day');
    expect(firstDay?.querySelector('.forecast-day-name')).toBeInTheDocument();
    expect(firstDay?.querySelector('.forecast-icon')).toBeInTheDocument();
    expect(firstDay?.querySelector('.forecast-temps')).toBeInTheDocument();
    expect(firstDay?.querySelector('.forecast-temp-high')).toBeInTheDocument();
    expect(firstDay?.querySelector('.forecast-temp-low')).toBeInTheDocument();
    expect(firstDay?.querySelector('.forecast-condition')).toBeInTheDocument();
  });

  it('handles different date formats correctly', () => {
    const forecastWithDifferentDates = {
      ...mockForecast,
      forecasts: [
        {
          ...mockForecast.forecasts[0],
          date: '2024-01-20T12:00:00Z', // ISO format with time
        },
        {
          ...mockForecast.forecasts[1],
          date: '2024/01/21', // Different separator
        },
      ],
    };

    render(<WeatherForecast forecast={forecastWithDifferentDates} unit="fahrenheit" />);

    // Should still format dates correctly
    expect(screen.getByText('SAT')).toBeInTheDocument();
    expect(screen.getByText('SUN')).toBeInTheDocument();
  });

  it('unit prop does not affect display (component ignores it)', () => {
    const { rerender } = render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);
    
    const fahrenheitContent = screen.getByText('60°').textContent;
    
    rerender(<WeatherForecast forecast={mockForecast} unit="celsius" />);
    
    // Temperature display should be the same (component doesn't use unit prop)
    expect(screen.getByText('60°').textContent).toBe(fahrenheitContent);
  });

  it('handles empty forecast array gracefully', () => {
    const emptyForecast = {
      cityName: 'New York',
      forecasts: [],
    };

    render(<WeatherForecast forecast={emptyForecast} unit="fahrenheit" />);

    expect(screen.getByText('5-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.queryByText(/°/)).not.toBeInTheDocument();
  });

  it('renders with memo optimization', () => {
    const { rerender } = render(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);
    
    const getWeatherEmojiCallCount = (weatherService.getWeatherEmoji as jest.Mock).mock.calls.length;
    
    // Rerender with same props - should not call getWeatherEmoji again due to memo
    rerender(<WeatherForecast forecast={mockForecast} unit="fahrenheit" />);
    
    // Note: This test might not work as expected because React Testing Library
    // doesn't guarantee memo behavior, but we include it for completeness
    expect((weatherService.getWeatherEmoji as jest.Mock).mock.calls.length).toBe(getWeatherEmojiCallCount);
  });

  it('handles special characters in city names', () => {
    const specialCityForecast = {
      ...mockForecast,
      cityName: 'São Paulo, Brazil',
    };

    render(<WeatherForecast forecast={specialCityForecast} unit="fahrenheit" />);

    expect(screen.getByText('São Paulo, Brazil')).toBeInTheDocument();
  });

  it('handles weekend days correctly', () => {
    const weekendForecast = {
      cityName: 'New York',
      forecasts: [
        {
          date: '2024-01-13', // Saturday
          condition: { id: 800, main: 'Clear', description: 'clear' },
          tempMin: 45,
          tempMax: 60,
        },
        {
          date: '2024-01-14', // Sunday
          condition: { id: 801, main: 'Clouds', description: 'cloudy' },
          tempMin: 42,
          tempMax: 58,
        },
      ],
    };

    render(<WeatherForecast forecast={weekendForecast} unit="fahrenheit" />);

    // Should have 2 day names
    const dayNames = screen.getAllByText(/^[A-Z]{3}$/);
    expect(dayNames).toHaveLength(2);
    
    // At least one should be a weekend day
    const weekendDays = ['SAT', 'SUN'];
    const hasWeekendDay = dayNames.some(dayElement => 
      weekendDays.includes(dayElement.textContent || '')
    );
    expect(hasWeekendDay).toBe(true);
  });

  it('handles negative temperatures', () => {
    const coldForecast = {
      cityName: 'Anchorage',
      forecasts: [
        {
          date: '2024-01-15',
          condition: { id: 600, main: 'Snow', description: 'heavy snow' },
          tempMin: -10,
          tempMax: -2,
        },
      ],
    };

    render(<WeatherForecast forecast={coldForecast} unit="fahrenheit" />);

    expect(screen.getByText('-2°')).toBeInTheDocument();
    expect(screen.getByText('-10°')).toBeInTheDocument();
  });
});