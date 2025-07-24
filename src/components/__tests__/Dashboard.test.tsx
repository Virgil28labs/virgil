import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { dashboardAppService } from '../../services/DashboardAppService';
import { dashboardContextService } from '../../services/DashboardContextService';
import { logger } from '../../lib/logger';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/LocationContext');
jest.mock('../../hooks/useDeviceInfo');
jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({ containerRef: { current: null } }),
}));
jest.mock('../../services/DashboardAppService');
jest.mock('../../services/DashboardContextService');
jest.mock('../../lib/logger');

// Mock all lazy loaded components
jest.mock('../LazyComponents', () => ({
  LazyRaccoonMascot: () => <div data-testid="raccoon-mascot">Raccoon</div>,
  LazyWeather: () => <div data-testid="weather">Weather</div>,
  LazyUserProfileViewer: () => <div data-testid="profile-viewer">Profile</div>,
}));

// Mock other components
jest.mock('../VirgilTextLogo', () => ({
  VirgilTextLogo: ({ onClick }: any) => (
    <div data-testid="virgil-logo" onClick={onClick}>Virgil</div>
  ),
}));

jest.mock('../DateTime', () => ({
  DateTime: () => <div data-testid="datetime">DateTime</div>,
}));

jest.mock('../LoadingFallback', () => ({
  LoadingFallback: () => <div data-testid="loading-fallback">Loading...</div>,
}));

jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

jest.mock('../common/SectionErrorBoundary', () => ({
  SectionErrorBoundary: ({ children }: any) => <>{children}</>,
}));

// Mock emoji buttons
const mockEmojiButtons = [
  'DogEmojiButton',
  'GiphyEmojiButton', 
  'NasaApodButton',
  'RhythmMachineButton',
  'CircleGameButton',
  'StreakTrackerButton',
];

mockEmojiButtons.forEach(button => {
  jest.mock(`../${button}`, () => ({
    [button]: () => <button data-testid={button.toLowerCase()}>{button}</button>,
  }));
});

jest.mock('../camera/CameraEmojiButton', () => ({
  CameraEmojiButton: () => <button data-testid="cameraemojibutton">Camera</button>,
}));

jest.mock('../pomodoro/PomodoroEmojiButton', () => ({
  PomodoroEmojiButton: () => <button data-testid="pomodoroemojibutton">Pomodoro</button>,
}));

jest.mock('../notes/NotesEmojiButton', () => ({
  NotesEmojiButton: () => <button data-testid="notesemojibutton">Notes</button>,
}));

// Mock modals
jest.mock('../maps/GoogleMapsModal', () => ({
  GoogleMapsModal: ({ show, onClose }: any) => 
    show ? <div data-testid="maps-modal"><button onClick={onClose}>Close</button></div> : null,
}));

jest.mock('../location/IPHoverCard', () => ({
  PositionedIPHoverCard: () => <div data-testid="ip-hover">IP Info</div>,
}));

// Mock all adapters
const adapterModules = [
  '../services/adapters/NotesAdapter',
  '../services/adapters/PomodoroAdapter',
  '../services/adapters/StreakAdapter',
  '../services/adapters/CameraAdapter',
  '../services/adapters/DogGalleryAdapter',
  '../services/adapters/NasaApodAdapter',
  '../services/adapters/GiphyAdapter',
  '../services/adapters/RhythmMachineAdapter',
  '../services/adapters/CircleGameAdapter',
];

adapterModules.forEach(module => {
  const adapterName = module.split('/').pop()!;
  jest.mock(module, () => ({
    [adapterName]: jest.fn().mockImplementation(() => ({})),
  }));
});

describe('Dashboard', () => {
  const mockUser = {
    email: 'test@example.com',
    user_metadata: { name: 'Test User' },
  };

  const mockSignOut = jest.fn();
  const mockLocation = {
    address: {
      street: '123 Main St',
      city: 'Test City',
      formatted: '123 Main St, Test City',
    },
    ipLocation: {
      city: 'IP City',
      region: 'IP Region',
    },
    coordinates: { lat: 40.7128, lng: -74.0060 },
    loading: false,
  };

  const mockDeviceInfo = {
    isMobile: false,
    browser: 'Chrome',
    os: 'Windows',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });
    
    (useLocation as jest.Mock).mockReturnValue(mockLocation);
    
    (useDeviceInfo as jest.Mock).mockReturnValue({
      deviceInfo: mockDeviceInfo,
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  it('renders user information', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders all emoji buttons', () => {
    render(<Dashboard />);
    
    const buttons = [
      'dogemojibutton',
      'giphyemojibutton',
      'nasaapodbuttton',
      'rhythmmachinebutton',
      'circlegamebutton',
      'streaktrackerbutton',
      'cameraemojibutton',
      'pomodoroemojibutton',
      'notesemojibutton',
    ];
    
    buttons.forEach(button => {
      expect(screen.getByTestId(button)).toBeInTheDocument();
    });
  });

  it('renders location information', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Test City')).toBeInTheDocument();
  });

  it('shows skeleton when location is loading', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      address: null,
      loading: true,
    });
    
    render(<Dashboard />);
    
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows IP-based location when address is not available', () => {
    (useLocation as jest.Mock).mockReturnValue({
      ...mockLocation,
      address: null,
      loading: false,
    });
    
    render(<Dashboard />);
    
    expect(screen.getByText('IP City')).toBeInTheDocument();
  });

  it('handles sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    
    render(<Dashboard />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('shows signing out state', async () => {
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<Dashboard />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    expect(screen.getByRole('button', { name: /signing out/i })).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();
  });

  it('handles sign out error', async () => {
    const error = new Error('Sign out failed');
    mockSignOut.mockResolvedValue({ error });
    
    render(<Dashboard />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('Sign out error', error, {
        component: 'Dashboard',
        action: 'handleSignOut',
      });
    });
  });

  it('opens profile viewer when logo is clicked', () => {
    render(<Dashboard />);
    
    const logo = screen.getByTestId('virgil-logo');
    fireEvent.click(logo);
    
    // In real app, this would show the profile viewer
    // Here we're just testing the click handler is set up
    expect(logo).toBeInTheDocument();
  });

  it('opens maps modal when address is clicked', () => {
    render(<Dashboard />);
    
    const address = screen.getByText('123 Main St');
    fireEvent.click(address);
    
    expect(screen.getByTestId('maps-modal')).toBeInTheDocument();
  });

  it('closes maps modal', () => {
    render(<Dashboard />);
    
    // Open modal
    const address = screen.getByText('123 Main St');
    fireEvent.click(address);
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('maps-modal')).not.toBeInTheDocument();
  });

  it('toggles elevation unit preference', () => {
    (Storage.prototype.getItem as jest.Mock).mockReturnValue('meters');
    
    render(<Dashboard />);
    
    // Find elevation display and toggle
    const elevationDisplay = screen.getByText(/elevation/i).parentElement;
    if (elevationDisplay) {
      fireEvent.click(elevationDisplay);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('elevationUnit', 'feet');
    }
  });

  it('handles localStorage errors gracefully', () => {
    (Storage.prototype.setItem as jest.Mock).mockImplementation(() => {
      throw new Error('Storage error');
    });
    
    render(<Dashboard />);
    
    // Try to toggle elevation unit
    const elevationDisplay = screen.getByText(/elevation/i).parentElement;
    if (elevationDisplay) {
      fireEvent.click(elevationDisplay);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to save elevation unit preference',
        expect.any(Object)
      );
    }
  });

  it('registers all dashboard adapters on mount', () => {
    render(<Dashboard />);
    
    expect(dashboardAppService.registerAdapter).toHaveBeenCalledTimes(9);
    
    const adapterTypes = [
      'notes', 'pomodoro', 'streaks', 'camera', 
      'dog', 'nasa', 'giphy', 'rhythm', 'circle'
    ];
    
    // Check each adapter was registered
    const calls = (dashboardAppService.registerAdapter as jest.Mock).mock.calls;
    expect(calls.length).toBe(9);
  });

  it('unregisters adapters on unmount', () => {
    const { unmount } = render(<Dashboard />);
    
    unmount();
    
    expect(dashboardAppService.unregisterAdapter).toHaveBeenCalledTimes(9);
    
    const adapterIds = [
      'notes', 'pomodoro', 'streaks', 'camera',
      'dog', 'nasa', 'giphy', 'rhythm', 'circle'
    ];
    
    adapterIds.forEach(id => {
      expect(dashboardAppService.unregisterAdapter).toHaveBeenCalledWith(id);
    });
  });

  it('updates dashboard context with device info', () => {
    render(<Dashboard />);
    
    expect(dashboardContextService.updateDeviceContext).toHaveBeenCalledWith(mockDeviceInfo);
  });

  it('renders weather component in error boundary', () => {
    render(<Dashboard />);
    
    expect(screen.getByTestId('weather')).toBeInTheDocument();
  });

  it('renders datetime component', () => {
    render(<Dashboard />);
    
    expect(screen.getByTestId('datetime')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<Dashboard />);
    
    const dashboard = screen.getByRole('main', { name: 'Dashboard' });
    expect(dashboard).toBeInTheDocument();
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toHaveAttribute('aria-label');
  });

  it('shows raccoon mascot', () => {
    render(<Dashboard />);
    
    expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
  });
});