import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { UserProfileViewer } from "./UserProfileViewer";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";
import { useWeather } from "../contexts/WeatherContext";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useDeviceInfo } from "../hooks/useDeviceInfo";
import { useUserProfile } from "../hooks/useUserProfile";

// Mock dependencies
jest.mock("../contexts/AuthContext");
jest.mock("../contexts/LocationContext");
jest.mock("../contexts/WeatherContext");
jest.mock("../hooks/useKeyboardNavigation");
jest.mock("../hooks/useDeviceInfo");
jest.mock("../hooks/useUserProfile");
jest.mock("./EditableDataPoint", () => ({
  EditableDataPoint: ({ label, value }: any) => (
    <div data-testid={`editable-${label}`}>
      {label}: {value}
    </div>
  ),
}));
jest.mock("./SelectDataPoint", () => ({
  SelectDataPoint: ({ label, value }: any) => (
    <div data-testid={`select-${label}`}>
      {label}: {value}
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseWeather = useWeather as jest.MockedFunction<typeof useWeather>;
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<
  typeof useKeyboardNavigation
>;
const mockUseDeviceInfo = useDeviceInfo as jest.MockedFunction<typeof useDeviceInfo>;
const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

const mockUser = {
  id: "test-id",
  email: "test@example.com",
  created_at: "2024-01-15T12:00:00Z",
  user_metadata: {
    name: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
  },
};

const mockLocationData = {
  coordinates: { latitude: 40.7128, longitude: -74.006, accuracy: 10, timestamp: Date.now() },
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    country: "USA",
    postcode: "10001",
    formatted: "123 Main St, New York, NY 10001, USA",
    house_number: "123",
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
  permissionStatus: "granted" as PermissionState,
  lastUpdated: Date.now(),
  hasLocation: true,
  hasGPSLocation: true,
  refresh: jest.fn(),
  clearError: jest.fn(),
};

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
    main: "Clear",
    description: "clear sky",
    icon: "01d",
  },
  sunrise: 1643000000,
  sunset: 1643040000,
  timezone: -28800,
  cityName: "New York",
  country: "US",
  timestamp: Date.now(),
};

const mockDeviceInfo = {
  deviceInfo: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    os: "MacOS",
    browser: "Chrome",
    browserVersion: "120.0.0",
    screenWidth: 1920,
    screenHeight: 1080,
    devicePixelRatio: 2,
    touchSupport: false,
    standalone: false,
    language: "en-US",
    onlineStatus: true,
    orientation: "landscape-primary" as OrientationType,
    battery: { level: 0.8, charging: true },
  },
  permissions: {
    camera: "granted" as PermissionState,
    microphone: "granted" as PermissionState,
    location: "granted" as PermissionState,
    notifications: "denied" as PermissionState,
    persistentStorage: "granted" as PermissionState,
    screenShare: "prompt" as PermissionState,
    midi: "prompt" as PermissionState,
    mediaDevices: "granted" as PermissionState,
    clipboard: "granted" as PermissionState,
    bluetooth: "prompt" as PermissionState,
  },
  requestPermission: jest.fn(),
};

const mockProfile = {
  profile: {
    nickname: "TestNick",
    fullName: "Test Full Name",
    dateOfBirth: "1990-01-01",
    phone: "+1234567890",
    gender: "male",
    maritalStatus: "single",
    address: {
      street: "456 Profile St",
      city: "Profile City",
      state: "PC",
      zip: "12345",
      country: "USA",
    },
  },
  loading: false,
  saving: false,
  saveSuccess: false,
  updateField: jest.fn(),
  updateAddress: jest.fn(),
};

const mockSignOut = jest.fn();
const mockOnClose = jest.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe("UserProfileViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSignOut.mockResolvedValue({ error: null });

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn(),
    } as any);

    mockUseLocation.mockReturnValue(mockLocationData);

    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      loading: false,
      error: null,
      unit: "fahrenheit",
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now(),
    });

    mockUseKeyboardNavigation.mockReturnValue({
      containerRef: { current: null },
      focusFirst: jest.fn(),
      focusLast: jest.fn(),
      focusNext: jest.fn(),
      focusPrevious: jest.fn(),
      focusElement: jest.fn(),
    });

    mockUseDeviceInfo.mockReturnValue(mockDeviceInfo);
    mockUseUserProfile.mockReturnValue(mockProfile);
  });

  it("renders nothing when closed", () => {
    render(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders user profile when open", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(
      screen.getByRole("dialog", { name: /user profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays member since date", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Member since/)).toBeInTheDocument();
    expect(screen.getByText(/Jan.*15.*2024/)).toBeInTheDocument();
  });

  it("displays avatar when available", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const avatar = screen.getByAltText("Profile avatar");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("displays initial when no avatar", () => {
    mockUseAuth.mockReturnValue({
      user: {
        ...mockUser,
        user_metadata: { ...mockUser.user_metadata, avatarUrl: undefined },
      },
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn(),
    } as any);

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("displays emoji when no name or avatar", () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, user_metadata: {} },
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn(),
    } as any);

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("displays GPS location when available", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("GPS Location Available")).toBeInTheDocument();
  });

  it("displays weather information when available", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("72°F - clear sky")).toBeInTheDocument();
  });

  it("handles sign out button click", async () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    
    await act(async () => {
      fireEvent.click(signOutButton);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("handles sign out error", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockSignOut.mockResolvedValueOnce({ error: new Error("Sign out failed") });

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    
    await act(async () => {
      fireEvent.click(signOutButton);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Sign out error:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("switches between user and virgil tabs", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // Initially on user tab
    expect(screen.getByRole("tab", { name: /user info/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /virgil info/i })).toHaveAttribute("aria-selected", "false");

    // Click on virgil tab
    fireEvent.click(screen.getByRole("tab", { name: /virgil info/i }));

    expect(screen.getByRole("tab", { name: /user info/i })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /virgil info/i })).toHaveAttribute("aria-selected", "true");
  });

  it("displays profile completion percentage", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // All fields are filled in mock, so should be 100%
    expect(screen.getByText("Profile Completion")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("displays editable profile fields", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId("editable-Nickname")).toHaveTextContent("Nickname: TestNick");
    expect(screen.getByTestId("editable-Full Name")).toHaveTextContent("Full Name: Test Full Name");
    expect(screen.getByTestId("editable-Date of Birth")).toHaveTextContent("Date of Birth: 1990-01-01");
    expect(screen.getByTestId("editable-Phone")).toHaveTextContent("Phone: +1234567890");
  });

  it("displays select fields", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId("select-Gender")).toHaveTextContent("Gender: male");
    expect(screen.getByTestId("select-Marital Status")).toHaveTextContent("Marital Status: single");
  });

  it("toggles address visibility", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // Address should not be visible initially
    expect(screen.queryByTestId("editable-Street")).not.toBeInTheDocument();

    // Click to show address
    const addressButton = screen.getByRole("button", { name: /address/i });
    fireEvent.click(addressButton);

    // Address fields should now be visible
    expect(screen.getByTestId("editable-Street")).toBeInTheDocument();
    expect(screen.getByTestId("editable-City")).toBeInTheDocument();
    expect(screen.getByTestId("editable-State")).toBeInTheDocument();
    expect(screen.getByTestId("editable-ZIP Code")).toBeInTheDocument();
    expect(screen.getByTestId("editable-Country")).toBeInTheDocument();
  });

  it("displays device information on virgil tab", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // Switch to virgil tab
    fireEvent.click(screen.getByRole("tab", { name: /virgil info/i }));

    expect(screen.getByText("Chrome 120.0.0")).toBeInTheDocument();
    expect(screen.getByText("MacOS")).toBeInTheDocument();
    expect(screen.getByText("1920x1080")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("displays permissions on virgil tab", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // Switch to virgil tab
    fireEvent.click(screen.getByRole("tab", { name: /virgil info/i }));

    expect(screen.getByText("Permissions")).toBeInTheDocument();
    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Microphone")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("copies profile data to clipboard", async () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const copyButton = screen.getByRole("button", {
      name: /copy profile data/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it("closes on Escape key", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <UserProfileViewer isOpen={true} onClose={mockOnClose} />
        <button>Outside button</button>
      </div>,
    );

    const outsideButton = screen.getByText("Outside button");
    fireEvent.mouseDown(outsideButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("does not close when clicking on logo button", () => {
    render(
      <div>
        <UserProfileViewer isOpen={true} onClose={mockOnClose} />
        <button className="virgil-logo-button">Logo</button>
      </div>,
    );

    const logoButton = screen.getByText("Logo");
    fireEvent.mouseDown(logoButton);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("removes event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <UserProfileViewer isOpen={true} onClose={mockOnClose} />,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it("does not add event listeners when closed", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");

    render(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
  });

  it("prevents multiple sign out calls", async () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    
    // Click multiple times quickly
    await act(async () => {
      fireEvent.click(signOutButton);
      fireEvent.click(signOutButton);
      fireEvent.click(signOutButton);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("calculates profile completion correctly with partial data", () => {
    mockUseUserProfile.mockReturnValue({
      ...mockProfile,
      profile: {
        ...mockProfile.profile,
        nickname: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
      },
    });

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    // Only fullName, dateOfBirth, gender, maritalStatus are filled (4/11 fields)
    expect(screen.getByText("36%")).toBeInTheDocument();
  });

  it("displays loading state for profile", () => {
    mockUseUserProfile.mockReturnValue({
      ...mockProfile,
      loading: true,
    });

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("displays save success message", () => {
    mockUseUserProfile.mockReturnValue({
      ...mockProfile,
      saveSuccess: true,
    });

    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Profile saved!")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "User Profile");

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    expect(signOutButton).toHaveAttribute("data-keyboard-nav");
  });
});