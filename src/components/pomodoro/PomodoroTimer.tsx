import { memo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../ui/button';
import { usePomodoro } from './usePomodoro';
import { pomodoroAdapter } from '../../services/adapters/PomodoroAdapter';
import styles from './Pomodoro.module.css';

interface PomodoroTimerProps {
  isOpen: boolean
  onClose: () => void
}

// Constants
const PRESET_TIMES = [5, 10, 25];
const DEFAULT_MINUTES = 25;

export const PomodoroTimer = memo(function PomodoroTimer({ isOpen, onClose }: PomodoroTimerProps) {
  const {
    state,
    progress,
    formatTime,
    setMinutes,
    start,
    pause,
    reset,
    toggleSound,
    setSessionType,
    setTask,
  } = usePomodoro(DEFAULT_MINUTES);

  // Update PomodoroAdapter with timer state
  useEffect(() => {
    pomodoroAdapter.updateTimerState(isOpen, state.isRunning, {
      selectedMinutes: state.selectedMinutes,
      timeRemaining: state.timeRemaining,
      sessionType: state.sessionType,
      sessionCount: state.sessionCount,
      currentTask: state.currentTask || undefined,
    });
  }, [isOpen, state]);

  // Handle session completion
  useEffect(() => {
    if (state.timeRemaining === 0 && !state.isRunning) {
      pomodoroAdapter.completeSession(state.selectedMinutes, state.sessionType);
    }
  }, [state.timeRemaining, state.isRunning, state.selectedMinutes, state.sessionType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.isRunning) {
          pause();
        } else if (state.timeRemaining > 0) {
          start();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
    return undefined;
  }, [isOpen, state.isRunning, state.timeRemaining, start, pause]);

  if (!isOpen) return null;

  // Session type badge component
  const SessionBadge = () => {
    const sessionLabels = {
      work: 'Focus Session',
      shortBreak: 'Short Break',
      longBreak: 'Long Break',
    };
    
    return (
      <div className={`${styles.sessionBadge} ${styles[`session${state.sessionType.charAt(0).toUpperCase() + state.sessionType.slice(1)}`]}`}>
        {sessionLabels[state.sessionType]}
      </div>
    );
  };

  // Daily stats component
  const DailyStats = () => (
    <div className={styles.dailyStats}>
      {state.dailyStats.totalMinutes} min today • {state.dailyStats.completedSessions} sessions done
    </div>
  );

  // Task input component
  const TaskInput = () => (
    <input
      type="text"
      className={styles.taskInput}
      placeholder="What are you working on?"
      value={state.currentTask}
      onChange={(e) => setTask(e.target.value)}
      disabled={state.isRunning}
    />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🍅 Pomodoro Timer"
      className={styles.pomodoroModal}
      size="small"
    >
      <div className={styles.pomodoroContent}>
        {/* Central display area */}
        <div className={`${styles.pomodoroDisplay} ${styles[`pomodoro${state.sessionType.charAt(0).toUpperCase() + state.sessionType.slice(1)}`]}`}>
          <SessionBadge />
          
          {/* Large timer display */}
          <div className={styles.timerLarge}>{formatTime(state.timeRemaining)}</div>
          
          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Session info */}
          <div className={styles.sessionInfo}>
            Session {state.sessionCount} of 4
          </div>
          
          <DailyStats />
          
          {/* Task input */}
          {!state.isRunning && <TaskInput />}
        </div>

        {/* Preset Buttons */}
        {!state.isRunning && (
          <div className={styles.presetButtons}>
            {PRESET_TIMES.map(minutes => (
              <Button
                key={minutes}
                variant={state.selectedMinutes === minutes && state.sessionType === 'work' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSessionType('work');
                  setMinutes(minutes);
                }}
              >
                {minutes}m
              </Button>
            ))}
            <Button
              variant={state.sessionType !== 'work' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSessionType('shortBreak')}
            >
              Break
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className={styles.controls}>
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

        {/* Keyboard hint */}
        <div style={{ 
          fontSize: '12px', 
          color: 'rgba(255, 255, 255, 0.6)', 
          marginTop: '1rem',
          textAlign: 'center',
        }}
        >
          Press {' '}
          <kbd style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
            borderRadius: '3px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          >
            Space
          </kbd>
          {' '} to start/pause
        </div>
      </div>
    </Modal>
  );
});
