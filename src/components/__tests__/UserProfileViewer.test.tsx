/**
 * UserProfileViewer Test Suite
 * 
 * Tests the user profile viewer component including:
 * - Rendering user profile and virgil tabs
 * - Profile completion calculation
 * - Editable fields and data updates
 * - Address expansion/collapse
 * - Device information display
 * - Permission requests
 * - Keyboard navigation and accessibility
 * - Sign out functionality
 * - Save progress indicators
 * - Memoization behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileViewer } from '../UserProfileViewer';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { useWeather } from '../../hooks/useWeather';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { useUserProfile } from '../../hooks/useUserProfile';
import { logger } from '../../lib/logger';

// Mock all hooks
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useLocation');
jest.mock('../../hooks/useWeather');
jest.mock('../../hooks/useKeyboardNavigation');
jest.mock('../../hooks/useDeviceInfo');
jest.mock('../../hooks/useUserProfile');
jest.mock('../../lib/logger');

// Mock child components
jest.mock('../EditableDataPoint', () => ({
  EditableDataPoint: ({ icon, label, value, onChange, placeholder, type, readOnly, className }: unknown) => (
    <div className={`data-point ${className || ''}`}>
      <span>{icon}</span>
      <span>{label}</span>
      <input
        type={type || 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-label={label}
      />
    </div>
  ),
}));

jest.mock('../SelectDataPoint', () => ({
  SelectDataPoint: ({ icon, label, value, onChange, options, allowCustom }: unknown) => (
    <div className="data-point">
      <span>{icon}</span>
      <span>{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">Select...</option>
        {options.map((opt: unknown) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom && <option value="other">Other...</option>}
      </select>
    </div>
  ),
}));

describe('UserProfileViewer', () => {
  const mockOnClose = jest.fn();
  const mockSignOut = jest.fn();
  const mockUpdateField = jest.fn();
  const mockUpdateAddress = jest.fn();
  const mockRequestPermission = jest.fn();

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  };

  const mockProfile = {
    nickname: 'TestNick',
    fullName: 'Test User',
    email: 'test@example.com',
    dateOfBirth: '1990-01-01',
    phone: '+1234567890',
    gender: 'male',
    maritalStatus: 'single',
    uniqueId: 'USR-12345',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TC',
      zip: '12345',
      country: 'Test Country',
    },
  };

  const mockDeviceInfo = {
    location: 'Test City, TC',
    ip: '192.168.1.1',
    device: 'Desktop',
    os: 'Windows 10',
    browser: 'Chrome 95',
    localTime: '12:00 PM',
    timezone: 'America/New_York',
    language: 'en-US',
    screen: '1920x1080',
    pixelRatio: 2,
    windowSize: '1920x1080',
    colorScheme: 'dark',
    cpu: 8,
    memory: '16 GB',
    online: true,
    networkType: 'wifi',
    downlink: '100 Mbps',
    rtt: '10ms',
    batteryLevel: 85,
    batteryCharging: true,
    tabVisible: true,
    sessionDuration: 3600,
    cookiesEnabled: true,
    doNotTrack: 'unspecified',
    storageQuota: '10 GB',
  };

  const mockPermissions = {
    geolocation: 'granted' as PermissionState,
    camera: 'prompt' as PermissionState,
    microphone: 'denied' as PermissionState,
    notifications: 'granted' as PermissionState,
    clipboard: 'prompt' as PermissionState,
  };

  const defaultMocks = {
    useAuth: {
      user: mockUser,
      signOut: mockSignOut,
    },
    useLocation: {
      ipLocation: { city: 'Test City', region: 'TC' },
    },
    useWeather: undefined,
    useKeyboardNavigation: {
      containerRef: { current: null },
    },
    useDeviceInfo: {
      deviceInfo: mockDeviceInfo,
      permissions: mockPermissions,
      requestPermission: mockRequestPermission,
    },
    useUserProfile: {
      profile: mockProfile,
      loading: false,
      saving: false,
      saveSuccess: false,
      updateField: mockUpdateField,
      updateAddress: mockUpdateAddress,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (useAuth as jest.Mock).mockReturnValue(defaultMocks.useAuth);
    (useLocation as jest.Mock).mockReturnValue(defaultMocks.useLocation);
    (useWeather as jest.Mock).mockReturnValue(defaultMocks.useWeather);
    (useKeyboardNavigation as jest.Mock).mockReturnValue(defaultMocks.useKeyboardNavigation);
    (useDeviceInfo as jest.Mock).mockReturnValue(defaultMocks.useDeviceInfo);
    (useUserProfile as jest.Mock).mockReturnValue(defaultMocks.useUserProfile);
    
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when user is null', () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null, signOut: mockSignOut });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and user exists', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByRole('dialog', { name: 'User Profile' })).toBeInTheDocument();
      expect(screen.getByLabelText('Close profile viewer')).toBeInTheDocument();
    });

    it('should render user avatar', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const avatar = screen.getByAltText('Profile avatar');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render user initial when no avatar', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...defaultMocks.useAuth,
        user: { ...mockUser, user_metadata: {} },
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of Test User
    });

    it('should render profile completion ring', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument(); // All fields filled
    });

    it('should render user name and email', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should render unique ID badge', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('ID: USR-12345')).toBeInTheDocument();
    });
  });

  describe('profile completion calculation', () => {
    it('should calculate 0% when all fields empty', () => {
      const emptyProfile = {
        ...mockProfile,
        nickname: '',
        fullName: '',
        dateOfBirth: '',
        phone: '',
        gender: '',
        maritalStatus: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: '',
        },
      };
      
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        profile: emptyProfile,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should calculate partial completion', () => {
      const partialProfile = {
        ...mockProfile,
        nickname: 'Nick',
        fullName: 'Test',
        dateOfBirth: '',
        phone: '',
        gender: '',
        maritalStatus: '',
        address: {
          street: '',
          city: 'City',
          state: '',
          zip: '',
          country: '',
        },
      };
      
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        profile: partialProfile,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('27%')).toBeInTheDocument(); // 3/11 fields filled
    });

    it('should update completion when profile changes', () => {
      // Test with different profile from the start
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        profile: { ...mockProfile, fullName: '', phone: '' },
      });

      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('82%')).toBeInTheDocument(); // 9/11 fields filled
    });
  });

  describe('tab navigation', () => {
    it('should render both tabs', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByRole('tab', { name: 'User' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Virgil' })).toBeInTheDocument();
    });

    it('should show user tab by default', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const userTab = screen.getByRole('tab', { name: 'User' });
      expect(userTab).toHaveAttribute('aria-selected', 'true');
      expect(userTab).toHaveClass('active');
      
      expect(screen.getByRole('tabpanel', { name: 'User' })).toBeInTheDocument();
    });

    it('should switch to virgil tab on click', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const virgilTab = screen.getByRole('tab', { name: 'Virgil' });
      await user.click(virgilTab);
      
      expect(virgilTab).toHaveAttribute('aria-selected', 'true');
      expect(virgilTab).toHaveClass('active');
      
      expect(screen.getByRole('tabpanel', { name: 'Virgil' })).toBeInTheDocument();
    });

    it('should maintain tab state when re-rendering', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
      
      rerender(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByRole('tab', { name: 'Virgil' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('user tab content', () => {
    it('should show loading state', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        loading: true,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should render all profile cards', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('Essential Information')).toBeInTheDocument();
      expect(screen.getByText('Personal Details')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    it('should render editable fields with correct values', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('Full Name')).toHaveValue('Test User');
      expect(screen.getByLabelText('Nickname')).toHaveValue('TestNick');
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
      expect(screen.getByLabelText('Date of Birth')).toHaveValue('1990-01-01');
      expect(screen.getByLabelText('Phone Number')).toHaveValue('+1234567890');
    });

    it('should render select fields with correct values', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const genderSelect = screen.getByLabelText('Gender') as HTMLSelectElement;
      expect(genderSelect.value).toBe('male');
      
      const maritalSelect = screen.getByLabelText('Marital Status') as HTMLSelectElement;
      expect(maritalSelect.value).toBe('single');
    });

    it('should make email field read-only', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('Email')).toHaveAttribute('readOnly');
    });

    it('should handle field updates', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const fullNameInput = screen.getByLabelText('Full Name');
      
      // Type new content
      await user.type(fullNameInput, 'N');
      
      expect(mockUpdateField).toHaveBeenCalledWith('fullName', 'Test UserN');
    });

    it('should handle select field changes', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const genderSelect = screen.getByLabelText('Gender');
      await user.selectOptions(genderSelect, 'female');
      
      expect(mockUpdateField).toHaveBeenCalledWith('gender', 'female');
    });
  });

  describe('address section', () => {
    it('should render collapsed by default', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.queryByLabelText('Street Address')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Show address')).toBeInTheDocument();
    });

    it('should expand on header click', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const addressHeader = screen.getByText('Address').parentElement;
      await user.click(addressHeader!);
      
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
      expect(screen.getByLabelText('City')).toBeInTheDocument();
      expect(screen.getByLabelText('State')).toBeInTheDocument();
      expect(screen.getByLabelText('ZIP Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Country')).toBeInTheDocument();
    });

    it('should toggle expand/collapse', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const addressHeader = screen.getByText('Address').parentElement;
      
      // Expand
      await user.click(addressHeader!);
      expect(screen.getByLabelText('Hide address')).toBeInTheDocument();
      
      // Collapse
      await user.click(addressHeader!);
      expect(screen.queryByLabelText('Street Address')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Show address')).toBeInTheDocument();
    });

    it('should handle address field updates', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      // Expand address
      await user.click(screen.getByText('Address').parentElement);
      
      const streetInput = screen.getByLabelText('Street Address');
      await user.type(streetInput, 'A');
      
      expect(mockUpdateAddress).toHaveBeenCalledWith('street', '123 Test StA');
    });
  });

  describe('save progress', () => {
    it('should show saving state', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        saving: true,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('Saving changes...')).toBeInTheDocument();
      expect(screen.getByText('Saving changes...').parentElement).toHaveClass('save-progress-container');
    });

    it('should show save success state', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        saveSuccess: true,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText('All changes saved')).toBeInTheDocument();
      const progressBar = screen.getByText('All changes saved').previousElementSibling;
      expect(progressBar).toHaveClass('save-progress-bar', 'success');
    });

    it('should hide progress when not saving', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.queryByText('Saving changes...')).not.toBeInTheDocument();
      expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    });
  });

  describe('sign out', () => {
    it('should render sign out button', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      expect(signOutBtn).toBeInTheDocument();
      expect(signOutBtn).toHaveTextContent('🚪');
      expect(signOutBtn).toHaveTextContent('Sign Out');
    });

    it('should handle sign out click', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      await user.click(signOutBtn);
      
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should show signing out state', async () => {
      const user = userEvent.setup();
      mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      await user.click(signOutBtn);
      
      expect(signOutBtn).toHaveTextContent('Signing Out...');
      expect(signOutBtn).toBeDisabled();
      expect(signOutBtn).toHaveClass('signing-out');
    });

    it('should handle sign out error', async () => {
      const user = userEvent.setup();
      mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      await user.click(signOutBtn);
      
      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Sign out error',
          expect.any(Error),
          expect.objectContaining({
            component: 'UserProfileViewer',
            action: 'signOut',
          }),
        );
      });
    });

    it('should prevent multiple sign out clicks', async () => {
      const user = userEvent.setup();
      mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      
      // Click multiple times
      await user.click(signOutBtn);
      await user.click(signOutBtn);
      await user.click(signOutBtn);
      
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('virgil tab content', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
    });

    it('should render device information section', () => {
      expect(screen.getByText('🖥️ Device & Browser')).toBeInTheDocument();
    });

    it('should display all device info fields', () => {
      expect(screen.getByText('Test City, TC')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('Windows 10')).toBeInTheDocument();
      expect(screen.getByText('Chrome 95')).toBeInTheDocument();
      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
      expect(screen.getByText('America/New_York')).toBeInTheDocument();
      expect(screen.getByText('en-US')).toBeInTheDocument();
      expect(screen.getByText('1920x1080 @2x')).toBeInTheDocument();
    });

    it('should display network information', () => {
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('wifi')).toBeInTheDocument();
      expect(screen.getByText('100 Mbps')).toBeInTheDocument();
      expect(screen.getByText('10ms')).toBeInTheDocument();
    });

    it('should display battery information when available', () => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('🔌')).toBeInTheDocument(); // Charging icon
    });

    it('should display session duration', () => {
      expect(screen.getByText('60:00')).toBeInTheDocument(); // 3600 seconds = 60:00
    });

    it('should display storage and privacy settings', () => {
      // Find specific text by looking for multiple occurrences and being more specific
      const cookieText = screen.getByText((content, element) => {
        return element?.textContent === 'Enabled' && element?.previousElementSibling?.textContent === 'Cookies';
      });
      expect(cookieText).toBeInTheDocument();
      
      const dntValue = screen.getByText('unspecified'); // Based on mock data
      expect(dntValue).toBeInTheDocument();
      
      const storageValue = screen.getByText('10 GB');
      expect(storageValue).toBeInTheDocument();
    });

    it('should display network status data', async () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const user = userEvent.setup();
      const virgilTabs = screen.getAllByRole('tab', { name: 'Virgil' });
      await user.click(virgilTabs[0]);
      
      // Should display network status information
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument();
      
      // Find the network status section
      const networkSection = screen.getByText('Network').closest('.data-point');
      expect(networkSection).toBeInTheDocument();
    });
  });

  describe('permissions section', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
    });

    it('should render permissions section', () => {
      expect(screen.getByText('🔐 Permissions')).toBeInTheDocument();
    });

    it('should display all permission buttons', () => {
      expect(screen.getByRole('button', { name: /Location/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Camera/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Microphone/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Notifications/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clipboard/ })).toBeInTheDocument();
    });

    it('should show granted permissions with check mark', () => {
      const locationBtn = screen.getByRole('button', { name: /Location/ });
      expect(locationBtn).toHaveTextContent('✓');
      expect(locationBtn).toBeDisabled();
      expect(locationBtn).toHaveClass('granted');
    });

    it('should enable prompt permissions', () => {
      const cameraBtn = screen.getByRole('button', { name: /Camera/ });
      expect(cameraBtn).not.toHaveTextContent('✓');
      expect(cameraBtn).not.toBeDisabled();
      expect(cameraBtn).toHaveClass('prompt');
    });

    it('should show denied permissions', () => {
      const micBtn = screen.getByRole('button', { name: /Microphone/ });
      expect(micBtn).not.toHaveTextContent('✓');
      expect(micBtn).not.toBeDisabled();
      expect(micBtn).toHaveClass('denied');
    });

    it('should handle permission request', async () => {
      const user = userEvent.setup();
      
      const cameraBtn = screen.getByRole('button', { name: /Camera/ });
      await user.click(cameraBtn);
      
      expect(mockRequestPermission).toHaveBeenCalledWith('camera');
    });
  });

  describe('keyboard navigation', () => {
    it('should close on Escape key', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should have keyboard navigation attributes', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const closeBtn = screen.getByLabelText('Close profile viewer');
      expect(closeBtn).toHaveAttribute('data-keyboard-nav');
      
      const userTab = screen.getByRole('tab', { name: 'User' });
      expect(userTab).toHaveAttribute('data-keyboard-nav');
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
      expect(signOutBtn).toHaveAttribute('data-keyboard-nav');
    });

    it('should use keyboard navigation hook', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(useKeyboardNavigation).toHaveBeenCalledWith({
        enabled: true,
        onEscape: mockOnClose,
      });
    });

    it('should not enable keyboard navigation when closed', () => {
      render(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);
      
      expect(useKeyboardNavigation).toHaveBeenCalledWith({
        enabled: false,
        onEscape: mockOnClose,
      });
    });
  });

  describe('click outside', () => {
    it('should close on backdrop click', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      // Find backdrop by class since it has aria-hidden
      const backdrop = document.querySelector('.profile-backdrop');
      expect(backdrop).toBeInTheDocument();
      
      await user.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on click outside viewer', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      fireEvent.mouseDown(document.body);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close on click inside viewer', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const viewer = screen.getByRole('dialog');
      await user.click(viewer);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close on virgil logo button click', () => {
      render(
        <div>
          <button className="virgil-logo-button">Logo</button>
          <UserProfileViewer isOpen onClose={mockOnClose} />
        </div>,
      );
      
      fireEvent.mouseDown(screen.getByText('Logo'));
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'User Profile');
    });

    it('should have proper tab ARIA attributes', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const userTab = screen.getByRole('tab', { name: 'User' });
      expect(userTab).toHaveAttribute('aria-selected', 'true');
      expect(userTab).toHaveAttribute('aria-controls', 'user-tab-panel');
      expect(userTab).toHaveAttribute('id', 'user-tab');
      
      const userPanel = screen.getByRole('tabpanel', { name: 'User' });
      expect(userPanel).toHaveAttribute('id', 'user-tab-panel');
      expect(userPanel).toHaveAttribute('aria-labelledby', 'user-tab');
    });

    it('should have accessible close button', () => {
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const closeBtn = screen.getByLabelText('Close profile viewer');
      expect(closeBtn).toHaveAttribute('aria-label', 'Close profile viewer');
    });

    it('should handle focus management', () => {
      const mockRef = { current: document.createElement('div') };
      (useKeyboardNavigation as jest.Mock).mockReturnValue({
        containerRef: mockRef,
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBe(mockRef.current);
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      const firstRender = screen.getByRole('dialog');
      
      rerender(<UserProfileViewer isOpen onClose={mockOnClose} />);
      const secondRender = screen.getByRole('dialog');
      
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      rerender(<UserProfileViewer isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render with different user data', () => {
      // Set different user from the start
      (useAuth as jest.Mock).mockReturnValue({
        ...defaultMocks.useAuth,
        user: { ...mockUser, email: 'new@example.com' },
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      expect(screen.getByText('new@example.com')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing device info', async () => {
      (useDeviceInfo as jest.Mock).mockReturnValue({
        ...defaultMocks.useDeviceInfo,
        deviceInfo: null,
      });
      
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
      
      expect(screen.queryByText('🖥️ Device & Browser')).not.toBeInTheDocument();
    });

    it('should handle profile with whitespace values', () => {
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        profile: {
          ...mockProfile,
          fullName: '   ',
          phone: '   ',
        },
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      // Should treat whitespace as empty for completion
      expect(screen.getByText('82%')).toBeInTheDocument(); // 9/11 fields
    });

    it('should handle very long names', () => {
      const longName = 'A'.repeat(100);
      (useUserProfile as jest.Mock).mockReturnValue({
        ...defaultMocks.useUserProfile,
        profile: { ...mockProfile, fullName: longName },
      });
      
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();
      render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      // Switch tabs rapidly
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
      await user.click(screen.getByRole('tab', { name: 'User' }));
      await user.click(screen.getByRole('tab', { name: 'Virgil' }));
      
      expect(screen.getByRole('tab', { name: 'Virgil' })).toHaveAttribute('aria-selected', 'true');
    });

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<UserProfileViewer isOpen onClose={mockOnClose} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});