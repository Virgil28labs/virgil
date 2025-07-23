import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PomodoroTimer } from './PomodoroTimer';
import { useUserProfile } from '../../hooks/useUserProfile';

// Mock hooks
jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

// Mock Audio
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    type: '',
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { 
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
  })),
  currentTime: 0,
  destination: {},
}));

const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;

describe('PomodoroTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseUserProfile.mockReturnValue({
      profile: {
        nickname: 'TestUser',
        fullName: 'Test User',
        email: 'test@example.com',
        dateOfBirth: '',
        phone: '',
        gender: '',
        maritalStatus: '',
        uniqueId: '1',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: '',
        },
      },
      loading: false,
      saving: false,
      saveSuccess: false,
      validationErrors: {},
      updateField: jest.fn(),
      updateAddress: jest.fn(),
      saveProfile: jest.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      expect(screen.getByText('🍅 Pomodoro Timer')).toBeInTheDocument();
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<PomodoroTimer isOpen={false} onClose={jest.fn()} />);
      
      expect(screen.queryByText('🍅 Pomodoro Timer')).not.toBeInTheDocument();
    });

    it('shows default time of 25:00', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('shows preset time buttons', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.getByText('25m')).toBeInTheDocument();
    });
  });

  describe('Timer Selection', () => {
    it('updates time when preset button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('5m'));
      
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('increases time with right arrow key', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
      fireEvent.keyDown(panel, { key: 'ArrowRight' });
      
      expect(screen.getByText('26:00')).toBeInTheDocument();
    });

    it('decreases time with left arrow key', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
      fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      
      expect(screen.getByText('24:00')).toBeInTheDocument();
    });

    it('does not go below 1 minute', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      // Set to 5 minutes first
      await user.click(screen.getByText('5m'));
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
      // Try to go below 1 minute
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      }
      
      expect(screen.getByText('01:00')).toBeInTheDocument();
    });

    it('does not go above 60 minutes', () => {
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
      // Try to go above 60 minutes
      for (let i = 0; i < 40; i++) {
        fireEvent.keyDown(panel, { key: 'ArrowRight' });
      }
      
      expect(screen.getByText('60:00')).toBeInTheDocument();
    });
  });

  describe('Timer Controls', () => {
    it('starts timer when start button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('Start'));
      
      expect(screen.getByText('Pause')).toBeInTheDocument();
      
      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('24:59')).toBeInTheDocument();
      });
    });

    it('pauses timer when pause button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('Start'));
      
      // Let it run for 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      await user.click(screen.getByText('Pause'));
      
      expect(screen.getByText('Start')).toBeInTheDocument();
      
      // Advance more time - timer should not change
      const currentTime = screen.getByText(/\d{2}:\d{2}/).textContent;
      
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      expect(screen.getByText(/\d{2}:\d{2}/).textContent).toBe(currentTime);
    });

    it('resets timer when reset button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('Start'));
      
      // Let it run for 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await user.click(screen.getByText('Reset'));
      
      expect(screen.getByText('25:00')).toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('does not allow time selection while timer is running', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('Start'));
      
      // Preset buttons should not be visible while running
      expect(screen.queryByText('5m')).not.toBeInTheDocument();
      expect(screen.queryByText('10m')).not.toBeInTheDocument();
      expect(screen.queryByText('25m')).not.toBeInTheDocument();
    });
  });

  describe('Motivational Messages', () => {
    it('shows motivational message when timer starts', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      await user.click(screen.getByText('Start'));
      
      await waitFor(() => {
        expect(screen.getByText(/Let's do this, TestUser!/)).toBeInTheDocument();
      });
    });

    it('shows different messages based on progress', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      // Set to 1 minute for faster testing
      await user.click(screen.getByText('5m'));
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
      fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      
      await user.click(screen.getByText('Start'));
      
      // Run timer for 90% of the time (54 seconds)
      act(() => {
        jest.advanceTimersByTime(54000);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Final minute, TestUser!/)).toBeInTheDocument();
      });
    });
  });

  describe('Sound Controls', () => {
    it('toggles sound on and off', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      let soundButton = screen.getByLabelText('Disable sound');
      
      // Sound is on by default
      expect(soundButton).toHaveTextContent('🔊');
      
      await user.click(soundButton);
      
      // After clicking, the label changes
      soundButton = screen.getByLabelText('Enable sound');
      expect(soundButton).toHaveTextContent('🔇');
      
      await user.click(soundButton);
      
      // After clicking again, it's back to disable
      soundButton = screen.getByLabelText('Disable sound');
      expect(soundButton).toHaveTextContent('🔊');
    });
  });

  describe('Timer Completion', () => {
    it('shows celebration when timer completes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      // Set to 1 minute
      await user.click(screen.getByText('5m'));
      for (let i = 0; i < 4; i++) {
        const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!;
        fireEvent.keyDown(panel, { key: 'ArrowLeft' });
      }
      
      await user.click(screen.getByText('Start'));
      
      // Complete the timer
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Fantastic work, TestUser! You crushed it! 🎉/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('closes with close button', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = jest.fn();
      render(<PomodoroTimer isOpen onClose={onClose} />);
      
      await user.click(screen.getByLabelText('Close'));
      
      expect(onClose).toHaveBeenCalled();
    });

    it('starts and pauses with button clicks', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      // Start timer
      await user.click(screen.getByText('Start'));
      
      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument();
      });
      
      // Pause timer
      await user.click(screen.getByText('Pause'));
      
      await waitFor(() => {
        expect(screen.getByText('Start')).toBeInTheDocument();
      });
    });
  });

  describe('Focus Management', () => {
    it('focuses panel when opened', () => {
      const { rerender } = render(<PomodoroTimer isOpen={false} onClose={jest.fn()} />);
      
      rerender(<PomodoroTimer isOpen onClose={jest.fn()} />);
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel');
      expect(panel).toHaveFocus();
    });
  });
});