import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PomodoroTimer } from './PomodoroTimer'
import { useUserProfile } from '../../hooks/useUserProfile'

// Mock hooks
jest.mock('../../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn()
}))

// Mock Audio
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    type: '',
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { 
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  })),
  currentTime: 0,
  destination: {}
}))

const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>

describe('PomodoroTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: '1',
        nickname: 'TestUser',
        fullName: 'Test User',
        email: 'test@example.com',
        avatarEmoji: '🧪',
        joinedAt: new Date('2024-01-01')
      },
      isLoading: false,
      updateProfile: jest.fn()
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders when open', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      expect(screen.getByText('🍅 Pomodoro Timer')).toBeInTheDocument()
      expect(screen.getByText('25:00')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<PomodoroTimer isOpen={false} onClose={jest.fn()} />)
      
      expect(screen.queryByText('🍅 Pomodoro Timer')).not.toBeInTheDocument()
    })

    it('shows default time of 25:00', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      expect(screen.getByText('25:00')).toBeInTheDocument()
    })

    it('shows preset time buttons', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      expect(screen.getByText('5m')).toBeInTheDocument()
      expect(screen.getByText('10m')).toBeInTheDocument()
      expect(screen.getByText('25m')).toBeInTheDocument()
    })
  })

  describe('Timer Selection', () => {
    it('updates time when preset button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('5m'))
      
      expect(screen.getByText('05:00')).toBeInTheDocument()
    })

    it('increases time with right arrow key', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!
      fireEvent.keyDown(panel, { key: 'ArrowRight' })
      
      expect(screen.getByText('26:00')).toBeInTheDocument()
    })

    it('decreases time with left arrow key', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!
      fireEvent.keyDown(panel, { key: 'ArrowLeft' })
      
      expect(screen.getByText('24:00')).toBeInTheDocument()
    })

    it('does not go below 1 minute', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      // Set to 5 minutes first
      await user.click(screen.getByText('5m'))
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!
      // Try to go below 1 minute
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(panel, { key: 'ArrowLeft' })
      }
      
      expect(screen.getByText('01:00')).toBeInTheDocument()
    })

    it('does not go above 60 minutes', () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      const panel = screen.getByText('🍅 Pomodoro Timer').closest('.pomodoro-panel')!
      // Try to go above 60 minutes
      for (let i = 0; i < 40; i++) {
        fireEvent.keyDown(panel, { key: 'ArrowRight' })
      }
      
      expect(screen.getByText('60:00')).toBeInTheDocument()
    })
  })

  describe('Timer Controls', () => {
    it('starts timer when start button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('Start'))
      
      expect(screen.getByText('Pause')).toBeInTheDocument()
      
      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      await waitFor(() => {
        expect(screen.getByText('24:59')).toBeInTheDocument()
      })
    })

    it('pauses timer when pause button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('Start'))
      
      // Let it run for 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      await user.click(screen.getByText('Pause'))
      
      expect(screen.getByText('Resume')).toBeInTheDocument()
      
      // Advance more time - timer should not change
      const currentTime = screen.getByText(/\d{2}:\d{2}/).textContent
      
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      expect(screen.getByText(/\d{2}:\d{2}/).textContent).toBe(currentTime)
    })

    it('resets timer when reset button is clicked', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('Start'))
      
      // Let it run for 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      
      await user.click(screen.getByText('Reset'))
      
      expect(screen.getByText('25:00')).toBeInTheDocument()
      expect(screen.getByText('Start')).toBeInTheDocument()
    })

    it('does not allow time selection while timer is running', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('Start'))
      
      // Try to click a preset button
      await user.click(screen.getByText('5m'))
      
      // Time should not change
      expect(screen.queryByText('05:00')).not.toBeInTheDocument()
    })
  })

  describe('Motivational Messages', () => {
    it('shows motivational message when timer starts', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      await user.click(screen.getByText('Start'))
      
      await waitFor(() => {
        expect(screen.getByText(/Let's do this, TestUser!/)).toBeInTheDocument()
      })
    })

    it('shows different messages based on progress', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      // Set to 1 minute for faster testing
      await user.click(screen.getByText('5m'))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
      
      await user.click(screen.getByText('Start'))
      
      // Run timer for 90% of the time (54 seconds)
      act(() => {
        jest.advanceTimersByTime(54000)
      })
      
      await waitFor(() => {
        expect(screen.getByText(/Final minute, TestUser!/)).toBeInTheDocument()
      })
    })
  })

  describe('Sound Controls', () => {
    it('toggles sound on and off', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      const soundButton = screen.getByLabelText('Toggle sound')
      
      // Sound is on by default
      expect(soundButton).toHaveTextContent('🔊')
      
      await user.click(soundButton)
      
      expect(soundButton).toHaveTextContent('🔇')
      
      await user.click(soundButton)
      
      expect(soundButton).toHaveTextContent('🔊')
    })
  })

  describe('Timer Completion', () => {
    it('shows celebration when timer completes', async () => {
      const user = userEvent.setup({ delay: null })
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      // Set to 1 minute
      await user.click(screen.getByText('5m'))
      for (let i = 0; i < 4; i++) {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' })
      }
      
      await user.click(screen.getByText('Start'))
      
      // Complete the timer
      act(() => {
        jest.advanceTimersByTime(60000)
      })
      
      await waitFor(() => {
        expect(screen.getByText(/Fantastic work, TestUser!/)).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('closes with Escape key', () => {
      const onClose = jest.fn()
      render(<PomodoroTimer isOpen={true} onClose={onClose} />)
      
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      
      expect(onClose).toHaveBeenCalled()
    })

    it('starts/pauses with spacebar', async () => {
      render(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' })
      
      await waitFor(() => {
        expect(screen.getByText('Pause')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' })
      
      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument()
      })
    })
  })

  describe('Focus Management', () => {
    it('focuses panel when opened', () => {
      const { rerender } = render(<PomodoroTimer isOpen={false} onClose={jest.fn()} />)
      
      rerender(<PomodoroTimer isOpen={true} onClose={jest.fn()} />)
      
      expect(screen.getByRole('dialog')).toHaveFocus()
    })
  })
})