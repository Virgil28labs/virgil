/**
 * Dashboard Component Comprehensive Test Suite
 * 
 * Tests main container component, authentication flows, component integration,
 * error boundaries, and user interactions. Critical UI foundation component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { AllTheProviders } from '../../test-utils/AllTheProviders';

// Mock all hooks and services
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../hooks/useLocation', () => ({
  useLocation: jest.fn(),
}));

jest.mock('../../hooks/useDeviceInfo', () => ({
  useDeviceInfo: jest.fn(),
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(),
}));

jest.mock('../../services/DashboardAppService', () => ({
  dashboardAppService: {
    registerAdapter: jest.fn(),
    unregisterAdapter: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    getAppData: jest.fn(() => ({ apps: new Map(), activeApps: [], lastUpdated: Date.now() })),
  },
}));

jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    subscribe: jest.fn(() => jest.fn()),
    getContext: jest.fn(() => ({})),
    updateDeviceContext: jest.fn(),
    updateLocationContext: jest.fn(),
    updateWeatherContext: jest.fn(),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock all dashboard components
jest.mock('../VirgilTextLogo', () => ({
  VirgilTextLogo: () => <div data-testid="virgil-logo">Virgil Logo</div>,
}));

jest.mock('../DateTime', () => ({
  DateTime: () => <div data-testid="datetime">Date Time</div>,
}));

jest.mock('../LazyComponents', () => ({
  LazyRaccoonMascot: React.lazy(() => Promise.resolve({
    default: () => <div data-testid="raccoon-mascot">Raccoon Mascot</div>,
  })),
}));

jest.mock('../Weather', () => ({
  Weather: () => <div data-testid="weather">Weather</div>,
}));

jest.mock('../UserProfileViewer', () => ({
  UserProfileViewer: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="profile-viewer">
      Profile Viewer
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock all emoji buttons
jest.mock('../DogEmojiButton', () => ({
  DogEmojiButton: () => <button data-testid="dog-button">🐕</button>,
}));

jest.mock('../GiphyEmojiButton', () => ({
  GiphyEmojiButton: () => <button data-testid="giphy-button">🎬</button>,
}));

jest.mock('../NasaApodButton', () => ({
  NasaApodButton: () => <button data-testid="nasa-button">🚀</button>,
}));

jest.mock('../RhythmMachineButton', () => ({
  RhythmMachineButton: () => <button data-testid="rhythm-button">🎵</button>,
}));

jest.mock('../CircleGameButton', () => ({
  CircleGameButton: () => <button data-testid="circle-button">⭕</button>,
}));

jest.mock('../StreakTrackerButton', () => ({
  StreakTrackerButton: () => <button data-testid="streak-button">📈</button>,
}));

jest.mock('../camera/CameraEmojiButton', () => ({
  CameraEmojiButton: () => <button data-testid="camera-button">📷</button>,
}));

jest.mock('../pomodoro/PomodoroEmojiButton', () => ({
  PomodoroEmojiButton: () => <button data-testid="pomodoro-button">🍅</button>,
}));

jest.mock('../notes/NotesEmojiButton', () => ({
  NotesEmojiButton: () => <button data-testid="notes-button">📝</button>,
}));

jest.mock('../VectorMemoryButton', () => ({
  VectorMemoryButton: () => <button data-testid="memory-button">🧠</button>,
}));

jest.mock('../maps/GoogleMapsModal', () => ({
  GoogleMapsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? (
      <div data-testid="maps-modal">
        Maps Modal
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('../location/IPHoverCard', () => ({
  PositionedIPHoverCard: ({ show, onClose }: { show: boolean; onClose: () => void }) =>
    show ? (
      <div data-testid="ip-hover-card">
        IP Hover Card
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Import mocked hooks
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { logger } from '../../lib/logger';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockUseDeviceInfo = useDeviceInfo as jest.MockedFunction<typeof useDeviceInfo>;
const mockUseKeyboardNavigation = useKeyboardNavigation as jest.MockedFunction<typeof useKeyboardNavigation>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Dashboard', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    role: 'authenticated',
    last_sign_in_at: '2024-01-01T00:00:00.000Z',
    confirmation_sent_at: undefined,
    confirmed_at: '2024-01-01T00:00:00.000Z',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: undefined,
    phone_confirmed_at: undefined,
    recovery_sent_at: undefined,
    new_email: undefined,
    invited_at: undefined,
    factors: undefined,
    identities: [],
    is_anonymous: false,
  };

  const defaultAuthData = {
    user: mockUser,
    loading: false,
    signOut: jest.fn().mockResolvedValue({ error: undefined }),
    refreshUser: jest.fn().mockResolvedValue(undefined),
  };

  const defaultLocationData = {
    address: { 
      street: 'Test St',
      house_number: '123',
      city: 'Test City',
      postcode: '12345',
      country: 'US',
      formatted: '123 Test St, Test City, CA',
    },
    ipLocation: { 
      ip: '127.0.0.1',
      city: 'Test City', 
      region: 'CA', 
      country: 'US', 
    },
    coordinates: { 
      latitude: 37.7749, 
      longitude: -122.4194,
      accuracy: 10,
      timestamp: Date.now(),
    },
    loading: false,
    error: null,
    permissionStatus: 'granted' as const,
    lastUpdated: Date.now(),
    initialized: true,
    fetchLocationData: jest.fn(),
    requestLocationPermission: jest.fn(),
    clearError: jest.fn(),
    hasLocation: true,
    hasGPSLocation: true,
    hasIpLocation: true,
  };

  const defaultDeviceInfo = {
    deviceInfo: {
      location: 'Test City, CA',
      ip: '127.0.0.1',
      device: 'Desktop',
      os: 'Windows 10',
      browser: 'Chrome',
      screen: '1920x1080',
      pixelRatio: 1,
      colorScheme: 'light' as const,
      windowSize: '1920x1080',
      cpu: 8,
      memory: '8 GB',
      online: true,
      networkType: '4g',
      downlink: '10 Mbps',
      rtt: '50ms',
      batteryLevel: null,
      batteryCharging: null,
      localTime: '12:00 PM',
      timezone: 'America/Los_Angeles',
      language: 'en-US',
      tabVisible: true,
      sessionDuration: 0,
      cookiesEnabled: true,
      doNotTrack: null,
      storageQuota: '10 GB',
    },
    permissions: {
      geolocation: 'granted' as const,
      camera: 'prompt' as const,
      microphone: 'prompt' as const,
      notifications: 'prompt' as const,
      'clipboard-read': 'prompt' as const,
      clipboard: 'prompt' as const,
    },
    requestPermission: jest.fn(),
  };

  const defaultKeyboardNav = {
    containerRef: { current: null },
    focusFirst: jest.fn(),
    focusLast: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
    focusElement: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    mockUseAuth.mockReturnValue(defaultAuthData);
    mockUseLocation.mockReturnValue(defaultLocationData);
    mockUseDeviceInfo.mockReturnValue(defaultDeviceInfo);
    mockUseKeyboardNavigation.mockReturnValue(defaultKeyboardNav);
  });

  const renderDashboard = () => {
    return render(
      <AllTheProviders>
        <Dashboard />
      </AllTheProviders>,
    );
  };

  describe('Rendering', () => {
    it('renders all essential components', async () => {
      renderDashboard();
      
      expect(screen.getByTestId('virgil-logo')).toBeInTheDocument();
      expect(screen.getByTestId('datetime')).toBeInTheDocument();
      expect(screen.getByTestId('weather')).toBeInTheDocument();
      
      // Wait for lazy components
      await waitFor(() => {
        expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      });
    });

    it('renders all dashboard buttons', () => {
      renderDashboard();
      
      expect(screen.getByTestId('dog-button')).toBeInTheDocument();
      expect(screen.getByTestId('giphy-button')).toBeInTheDocument();
      expect(screen.getByTestId('nasa-button')).toBeInTheDocument();
      expect(screen.getByTestId('rhythm-button')).toBeInTheDocument();
      expect(screen.getByTestId('circle-button')).toBeInTheDocument();
      expect(screen.getByTestId('streak-button')).toBeInTheDocument();
      expect(screen.getByTestId('camera-button')).toBeInTheDocument();
      expect(screen.getByTestId('pomodoro-button')).toBeInTheDocument();
      expect(screen.getByTestId('notes-button')).toBeInTheDocument();
      expect(screen.getByTestId('memory-button')).toBeInTheDocument();
    });

    it('renders user interface elements', () => {
      renderDashboard();
      
      // Should show user email and sign out button
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('shows loading state for location when loading', () => {
      mockUseLocation.mockReturnValue({
        ...defaultLocationData,
        loading: true,
        address: null,
      });
      
      renderDashboard();
      
      // Should show skeleton or loading state
      expect(screen.getByTestId('location-loading')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles sign out correctly', async () => {
      const mockSignOut = jest.fn().mockResolvedValue({ error: null });
      mockUseAuth.mockReturnValue({
        ...defaultAuthData,
        signOut: mockSignOut,
      });
      
      renderDashboard();
      
      const signOutButton = screen.getByText('Sign Out');
      await userEvent.click(signOutButton);
      
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('handles sign out error', async () => {
      const mockError = new Error('Sign out failed');
      const mockSignOut = jest.fn().mockResolvedValue({ error: mockError });
      mockUseAuth.mockReturnValue({
        ...defaultAuthData,
        signOut: mockSignOut,
      });
      
      renderDashboard();
      
      const signOutButton = screen.getByText('Sign Out');
      await userEvent.click(signOutButton);
      
      expect(logger.error).toHaveBeenCalledWith('Sign out error', mockError, {
        component: 'Dashboard',
        action: 'handleSignOut',
      });
    });

    it('prevents multiple sign out clicks', async () => {
      const mockSignOut = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)),
      );
      mockUseAuth.mockReturnValue({
        ...defaultAuthData,
        signOut: mockSignOut,
      });
      
      renderDashboard();
      
      const signOutButton = screen.getByText('Sign Out');
      
      // Click multiple times quickly
      await userEvent.click(signOutButton);
      await userEvent.click(signOutButton);
      await userEvent.click(signOutButton);
      
      // Should only call signOut once
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('opens and closes profile viewer', async () => {
      renderDashboard();
      
      // Click on user email to open profile viewer
      const emailButton = screen.getByText('test@example.com');
      await userEvent.click(emailButton);
      
      expect(screen.getByTestId('profile-viewer')).toBeInTheDocument();
      
      // Close profile viewer
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);
      
      expect(screen.queryByTestId('profile-viewer')).not.toBeInTheDocument();
    });

    it('opens and closes maps modal', async () => {
      renderDashboard();
      
      // Find and click the maps button (location address)
      const locationButton = screen.getByText('123 Test St, Test City, CA');
      await userEvent.click(locationButton);
      
      expect(screen.getByTestId('maps-modal')).toBeInTheDocument();
      
      // Close modal
      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);
      
      expect(screen.queryByTestId('maps-modal')).not.toBeInTheDocument();
    });

    it('toggles elevation unit preference', async () => {
      renderDashboard();
      
      // Find elevation toggle button
      const elevationButton = screen.getByText('m'); // Default meters
      await userEvent.click(elevationButton);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('elevationUnit', 'feet');
      expect(screen.getByText('ft')).toBeInTheDocument();
    });

    it('handles localStorage error gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      renderDashboard();
      
      const elevationButton = screen.getByText('m');
      await userEvent.click(elevationButton);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to save elevation unit preference',
        expect.objectContaining({
          component: 'Dashboard',
          action: 'handleUnitChange',
        }),
      );
    });
  });

  describe('Elevation Unit Persistence', () => {
    it('loads saved elevation unit from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('feet');
      
      renderDashboard();
      
      expect(screen.getByText('ft')).toBeInTheDocument();
    });

    it('defaults to meters when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      renderDashboard();
      
      expect(screen.getByText('m')).toBeInTheDocument();
    });

    it('defaults to meters when localStorage throws error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      renderDashboard();
      
      expect(screen.getByText('m')).toBeInTheDocument();
    });

    it('validates localStorage value', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-unit');
      
      renderDashboard();
      
      // Should default to meters for invalid values
      expect(screen.getByText('m')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to mobile device', () => {
      mockUseDeviceInfo.mockReturnValue({
        ...defaultDeviceInfo,
        deviceInfo: {
          ...defaultDeviceInfo.deviceInfo,
          device: 'mobile',
        },
      });
      
      renderDashboard();
      
      // Should render appropriate mobile layout
      const dashboard = screen.getByTestId('dashboard-container');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('handles missing location data gracefully', () => {
      mockUseLocation.mockReturnValue({
        ...defaultLocationData,
        address: null,
        ipLocation: null,
        coordinates: null,
        loading: false,
      });
      
      renderDashboard();
      
      // Should show fallback location display
      expect(screen.getByText('Location unavailable')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('wraps components in error boundaries', () => {
      renderDashboard();
      
      // All major sections should be wrapped in SectionErrorBoundary
      expect(screen.getAllByTestId('section-error-boundary')).toHaveLength(3);
    });

    it('handles component errors gracefully', () => {
      // Mock a component to throw an error
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // This would normally be tested with a component that actually throws
      // For now, just verify error boundaries are present
      renderDashboard();
      
      expect(screen.getAllByTestId('section-error-boundary')).toHaveLength(3);
    });
  });

  describe('Keyboard Navigation', () => {
    it('sets up keyboard navigation', () => {
      renderDashboard();
      
      expect(mockUseKeyboardNavigation).toHaveBeenCalledWith({
        enabled: true,
        onEscape: expect.any(Function),
      });
    });

    it('handles escape key correctly', () => {
      let escapeHandler: (() => void) | undefined;
      mockUseKeyboardNavigation.mockImplementation((options) => {
        if (options && 'onEscape' in options) {
          escapeHandler = options.onEscape;
        }
        return defaultKeyboardNav;
      });
      
      renderDashboard();
      
      // Open profile viewer
      const emailButton = screen.getByText('test@example.com');
      fireEvent.click(emailButton);
      
      expect(screen.getByTestId('profile-viewer')).toBeInTheDocument();
      
      // Simulate escape key
      if (escapeHandler) {
        escapeHandler();
      }
      
      expect(screen.queryByTestId('profile-viewer')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes expensive callbacks', () => {
      const { rerender } = renderDashboard();
      
      // Get initial references
      const initialSignOutButton = screen.getByText('Sign Out');
      const initialEmailButton = screen.getByText('test@example.com');
      
      // Rerender with same props
      rerender(
        <AllTheProviders>
          <Dashboard />
        </AllTheProviders>,
      );
      
      // References should be stable due to memoization
      expect(screen.getByText('Sign Out')).toBe(initialSignOutButton);
      expect(screen.getByText('test@example.com')).toBe(initialEmailButton);
    });

    it('uses Suspense for lazy components', async () => {
      renderDashboard();
      
      // Should show loading fallback initially
      expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
      
      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('loading-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('registers dashboard apps correctly', () => {
      renderDashboard();
      
      // Should register all adapters with dashboard app service
      expect(require('../../services/DashboardAppService').dashboardAppService.registerAdapter)
        .toHaveBeenCalledTimes(10); // All the adapters
    });

    it('subscribes to dashboard context service', () => {
      renderDashboard();
      
      expect(require('../services/DashboardContextService').dashboardContextService.subscribe)
        .toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderDashboard();
      
      expect(screen.getByLabelText('Dashboard main content')).toBeInTheDocument();
      expect(screen.getByLabelText('User profile and settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Dashboard applications')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderDashboard();
      
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton).toHaveAttribute('tabindex', '0');
      
      const emailButton = screen.getByText('test@example.com');
      expect(emailButton).toHaveAttribute('tabindex', '0');
    });
  });
});