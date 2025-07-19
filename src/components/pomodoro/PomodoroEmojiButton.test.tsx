import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PomodoroEmojiButton } from './PomodoroEmojiButton'
import { EmojiButton } from '../common/EmojiButton'
import { PomodoroApp } from './PomodoroApp'

// Mock the EmojiButton component
jest.mock('../common/EmojiButton', () => ({
  EmojiButton: jest.fn(({ emoji, ariaLabel, GalleryComponent, onClick }) => (
    <button 
      aria-label={ariaLabel}
      onClick={() => {
        if (onClick) onClick()
        // Simulate opening the gallery
        if (GalleryComponent) {
          render(<GalleryComponent onClose={() => {}} />)
        }
      }}
    >
      {emoji}
    </button>
  ))
}))

// Mock PomodoroApp
jest.mock('./PomodoroApp', () => ({
  PomodoroApp: jest.fn(({ isOpen }) => 
    isOpen ? <div data-testid="pomodoro-app">Pomodoro App</div> : null
  )
}))

const mockEmojiButton = EmojiButton as jest.MockedFunction<typeof EmojiButton>
const mockPomodoroApp = PomodoroApp as jest.MockedFunction<typeof PomodoroApp>

describe('PomodoroEmojiButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders emoji button with tomato emoji', () => {
    render(<PomodoroEmojiButton />)
    
    expect(screen.getByText('🍅')).toBeInTheDocument()
  })

  it('has correct aria label', () => {
    render(<PomodoroEmojiButton />)
    
    expect(screen.getByLabelText('Open Pomodoro Timer')).toBeInTheDocument()
  })

  it('passes correct props to EmojiButton', () => {
    render(<PomodoroEmojiButton />)
    
    expect(mockEmojiButton).toHaveBeenCalledWith(
      expect.objectContaining({
        emoji: '🍅',
        ariaLabel: 'Open Pomodoro Timer',
        position: { top: '9.5rem', left: '1.9rem' },
        hoverScale: 1.15,
        hoverColor: {
          background: 'linear-gradient(135deg, rgba(239, 176, 194, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)',
          border: 'rgba(239, 176, 194, 0.6)',
          glow: 'rgba(239, 176, 194, 0.4)'
        },
        title: 'Pomodoro Timer',
        className: 'opacity-80 hover:opacity-100'
      }),
      expect.anything()
    )
  })

  it('opens PomodoroApp when clicked', async () => {
    const user = userEvent.setup()
    render(<PomodoroEmojiButton />)
    
    await user.click(screen.getByText('🍅'))
    
    expect(screen.getByTestId('pomodoro-app')).toBeInTheDocument()
  })

  it('passes GalleryComponent that renders PomodoroApp with isOpen=true', () => {
    render(<PomodoroEmojiButton />)
    
    const callArgs = mockEmojiButton.mock.calls[0][0]
    const GalleryComponent = callArgs.GalleryComponent
    
    // Test the wrapper component
    render(<GalleryComponent onClose={jest.fn()} />)
    
    expect(mockPomodoroApp).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function)
      }),
      expect.anything()
    )
  })
})