import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/button';
import { usePomodoro } from './usePomodoro';
import './Pomodoro.css';

interface PomodoroTimerProps {
  isOpen: boolean
  onClose: () => void
}

// Constants
const PRESET_TIMES = [5, 10, 25];
const DEFAULT_MINUTES = 25;

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ isOpen, onClose }) => {
  const { 
    state, 
    progress, 
    formatTime, 
    setMinutes, 
    start, 
    pause, 
    reset, 
    toggleSound, 
  } = usePomodoro(DEFAULT_MINUTES);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🍅 Pomodoro Timer"
      className="pomodoro-modal"
      size="small"
    >
      <div className="pomodoro-content">
        {/* Time Display */}
        <div className="time-display">{formatTime(state.timeRemaining)}</div>

        {/* Simple Progress Circle */}
        <div className="progress-container">
          <svg className="progress-ring" width="200" height="200">
            <circle
              className="progress-ring-bg"
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="rgba(178, 165, 193, 0.2)"
              strokeWidth="8"
            />
            <circle
              className="progress-ring-fill"
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="#6c3baa"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
            />
          </svg>
        </div>

        {/* Preset Buttons */}
        {!state.isRunning && (
          <div className="preset-buttons">
            {PRESET_TIMES.map(minutes => (
              <Button
                key={minutes}
                variant={state.selectedMinutes === minutes ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinutes(minutes)}
              >
                {minutes}m
              </Button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="controls">
          {!state.isRunning ? (
            <Button 
              onClick={start}
              disabled={state.timeRemaining === 0}
            >
              Start
            </Button>
          ) : (
            <Button onClick={pause}>
              Pause
            </Button>
          )}

          <Button 
            variant="secondary" 
            onClick={reset}
          >
            Reset
          </Button>

          <Button
            variant="secondary"
            onClick={toggleSound}
            aria-label={state.soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            {state.soundEnabled ? '🔊' : '🔇'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};