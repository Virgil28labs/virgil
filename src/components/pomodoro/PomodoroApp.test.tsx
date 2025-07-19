import { render, screen } from '@testing-library/react'
import { PomodoroApp } from './PomodoroApp'
import { PomodoroTimer } from './PomodoroTimer'

// Mock the PomodoroTimer component
jest.mock('./PomodoroTimer', () => ({
  PomodoroTimer: jest.fn(() => <div data-testid="pomodoro-timer">Mocked Timer</div>)
}))

const mockPomodoroTimer = PomodoroTimer as jest.MockedFunction<typeof PomodoroTimer>

describe('PomodoroApp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders PomodoroTimer when open', () => {
    render(<PomodoroApp isOpen={true} onClose={jest.fn()} />)
    
    expect(screen.getByTestId('pomodoro-timer')).toBeInTheDocument()
  })

  it('passes isOpen prop to PomodoroTimer', () => {
    const onClose = jest.fn()
    render(<PomodoroApp isOpen={true} onClose={onClose} />)
    
    expect(mockPomodoroTimer).toHaveBeenCalled()
    expect(mockPomodoroTimer.mock.calls[0][0]).toMatchObject({
      isOpen: true,
      onClose: onClose
    })
  })

  it('passes onClose prop to PomodoroTimer', () => {
    const onClose = jest.fn()
    render(<PomodoroApp isOpen={false} onClose={onClose} />)
    
    expect(mockPomodoroTimer).toHaveBeenCalled()
    expect(mockPomodoroTimer.mock.calls[0][0]).toMatchObject({
      isOpen: false,
      onClose: onClose
    })
  })
})