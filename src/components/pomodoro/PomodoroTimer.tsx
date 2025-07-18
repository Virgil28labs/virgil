import { memo, useEffect, useState } from 'react'
import { 
  formatTime, 
  getSessionTypeName, 
  getSessionTypeColor,
  getProgressDashArray,
  getMotivationalPhrase,
  getRaccoonMessage
} from './utils/pomodoroUtils'
import { playTickSound } from './utils/pomodoroSounds'
import type { SessionType, PomodoroSettings } from '../../types/pomodoro.types'

interface PomodoroTimerProps {
  timeRemaining: number
  sessionType: SessionType | null
  progress: number
  isRunning: boolean
  isPaused: boolean
  completedPomodoros: number
  settings: PomodoroSettings
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
}

export const PomodoroTimer = memo(function PomodoroTimer({
  timeRemaining,
  sessionType,
  progress,
  isRunning,
  isPaused,
  completedPomodoros,
  settings,
  onStart,
  onPause,
  onReset,
  onSkip
}: PomodoroTimerProps) {
  const [showPhrase] = useState(true)
  const [currentPhrase, setCurrentPhrase] = useState<{ text: string; author?: string } | null>(null)

  // SVG dimensions
  const size = 200
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  // Get colors and styles
  const sessionColor = sessionType ? getSessionTypeColor(sessionType) : 'var(--lavender)'
  const sessionName = sessionType ? getSessionTypeName(sessionType) : 'Ready to Focus'

  // Update motivational phrase periodically
  useEffect(() => {
    if (!sessionType || !isRunning) {
      setCurrentPhrase(null)
      return
    }

    const updatePhrase = () => {
      const totalTime = sessionType === 'work' 
        ? settings.workDuration * 60
        : sessionType === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60

      const phrase = getMotivationalPhrase(sessionType, timeRemaining, totalTime)
      setCurrentPhrase(phrase)
    }

    updatePhrase()
    const interval = setInterval(updatePhrase, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [sessionType, isRunning, timeRemaining, settings])

  // Play tick sound in final seconds
  useEffect(() => {
    if (!isRunning || !settings.soundEnabled || !settings.tickSoundEnabled) return

    if (timeRemaining <= settings.tickSoundDuration && timeRemaining > 0) {
      playTickSound(settings.soundVolume * 0.5)
    }
  }, [timeRemaining, isRunning, settings])

  // Get progress dash array
  const dashArray = getProgressDashArray(progress, radius)

  // Completed pomodoros display
  const pomodoroDisplay = Array(4).fill(0).map((_, i) => (
    <span 
      key={i} 
      className={`pomodoro-indicator ${i < completedPomodoros ? 'completed' : ''}`}
    >
      🍅
    </span>
  ))

  return (
    <div className="pomodoro-timer">
      {/* Session Info */}
      <div className="session-info">
        <h3 className="session-type">{sessionName}</h3>
        <div className="pomodoro-track">
          {pomodoroDisplay}
        </div>
      </div>

      {/* Circular Timer */}
      <div className="timer-container">
        <svg 
          width={size} 
          height={size} 
          className="progress-ring"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(178, 165, 193, 0.2)"
            strokeWidth={strokeWidth}
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={sessionColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            className="progress-ring-circle"
            style={{
              transition: 'stroke-dasharray 0.5s ease-in-out',
              filter: `drop-shadow(0 0 8px ${sessionColor})`
            }}
          />
        </svg>

        {/* Time Display */}
        <div className="time-display">
          <div className="time-value">{formatTime(timeRemaining)}</div>
          {sessionType && isRunning && completedPomodoros < 4 && (
            <div className="raccoon-message">
              {getRaccoonMessage(sessionType, completedPomodoros)}
            </div>
          )}
        </div>
      </div>

      {/* Motivational Phrase - Only show when timer is active */}
      {showPhrase && currentPhrase && isRunning && (
        <div className="motivational-phrase">
          <p className="phrase-text">{currentPhrase.text}</p>
          {currentPhrase.author && (
            <p className="phrase-author">— {currentPhrase.author}</p>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="timer-controls">
        {!isRunning && !isPaused ? (
          <button 
            className="control-btn primary"
            onClick={onStart}
            aria-label="Start timer"
          >
            <span className="btn-icon">▶</span>
            <span className="btn-text">Start</span>
          </button>
        ) : isRunning ? (
          <button 
            className="control-btn secondary"
            onClick={onPause}
            aria-label="Pause timer"
          >
            <span className="btn-icon">⏸</span>
            <span className="btn-text">Pause</span>
          </button>
        ) : (
          <button 
            className="control-btn primary"
            onClick={onStart}
            aria-label="Resume timer"
          >
            <span className="btn-icon">▶</span>
            <span className="btn-text">Resume</span>
          </button>
        )}

        <button 
          className="control-btn ghost"
          onClick={onReset}
          aria-label="Reset timer"
          disabled={!sessionType}
        >
          <span className="btn-icon">↺</span>
          <span className="btn-text">Reset</span>
        </button>

        <button 
          className="control-btn ghost"
          onClick={onSkip}
          aria-label="Skip to next session"
          disabled={!sessionType}
        >
          <span className="btn-icon">⏭</span>
          <span className="btn-text">Skip</span>
        </button>
      </div>

      {/* Settings button moved to parent component */}
    </div>
  )
})