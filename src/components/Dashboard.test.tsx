import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Dashboard } from "./Dashboard";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";

// Mock contexts and hooks
jest.mock("../contexts/AuthContext");
jest.mock("../contexts/LocationContext");
jest.mock("../hooks/useKeyboardNavigation");

// Mock lazy components
jest.mock("./LazyComponents", () => ({
  LazyRaccoonMascot: () => (
    <div data-testid="raccoon-mascot">Raccoon Mascot</div>
  ),
  LazyWeather: () => <div data-testid="weather">Weather</div>,
  LazyUserProfileViewer: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="user-profile">
        User Profile <button onClick={onClose}>Close Profile</button>
      </div>
    ) : null,
}));

// Mock other components
jest.mock("./VirgilTextLogo", () => ({
  VirgilTextLogo: ({ onClick }: any) => (
    <button data-testid="virgil-logo" onClick={onClick}>
      Virgil
    </button>
  ),
}));

jest.mock("./DateTime", () => ({
  DateTime: () => <div data-testid="datetime">DateTime</div>,
}));

jest.mock("./DogEmojiButton", () => ({
  DogEmojiButton: () => <button data-testid="dog-button">🐕</button>,
}));

jest.mock("./GiphyEmojiButton", () => ({
  GiphyEmojiButton: () => <button data-testid="giphy-button">GIF</button>,
}));

jest.mock("./NasaApodButton", () => ({
  NasaApodButton: () => <button data-testid="nasa-button">🚀</button>,
}));

jest.mock("./RhythmMachineButton", () => ({
  RhythmMachineButton: () => <button data-testid="rhythm-button">🎵</button>,
}));

jest.mock("./CircleGameButton", () => ({
  CircleGameButton: () => <button data-testid="circle-button">⭕</button>,
}));

jest.mock("./StreakTrackerButton", () => ({
  StreakTrackerButton: () => <button data-testid="streak-button">📊</button>,
}));

jest.mock("./camera/CameraEmojiButton", () => ({
  CameraEmojiButton: () => <button data-testid="camera-button">📷</button>,
}));

jest.mock("./pomodoro/PomodoroEmojiButton", () => ({
  PomodoroEmojiButton: () => <button data-testid="pomodoro-button">🍅</button>,
}));

jest.mock("./notes/NotesEmojiButton", () => ({
  NotesEmojiButton: () => <button data-testid="notes-button">📝</button>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<
  typeof useKeyboardNavigation
>;

const mockUser = {
  id: "test-id",
  email: "test@example.com",
  user_metadata: { name: "Test User" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

const mockAuthValue = {
  user: mockUser,
  loading: false,
  signOut: jest.fn(() => Promise.resolve({ error: null })),
  refreshUser: jest.fn(),
};

const mockLocationValue = {
  coordinates: {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 10,
    timestamp: Date.now(),
  },
  address: {
    street: "123 Main St",
    house_number: "123",
    city: "New York",
    postcode: "10001",
    country: "USA",
    formatted: "123 Main St, New York, NY 10001, USA",
  },
  ipLocation: {
    ip: "192.168.1.1",
    city: "New York",
    region: "NY",
    country: "US",
    timezone: "America/New_York",
  },
  loading: false,
  error: null,
  permissionStatus: "granted" as const,
  lastUpdated: Date.now(),
  hasLocation: true,
  fetchLocationData: jest.fn(),
  requestLocationPermission: jest.fn(),
  hasGPSLocation: true,
  hasIPLocation: true,
  initialized: true,
  clearError: jest.fn(),
};

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthValue);
    mockUseLocation.mockReturnValue(mockLocationValue);
    mockUseKeyboardNavigation.mockReturnValue({
      containerRef: { current: null },
      focusFirst: jest.fn(),
      focusLast: jest.fn(),
      focusNext: jest.fn(),
      focusPrevious: jest.fn(),
      focusElement: jest.fn(),
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
  });

  it("renders dashboard with all components", () => {
    render(<Dashboard />);

    expect(screen.getByRole("main", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("virgil-logo")).toBeInTheDocument();
    expect(screen.getByTestId("datetime")).toBeInTheDocument();
    expect(screen.getByTestId("weather")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();

    // Check emoji buttons
    expect(screen.getByTestId("dog-button")).toBeInTheDocument();
    expect(screen.getByTestId("giphy-button")).toBeInTheDocument();
    expect(screen.getByTestId("nasa-button")).toBeInTheDocument();
    expect(screen.getByTestId("rhythm-button")).toBeInTheDocument();
    expect(screen.getByTestId("circle-button")).toBeInTheDocument();
    expect(screen.getByTestId("streak-button")).toBeInTheDocument();
    expect(screen.getByTestId("camera-button")).toBeInTheDocument();
    expect(screen.getByTestId("pomodoro-button")).toBeInTheDocument();
    expect(screen.getByTestId("notes-button")).toBeInTheDocument();
  });

  it("displays user information", () => {
    render(<Dashboard />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays location information", () => {
    render(<Dashboard />);

    expect(
      screen.getByText("📍 123 Main St, New York, NY 10001, USA"),
    ).toBeInTheDocument();
    expect(screen.getByText(/40\.71.*-74\.01/)).toBeInTheDocument(); // Coordinates
  });

  it("displays elevation in meters by default", () => {
    render(<Dashboard />);

    expect(screen.getByText(/elevation.*meters/i)).toBeInTheDocument();
  });

  it("toggles elevation unit", () => {
    render(<Dashboard />);

    const elevationButton = screen.getByRole("button", { name: /elevation/i });
    fireEvent.click(elevationButton);

    expect(screen.getByText(/elevation.*feet/i)).toBeInTheDocument();
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "elevationUnit",
      "feet",
    );
  });

  it("handles sign out", async () => {
    render(<Dashboard />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);

    expect(signOutButton).toHaveAttribute("aria-label", "Signing out...");
    expect(mockAuthValue.signOut).toHaveBeenCalled();

    await waitFor(() => {
      expect(signOutButton).toHaveAttribute(
        "aria-label",
        "Sign out of your account",
      );
    });
  });

  it("handles sign out error", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockAuthValue.signOut.mockResolvedValueOnce({
      error: new Error("Sign out failed"),
    });

    render(<Dashboard />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Sign out error:",
        expect.any(Error),
      );
    });

    consoleError.mockRestore();
  });

  it("opens user profile viewer when logo is clicked", () => {
    render(<Dashboard />);

    const logo = screen.getByTestId("virgil-logo");
    fireEvent.click(logo);

    expect(screen.getByTestId("user-profile")).toBeInTheDocument();
  });

  it("closes user profile viewer", () => {
    render(<Dashboard />);

    // Open profile
    const logo = screen.getByTestId("virgil-logo");
    fireEvent.click(logo);

    // Close profile
    const closeButton = screen.getByText("Close Profile");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("user-profile")).not.toBeInTheDocument();
  });

  it("displays mascot component", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("raccoon-mascot")).toBeInTheDocument();
  });

  it("shows loading state for location", () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationValue,
      loading: true,
      address: null,
      coordinates: null,
      hasGPSLocation: false,
      hasIPLocation: false,
    });

    render(<Dashboard />);

    expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument();
  });

  it("handles anonymous user", () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthValue,
      user: { ...mockUser, user_metadata: {} },
    });

    render(<Dashboard />);

    expect(screen.getByText("Anonymous User")).toBeInTheDocument();
  });

  it("handles keyboard navigation setup", () => {
    const mockContainerRef = { current: document.createElement("div") };
    const mockKeyboardNav = {
      containerRef: mockContainerRef,
      focusFirst: jest.fn(),
      focusLast: jest.fn(),
      focusNext: jest.fn(),
      focusPrevious: jest.fn(),
      focusElement: jest.fn(),
    };

    mockUseKeyboardNavigation.mockReturnValue(mockKeyboardNav);

    render(<Dashboard />);

    // Simulate escape key
    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(document.body);
  });

  it("loads elevation unit from localStorage", () => {
    window.localStorage.getItem = jest.fn().mockReturnValue("feet");

    render(<Dashboard />);

    expect(screen.getByText(/elevation.*feet/i)).toBeInTheDocument();
  });

  it("handles localStorage errors gracefully", () => {
    window.localStorage.getItem = jest.fn(() => {
      throw new Error("Storage error");
    });

    render(<Dashboard />);

    // Should default to meters
    expect(screen.getByText(/elevation.*meters/i)).toBeInTheDocument();
  });
});
