import { memo, useState } from 'react'
import { PomodoroSettings as Settings, DURATION_CONSTRAINTS } from '../../types/pomodoro.types'
import { parseDurationValue } from './utils/pomodoroUtils'

interface PomodoroSettingsProps {
  settings: Settings
  isOpen: boolean
  onClose: () => void
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onResetSettings: () => void
  onEnableNotifications: () => Promise<boolean>
}

export const PomodoroSettings = memo(function PomodoroSettings({
  settings,
  isOpen,
  onClose,
  onUpdateSetting,
  onResetSettings,
  onEnableNotifications
}: PomodoroSettingsProps) {
  const [activeTab, setActiveTab] = useState<'durations' | 'preferences'>('durations')
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = () => {
    setIsResetting(true)
    onResetSettings()
    setTimeout(() => setIsResetting(false), 1000)
  }

  const handleNotificationToggle = async () => {
    if (!settings.notificationsEnabled) {
      const granted = await onEnableNotifications()
      if (!granted) {
        alert('Please enable notifications in your browser settings to use this feature.')
      }
    } else {
      onUpdateSetting('notificationsEnabled', false)
    }
  }

  const handleDurationChange = (type: 'work' | 'shortBreak' | 'longBreak', value: string) => {
    const constraints = DURATION_CONSTRAINTS[type]
    const parsed = parseDurationValue(value, constraints.min, constraints.max, constraints.step)
    
    switch (type) {
      case 'work':
        onUpdateSetting('workDuration', parsed)
        break
      case 'shortBreak':
        onUpdateSetting('shortBreakDuration', parsed)
        break
      case 'longBreak':
        onUpdateSetting('longBreakDuration', parsed)
        break
    }
  }

  if (!isOpen) return null

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Timer Settings</h3>
        <button 
          className="settings-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          ×
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'durations' ? 'active' : ''}`}
          onClick={() => setActiveTab('durations')}
        >
          Durations
        </button>
        <button 
          className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        {activeTab === 'durations' ? (
          <div className="durations-tab">
            {/* Work Duration */}
            <div className="setting-group">
              <label htmlFor="work-duration">
                <span className="setting-label">Focus Time</span>
                <span className="setting-description">Length of work sessions</span>
              </label>
              <div className="duration-control">
                <input
                  id="work-duration"
                  type="range"
                  min={DURATION_CONSTRAINTS.work.min}
                  max={DURATION_CONSTRAINTS.work.max}
                  step={DURATION_CONSTRAINTS.work.step}
                  value={settings.workDuration}
                  onChange={(e) => handleDurationChange('work', e.target.value)}
                  className="duration-slider"
                />
                <span className="duration-value">{settings.workDuration} min</span>
              </div>
            </div>

            {/* Short Break Duration */}
            <div className="setting-group">
              <label htmlFor="short-break-duration">
                <span className="setting-label">Short Break</span>
                <span className="setting-description">Rest between pomodoros</span>
              </label>
              <div className="duration-control">
                <input
                  id="short-break-duration"
                  type="range"
                  min={DURATION_CONSTRAINTS.shortBreak.min}
                  max={DURATION_CONSTRAINTS.shortBreak.max}
                  step={DURATION_CONSTRAINTS.shortBreak.step}
                  value={settings.shortBreakDuration}
                  onChange={(e) => handleDurationChange('shortBreak', e.target.value)}
                  className="duration-slider"
                />
                <span className="duration-value">{settings.shortBreakDuration} min</span>
              </div>
            </div>

            {/* Long Break Duration */}
            <div className="setting-group">
              <label htmlFor="long-break-duration">
                <span className="setting-label">Long Break</span>
                <span className="setting-description">Rest after 4 pomodoros</span>
              </label>
              <div className="duration-control">
                <input
                  id="long-break-duration"
                  type="range"
                  min={DURATION_CONSTRAINTS.longBreak.min}
                  max={DURATION_CONSTRAINTS.longBreak.max}
                  step={DURATION_CONSTRAINTS.longBreak.step}
                  value={settings.longBreakDuration}
                  onChange={(e) => handleDurationChange('longBreak', e.target.value)}
                  className="duration-slider"
                />
                <span className="duration-value">{settings.longBreakDuration} min</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="preferences-tab">
            {/* Auto-start Settings */}
            <div className="setting-group">
              <label htmlFor="auto-start-breaks" className="toggle-label">
                <div>
                  <span className="setting-label">Auto-start Breaks</span>
                  <span className="setting-description">Automatically start break timers</span>
                </div>
                <input
                  id="auto-start-breaks"
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => onUpdateSetting('autoStartBreaks', e.target.checked)}
                  className="toggle-input"
                />
              </label>
            </div>

            <div className="setting-group">
              <label htmlFor="auto-start-pomodoros" className="toggle-label">
                <div>
                  <span className="setting-label">Auto-start Pomodoros</span>
                  <span className="setting-description">Automatically start work timers</span>
                </div>
                <input
                  id="auto-start-pomodoros"
                  type="checkbox"
                  checked={settings.autoStartPomodoros}
                  onChange={(e) => onUpdateSetting('autoStartPomodoros', e.target.checked)}
                  className="toggle-input"
                />
              </label>
            </div>

            {/* Sound Settings */}
            <div className="setting-separator" />
            
            <div className="setting-group">
              <label htmlFor="sound-enabled" className="toggle-label">
                <div>
                  <span className="setting-label">Sound Effects</span>
                  <span className="setting-description">Play sounds on completion</span>
                </div>
                <input
                  id="sound-enabled"
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => onUpdateSetting('soundEnabled', e.target.checked)}
                  className="toggle-input"
                />
              </label>
            </div>

            {settings.soundEnabled && (
              <>
                <div className="setting-group">
                  <label htmlFor="sound-volume">
                    <span className="setting-label">Volume</span>
                  </label>
                  <div className="volume-control">
                    <span className="volume-icon">🔊</span>
                    <input
                      id="sound-volume"
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={settings.soundVolume}
                      onChange={(e) => onUpdateSetting('soundVolume', parseInt(e.target.value))}
                      className="volume-slider"
                    />
                    <span className="volume-value">{settings.soundVolume}%</span>
                  </div>
                </div>

                <div className="setting-group">
                  <label htmlFor="tick-sound" className="toggle-label">
                    <div>
                      <span className="setting-label">Tick Sound</span>
                      <span className="setting-description">Play ticking in final seconds</span>
                    </div>
                    <input
                      id="tick-sound"
                      type="checkbox"
                      checked={settings.tickSoundEnabled}
                      onChange={(e) => onUpdateSetting('tickSoundEnabled', e.target.checked)}
                      className="toggle-input"
                    />
                  </label>
                </div>
              </>
            )}

            {/* Notifications */}
            <div className="setting-separator" />
            
            <div className="setting-group">
              <label htmlFor="notifications" className="toggle-label">
                <div>
                  <span className="setting-label">Browser Notifications</span>
                  <span className="setting-description">Get notified when sessions end</span>
                </div>
                <input
                  id="notifications"
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={handleNotificationToggle}
                  className="toggle-input"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="settings-footer">
        <button 
          className={`reset-btn ${isResetting ? 'resetting' : ''}`}
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? 'Reset!' : 'Reset to Defaults'}
        </button>
      </div>
    </div>
  )
})