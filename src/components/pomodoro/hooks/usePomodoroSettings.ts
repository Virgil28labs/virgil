import { useState, useEffect, useCallback } from 'react'
import { PomodoroSettings, DEFAULT_POMODORO_SETTINGS, STORAGE_KEY_SETTINGS, DURATION_CONSTRAINTS } from '../../../types/pomodoro.types'

export const usePomodoroSettings = () => {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as PomodoroSettings
        // Validate loaded settings
        const validatedSettings: PomodoroSettings = {
          workDuration: Math.min(Math.max(parsed.workDuration || DEFAULT_POMODORO_SETTINGS.workDuration, DURATION_CONSTRAINTS.work.min), DURATION_CONSTRAINTS.work.max),
          shortBreakDuration: Math.min(Math.max(parsed.shortBreakDuration || DEFAULT_POMODORO_SETTINGS.shortBreakDuration, DURATION_CONSTRAINTS.shortBreak.min), DURATION_CONSTRAINTS.shortBreak.max),
          longBreakDuration: Math.min(Math.max(parsed.longBreakDuration || DEFAULT_POMODORO_SETTINGS.longBreakDuration, DURATION_CONSTRAINTS.longBreak.min), DURATION_CONSTRAINTS.longBreak.max),
          autoStartBreaks: parsed.autoStartBreaks ?? DEFAULT_POMODORO_SETTINGS.autoStartBreaks,
          autoStartPomodoros: parsed.autoStartPomodoros ?? DEFAULT_POMODORO_SETTINGS.autoStartPomodoros,
          soundEnabled: parsed.soundEnabled ?? DEFAULT_POMODORO_SETTINGS.soundEnabled,
          soundVolume: Math.min(Math.max(parsed.soundVolume || DEFAULT_POMODORO_SETTINGS.soundVolume, 0), 100),
          tickSoundEnabled: parsed.tickSoundEnabled ?? DEFAULT_POMODORO_SETTINGS.tickSoundEnabled,
          tickSoundDuration: Math.min(Math.max(parsed.tickSoundDuration || DEFAULT_POMODORO_SETTINGS.tickSoundDuration, 0), 60),
          notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_POMODORO_SETTINGS.notificationsEnabled
        }
        setSettings(validatedSettings)
      }
    } catch (error) {
      console.error('Error loading pomodoro settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
      } catch (error) {
        console.error('Error saving pomodoro settings:', error)
      }
    }
  }, [settings, isLoading])

  // Update individual settings
  const updateSetting = useCallback(<K extends keyof PomodoroSettings>(
    key: K,
    value: PomodoroSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_POMODORO_SETTINGS)
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }, [])

  // Enable notifications (requests permission if needed)
  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      updateSetting('notificationsEnabled', true)
    }
    return granted
  }, [requestNotificationPermission, updateSetting])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    enableNotifications,
    isLoading
  }
}