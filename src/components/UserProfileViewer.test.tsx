import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfileViewer } from './UserProfileViewer';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../contexts/LocationContext');
jest.mock('../contexts/WeatherContext');
jest.mock('../hooks/useKeyboardNavigation');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseWeather = useWeather as jest.MockedFunction<typeof useWeather>;
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<typeof useKeyboardNavigation>;

const mockUser = {
  id: 'test-id',
  email: 'test@example.com',
  created_at: '2024-01-15T12:00:00Z', // Use mid-month, mid-day to avoid timezone edge cases
  user_metadata: {
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg'
  }
};

const mockLocationData = {
  coordinates: { latitude: 40.7128, longitude: -74.0060 },
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    formatted: '123 Main St, New York, NY 10001, USA'
  },
  ipLocation: {
    city: 'New York',
    region: 'NY',
    country: 'US',
    timezone: 'America/New_York'
  },
  loading: false,
  error: null,
  permissionStatus: 'granted' as PermissionState,
  lastUpdated: Date.now(),
  hasLocation: true,
  hasGPSLocation: true,
  refresh: jest.fn(),
  clearError: jest.fn()
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
    main: 'Clear',
    description: 'clear sky',
    icon: '01d'
  },
  sunrise: 1643000000,
  sunset: 1643040000,
  timezone: -28800,
  cityName: 'New York',
  country: 'US',
  timestamp: Date.now()
};

const mockSignOut = jest.fn();
const mockOnClose = jest.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

describe('UserProfileViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn()
    });
    
    mockUseLocation.mockReturnValue(mockLocationData);
    
    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      loading: false,
      error: null,
      unit: 'fahrenheit',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });
    
    mockUseKeyboardNavigation.mockReturnValue({
      containerRef: { current: null },
      focusFirst: jest.fn(),
      focusLast: jest.fn(),
      focusNext: jest.fn(),
      focusPrevious: jest.fn(),
      focusElement: jest.fn()
    });
  });

  it('renders nothing when closed', () => {
    render(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders user profile when open', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByRole('dialog', { name: /user profile/i })).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays member since date', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Member since Jan 15, 2024')).toBeInTheDocument();
  });

  it('displays avatar when available', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    const avatar = screen.getByAltText('Profile avatar');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('displays initial when no avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, user_metadata: { ...mockUser.user_metadata, avatarUrl: '' } },
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn()
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('displays emoji when no name or avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, user_metadata: {} },
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn()
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('displays GPS location when available', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('GPS Location Available')).toBeInTheDocument();
  });

  it('displays address when no GPS but address available', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationData,
      hasGPSLocation: false
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('New York, USA')).toBeInTheDocument();
  });

  it('displays IP location when no GPS or address', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationData,
      hasGPSLocation: false,
      address: null
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('New York, US')).toBeInTheDocument();
  });

  it('displays weather information when available', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('72°F - clear sky')).toBeInTheDocument();
  });

  it('displays weather in celsius when unit is celsius', () => {
    mockUseWeather.mockReturnValue({
      data: mockWeatherData,
      loading: false,
      error: null,
      unit: 'celsius',
      toggleUnit: jest.fn(),
      hasWeather: true,
      fetchWeather: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('72°C - clear sky')).toBeInTheDocument();
  });

  it('handles sign out button click', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('copies profile data to clipboard', async () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    const copyButton = screen.getByRole('button', { name: /copy profile data/i });
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        memberSince: '2024-01-15T12:00:00Z',
        location: '123 Main St, New York, NY 10001, USA',
        weather: '72°F'
      }, null, 2)
    );
  });

  it('closes on Escape key', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <UserProfileViewer isOpen={true} onClose={mockOnClose} />
        <button>Outside button</button>
      </div>
    );
    
    const outsideButton = screen.getByText('Outside button');
    fireEvent.mouseDown(outsideButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'false');
    expect(dialog).toHaveAttribute('aria-label', 'User Profile');
    
    const copyButton = screen.getByRole('button', { name: /copy profile data/i });
    expect(copyButton).toHaveAttribute('data-keyboard-nav');
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toHaveAttribute('data-keyboard-nav');
  });

  it('handles missing user data gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, user_metadata: {} },
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn()
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('handles missing location data', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationData,
      hasGPSLocation: false,
      address: null,
      ipLocation: null
    });
    
    render(<UserProfileViewer isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Location unavailable')).toBeInTheDocument();
  });
});