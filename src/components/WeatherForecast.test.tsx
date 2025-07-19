import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WeatherForecast } from "./WeatherForecast";
import { useWeather } from "../contexts/WeatherContext";

// Mock the WeatherContext
jest.mock("../contexts/WeatherContext");

const mockUseWeather = useWeather as jest.MockedFunction<typeof useWeather>;

const mockForecastData = [
  {
    date: new Date("2024-01-20T12:00:00"),
    temp: 72,
    tempMin: 65,
    tempMax: 78,
    feelsLike: 70,
    humidity: 55,
    pressure: 1013,
    windSpeed: 8,
    windDeg: 180,
    clouds: 20,
    visibility: 10000,
    pop: 0.1,
    condition: {
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d",
    },
    rain: undefined,
    snow: undefined,
  },
  {
    date: new Date("2024-01-21T12:00:00"),
    temp: 68,
    tempMin: 62,
    tempMax: 74,
    feelsLike: 66,
    humidity: 60,
    pressure: 1015,
    windSpeed: 10,
    windDeg: 190,
    clouds: 40,
    visibility: 10000,
    pop: 0.3,
    condition: {
      id: 802,
      main: "Clouds",
      description: "scattered clouds",
      icon: "03d",
    },
    rain: 0.5,
    snow: undefined,
  },
  {
    date: new Date("2024-01-22T12:00:00"),
    temp: 65,
    tempMin: 58,
    tempMax: 70,
    feelsLike: 63,
    humidity: 70,
    pressure: 1012,
    windSpeed: 12,
    windDeg: 200,
    clouds: 80,
    visibility: 8000,
    pop: 0.8,
    condition: {
      id: 501,
      main: "Rain",
      description: "moderate rain",
      icon: "10d",
    },
    rain: 5.2,
    snow: undefined,
  },
  {
    date: new Date("2024-01-23T12:00:00"),
    temp: 62,
    tempMin: 55,
    tempMax: 67,
    feelsLike: 60,
    humidity: 65,
    pressure: 1014,
    windSpeed: 6,
    windDeg: 170,
    clouds: 30,
    visibility: 10000,
    pop: 0.2,
    condition: {
      id: 801,
      main: "Clouds",
      description: "few clouds",
      icon: "02d",
    },
    rain: undefined,
    snow: undefined,
  },
  {
    date: new Date("2024-01-24T12:00:00"),
    temp: 70,
    tempMin: 63,
    tempMax: 76,
    feelsLike: 68,
    humidity: 50,
    pressure: 1016,
    windSpeed: 5,
    windDeg: 160,
    clouds: 10,
    visibility: 10000,
    pop: 0.05,
    condition: {
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d",
    },
    rain: undefined,
    snow: undefined,
  },
];

describe("WeatherForecast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    mockUseWeather.mockReturnValue({
      forecast: [],
      forecastLoading: true,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    expect(screen.getByText("Loading forecast...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseWeather.mockReturnValue({
      forecast: [],
      forecastLoading: false,
      forecastError: "Failed to fetch forecast",
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    expect(screen.getByText("Failed to load forecast")).toBeInTheDocument();
  });

  it("renders no forecast message when empty", () => {
    mockUseWeather.mockReturnValue({
      forecast: [],
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    expect(screen.getByText("No forecast available")).toBeInTheDocument();
  });

  it("renders forecast data in fahrenheit", () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Check title
    expect(screen.getByText("5-Day Forecast")).toBeInTheDocument();

    // Check first day
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("72°")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();

    // Check that all 5 days are rendered
    const forecastDays = screen.getAllByRole("button", {
      name: /forecast for/i,
    });
    expect(forecastDays).toHaveLength(5);
  });

  it("renders forecast data in celsius", () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "celsius",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Temperature should be in Celsius (72°F = 22°C)
    expect(screen.getByText("22°")).toBeInTheDocument();
  });

  it("shows detailed forecast on hover", async () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over first day
    const firstDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[0];
    fireEvent.mouseEnter(firstDay);

    // Check detailed info appears
    await waitFor(() => {
      expect(screen.getByText("Saturday, Jan 20")).toBeInTheDocument();
      expect(screen.getByText("65° - 78°")).toBeInTheDocument();
      expect(screen.getByText("Feels like 70°")).toBeInTheDocument();
      expect(screen.getByText("Humidity: 55%")).toBeInTheDocument();
      expect(screen.getByText("Wind: 8 mph S")).toBeInTheDocument();
      expect(screen.getByText("Precipitation: 10%")).toBeInTheDocument();
    });
  });

  it("hides detailed forecast on mouse leave", async () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over first day
    const firstDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[0];
    fireEvent.mouseEnter(firstDay);

    // Verify tooltip appears
    await waitFor(() => {
      expect(screen.getByText("Saturday, Jan 20")).toBeInTheDocument();
    });

    // Mouse leave
    fireEvent.mouseLeave(firstDay);

    // Verify tooltip disappears
    await waitFor(() => {
      expect(screen.queryByText("Saturday, Jan 20")).not.toBeInTheDocument();
    });
  });

  it("shows rain amount when present", async () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over day with rain (3rd day)
    const rainyDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[2];
    fireEvent.mouseEnter(rainyDay);

    await waitFor(() => {
      expect(screen.getByText("Rain: 5.2mm")).toBeInTheDocument();
    });
  });

  it("shows snow amount when present", async () => {
    const forecastWithSnow = [...mockForecastData];
    forecastWithSnow[1] = {
      ...forecastWithSnow[1],
      snow: 3.5,
      rain: undefined,
    };

    mockUseWeather.mockReturnValue({
      forecast: forecastWithSnow,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over day with snow
    const snowyDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[1];
    fireEvent.mouseEnter(snowyDay);

    await waitFor(() => {
      expect(screen.getByText("Snow: 3.5mm")).toBeInTheDocument();
    });
  });

  it("applies correct weather icon classes", () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Check that weather icons are rendered with correct classes
    const weatherIcons = screen.getAllByText("", { selector: "i" });
    expect(weatherIcons[0]).toHaveClass("wi-day-sunny"); // Clear day
    expect(weatherIcons[2]).toHaveClass("wi-rain"); // Rainy day
  });

  it("handles wind direction correctly", async () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over first day (wind from 180° = S)
    const firstDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[0];
    fireEvent.mouseEnter(firstDay);

    await waitFor(() => {
      expect(screen.getByText("Wind: 8 mph S")).toBeInTheDocument();
    });
  });

  it("handles celsius wind speed conversion", async () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "celsius",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Hover over first day
    const firstDay = screen.getAllByRole("button", {
      name: /forecast for/i,
    })[0];
    fireEvent.mouseEnter(firstDay);

    await waitFor(() => {
      // Wind speed should be in km/h for celsius (8 mph ≈ 13 km/h)
      expect(screen.getByText("Wind: 13 km/h S")).toBeInTheDocument();
    });
  });

  it("handles forecast with less than 5 days", () => {
    const shortForecast = mockForecastData.slice(0, 3);

    mockUseWeather.mockReturnValue({
      forecast: shortForecast,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Should render only 3 days
    const forecastDays = screen.getAllByRole("button", {
      name: /forecast for/i,
    });
    expect(forecastDays).toHaveLength(3);
  });

  it("applies correct styling for current weather conditions", () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Check that forecast days have proper structure
    const forecastContainer = screen.getByText("5-Day Forecast").parentElement;
    expect(forecastContainer).toHaveClass("weather-forecast");
  });

  it("formats dates correctly", () => {
    mockUseWeather.mockReturnValue({
      forecast: mockForecastData,
      forecastLoading: false,
      forecastError: null,
      unit: "fahrenheit",
      data: null,
      loading: false,
      error: null,
      toggleUnit: jest.fn(),
      hasWeather: false,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null,
    });

    render(<WeatherForecast />);

    // Check day abbreviations
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
  });
});
