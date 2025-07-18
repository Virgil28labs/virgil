import React, { useState, useCallback, useEffect } from 'react'
import { PomodoroTimer } from './PomodoroTimer'
import { PomodoroSettings } from './PomodoroSettings'
import { PomodoroStats } from './PomodoroStats'
import { usePomodoroTimer } from './hooks/usePomodoroTimer'
import { usePomodoroSettings } from './hooks/usePomodoroSettings'
import { usePomodoroStats } from './hooks/usePomodoroStats'
import { notifySessionComplete, pomodoroAudio } from './utils/pomodoroSounds'
import { shouldUseNightMode } from './utils/pomodoroUtils'
import type { PomodoroModalProps, PomodoroSession } from '../../types/pomodoro.types'
import './Pomodoro.css'

export const PomodoroApp: React.FC<PomodoroModalProps> = ({ isOpen, onClose }) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [isNightMode, setIsNightMode] = useState(shouldUseNightMode())

  // Initialize hooks
  const { settings, updateSetting, updateSettings, resetSettings, enableNotifications } = usePomodoroSettings()
  const { stats, addCompletedSession, updateDailyGoal, resetStats } = usePomodoroStats()
  
  // Timer hook with callbacks
  const handleSessionComplete = useCallback(async (session: PomodoroSession) => {
    // Add to stats if it's a completed work session
    if (session.type === 'work' && !session.wasSkipped) {
      addCompletedSession(session)
    }

    // Notify user
    await notifySessionComplete(session.type, settings)
  }, [addCompletedSession, settings])

  const timer = usePomodoroTimer({ 
    settings, 
    onSessionComplete: handleSessionComplete 
  })

  // Initialize audio on first interaction
  useEffect(() => {
    if (isOpen) {
      pomodoroAudio.initialize()
    }
  }, [isOpen])

  // Update night mode periodically
  useEffect(() => {
    const checkNightMode = () => {
      setIsNightMode(shouldUseNightMode())
    }
    
    const interval = setInterval(checkNightMode, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle if settings or stats are open
      if (showSettings || showStats) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (timer.isRunning) {
            timer.pauseTimer()
          } else {
            timer.startTimer()
          }
          break
        case 'r':
        case 'R':
          timer.resetTimer()
          break
        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            timer.skipSession()
          }
          break
        case 'm':
        case 'M':
          updateSetting('soundEnabled', !settings.soundEnabled)
          break
        case 'Escape':
          if (!showSettings && !showStats) {
            onClose()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, showSettings, showStats, timer, settings.soundEnabled, updateSetting, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !showSettings && !showStats) {
      onClose()
    }
  }, [onClose, showSettings, showStats])

  if (!isOpen) return null

  return (
    <div className={`pomodoro-backdrop ${isNightMode ? 'night-mode' : ''}`} onClick={handleBackdropClick}>
      <div className="pomodoro-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pomodoro-header">
          <div className="pomodoro-title">
            <span className="pomodoro-icon">🍅</span>
            <h2>Pomodoro Timer</h2>
          </div>
          <div className="header-actions">
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
              title="Settings"
            >
              ⚙️
            </button>
            <button
              className="header-btn"
              onClick={() => setShowStats(true)}
              aria-label="View statistics"
              title="View Statistics"
            >
              📊
            </button>
            <button
              className="header-close"
              onClick={onClose}
              aria-label="Close Pomodoro timer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="pomodoro-content">
          <PomodoroTimer
            timeRemaining={timer.timeRemaining}
            sessionType={timer.currentSession?.type || null}
            progress={timer.progress}
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            completedPomodoros={timer.completedPomodoros}
            settings={settings}
            onStart={timer.startTimer}
            onPause={timer.pauseTimer}
            onReset={timer.resetTimer}
            onSkip={timer.skipSession}
            onSettingsClick={() => setShowSettings(true)} // Now handled in header
          />
        </div>

        {/* Footer */}
        <div className="pomodoro-footer">
          <div className="footer-stats">
            <span className="stat-badge">
              Today: {stats.todayCompleted}/{stats.dailyGoal}
            </span>
            <span className="stat-badge">
              Streak: {stats.currentStreak} 🔥
            </span>
          </div>
          
          <div className="keyboard-hints">
            <span className="hint">
              <kbd>Space</kbd> Play/Pause
            </span>
            <span className="hint">
              <kbd>R</kbd> Reset
            </span>
            <span className="hint">
              <kbd>S</kbd> Skip
            </span>
          </div>
        </div>

        {/* Settings Panel */}
        <PomodoroSettings
          settings={settings}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdateSetting={updateSetting}
          onResetSettings={resetSettings}
          onEnableNotifications={enableNotifications}
        />

        {/* Stats Panel */}
        <PomodoroStats
          stats={stats}
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          onUpdateGoal={updateDailyGoal}
          onResetStats={resetStats}
        />
      </div>
    </div>
  )
}