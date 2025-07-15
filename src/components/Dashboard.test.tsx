import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

// Mock contexts
jest.mock('../contexts/AuthContext');
jest.mock('../contexts/LocationContext');

// Mock the hooks and components
jest.mock('../hooks/useKeyboardNavigation');
jest.mock('./LazyComponents', () => ({
  LazyRaccoonMascot: () => <div data-testid="raccoon-mascot">Raccoon Mascot</div>,
  LazyWeather: () => <div data-testid="weather">Weather</div>,
  LazyUserProfileViewer: () => <div data-testid="user-profile-viewer">User Profile Viewer</div>
}));
jest.mock('./DogEmojiButton', () => ({
  DogEmojiButton: () => <button data-testid="dog-emoji-button">🐕</button>
}));
jest.mock('./VirgilLogo', () => ({
  VirgilLogo: () => <div data-testid="virgil-logo">Virgil Logo</div>
}));
jest.mock('./DateTime', () => ({
  DateTime: () => <div data-testid="datetime">DateTime</div>
}));
jest.mock('./LoadingFallback', () => ({
  LoadingFallback: () => <div data-testid="loading-fallback">Loading...</div>
}));

const mockSignOut = jest.fn();
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<typeof useKeyboardNavigation>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

const mockUser = {
  id: 'test-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z'
};

const mockAuthValue = {
  user: mockUser,
  loading: false,
  signOut: mockSignOut
};

const mockLocationValue = {
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
  refresh: jest.fn(),
  clearError: jest.fn()
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKeyboardNavigation.mockReturnValue({
      containerRef: { current: null },
      activeIndex: 0,
      setActiveIndex: jest.fn()
    });
    mockUseAuth.mockReturnValue(mockAuthValue);
    mockUseLocation.mockReturnValue(mockLocationValue);
  });

  it('renders all main components', () => {
    render(<Dashboard />);
    
    // Check for main elements
    expect(screen.getByRole('main', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View user profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    
    // Check for lazy loaded components (they should be in loading state initially)
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
  });

  it('displays user information correctly', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays location information when available', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('📍 123 Main St, New York, NY 10001, USA')).toBeInTheDocument();
  });

  it('shows loading state for location', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationValue,
      loading: true,
      address: null
    });
    
    render(<Dashboard />);
    
    expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument();
  });

  it('handles sign out button click', async () => {
    render(<Dashboard />);
    
    const signOutButton = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutButton);
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('toggles user profile viewer', async () => {
    render(<Dashboard />);
    
    // Initially profile viewer should not be visible
    expect(screen.queryByTestId('user-profile-viewer')).not.toBeInTheDocument();
    
    // Click profile button
    const profileButton = screen.getByRole('button', { name: 'View user profile' });
    fireEvent.click(profileButton);
    
    // Profile viewer should become visible
    await waitFor(() => {
      expect(screen.getByTestId('user-profile-viewer')).toBeInTheDocument();
    });
    
    // Button should have active class
    expect(profileButton).toHaveClass('active');
  });


  it('uses keyboard navigation hook', () => {
    render(<Dashboard />);
    
    expect(mockUseKeyboardNavigation).toHaveBeenCalledWith({
      enabled: true,
      onEscape: expect.any(Function)
    });
  });

  it('renders lazy loaded components in Suspense', async () => {
    render(<Dashboard />);
    
    // Weather should be in loading state initially
    expect(screen.getByText('Loading weather...')).toBeInTheDocument();
    
    // Eventually the weather component should load
    await waitFor(() => {
      expect(screen.getByTestId('weather')).toBeInTheDocument();
    });
  });

  it('shows IP location when no GPS address available', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationValue,
      address: null,
      hasLocation: false
    });
    
    render(<Dashboard />);
    
    expect(screen.getByText('📍 New York, NY')).toBeInTheDocument();
  });

  it('shows only city when no address or IP location available', () => {
    mockUseLocation.mockReturnValue({
      ...mockLocationValue,
      address: null,
      ipLocation: { city: 'Boston' },
      hasLocation: false
    });
    
    render(<Dashboard />);
    
    expect(screen.getByText('📍 Boston')).toBeInTheDocument();
  });

  it('renders dog emoji button', () => {
    render(<Dashboard />);
    
    expect(screen.getByTestId('dog-emoji-button')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<Dashboard />);
    
    const dashboard = screen.getByRole('main');
    expect(dashboard).toHaveAttribute('aria-label', 'Dashboard');
    
    const profileButton = screen.getByRole('button', { name: 'View user profile' });
    expect(profileButton).toHaveAttribute('title', 'View user profile');
    expect(profileButton).toHaveAttribute('data-keyboard-nav');
  });
});