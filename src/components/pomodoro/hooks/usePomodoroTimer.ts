import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TimerState,
  SessionType,
  PomodoroState,
  PomodoroSession,
  PomodoroSettings,
  POMODOROS_UNTIL_LONG_BREAK
} from '../../../types/pomodoro.types'

interface UsePomodoroTimerProps {
  settings: PomodoroSettings
  onSessionComplete?: (session: PomodoroSession) => void
  onTick?: (timeRemaining: number) => void
}

export const usePomodoroTimer = ({
  settings,
  onSessionComplete,
  onTick
}: UsePomodoroTimerProps) => {
  // State
  const [state, setState] = useState<PomodoroState>({
    currentSession: null,
    timerState: 'idle',
    timeRemaining: settings.workDuration * 60,
    completedPomodoros: 0,
    totalPomodoros: 0,
    sessions: []
  })

  // Refs for accurate timing
  const animationFrameRef = useRef<number>()
  const lastTickRef = useRef<number>(Date.now())
  const accumulatedTimeRef = useRef<number>(0)

  // Get duration for session type
  const getSessionDuration = useCallback((type: SessionType): number => {
    switch (type) {
      case 'work':
        return settings.workDuration * 60
      case 'shortBreak':
        return settings.shortBreakDuration * 60
      case 'longBreak':
        return settings.longBreakDuration * 60
    }
  }, [settings])

  // Determine next session type
  const getNextSessionType = useCallback((currentType: SessionType, completedPomodoros: number): SessionType => {
    if (currentType === 'work') {
      return completedPomodoros > 0 && completedPomodoros % POMODOROS_UNTIL_LONG_BREAK === 0
        ? 'longBreak'
        : 'shortBreak'
    }
    return 'work'
  }, [])

  // Create new session
  const createSession = useCallback((type: SessionType): PomodoroSession => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    startTime: Date.now()
  }), [])

  // Start timer
  const startTimer = useCallback(() => {
    if (state.timerState === 'running') return

    let newSession = state.currentSession
    if (!newSession || state.timerState === 'idle') {
      const sessionType = state.currentSession?.type || 'work'
      newSession = createSession(sessionType)
      const duration = getSessionDuration(sessionType)
      
      setState(prev => ({
        ...prev,
        currentSession: newSession,
        timeRemaining: duration,
        timerState: 'running'
      }))
    } else {
      setState(prev => ({ ...prev, timerState: 'running' }))
    }

    lastTickRef.current = Date.now()
    accumulatedTimeRef.current = 0
  }, [state, createSession, getSessionDuration])

  // Pause timer
  const pauseTimer = useCallback(() => {
    setState(prev => ({ ...prev, timerState: 'paused' }))
  }, [])

  // Reset timer
  const resetTimer = useCallback(() => {
    const sessionType = state.currentSession?.type || 'work'
    const duration = getSessionDuration(sessionType)
    
    setState(prev => ({
      ...prev,
      timerState: 'idle',
      timeRemaining: duration,
      currentSession: null
    }))
  }, [state.currentSession, getSessionDuration])

  // Skip to next session
  const skipSession = useCallback(() => {
    if (!state.currentSession) return

    const skippedSession: PomodoroSession = {
      ...state.currentSession,
      endTime: Date.now(),
      wasSkipped: true
    }

    const nextType = getNextSessionType(state.currentSession.type, state.completedPomodoros)
    const nextSession = createSession(nextType)
    const nextDuration = getSessionDuration(nextType)

    setState(prev => ({
      ...prev,
      currentSession: nextSession,
      timerState: 'idle',
      timeRemaining: nextDuration,
      sessions: [...prev.sessions, skippedSession]
    }))
  }, [state, createSession, getSessionDuration, getNextSessionType])

  // Complete session
  const completeSession = useCallback(() => {
    if (!state.currentSession) return

    const completedSession: PomodoroSession = {
      ...state.currentSession,
      endTime: Date.now(),
      completedAt: Date.now()
    }

    const wasPomodoro = state.currentSession.type === 'work'
    const newCompletedPomodoros = wasPomodoro ? state.completedPomodoros + 1 : state.completedPomodoros
    const newTotalPomodoros = wasPomodoro ? state.totalPomodoros + 1 : state.totalPomodoros

    // Determine next session
    const nextType = getNextSessionType(state.currentSession.type, newCompletedPomodoros)
    const shouldAutoStart = (nextType === 'work' && settings.autoStartPomodoros) ||
                           (nextType !== 'work' && settings.autoStartBreaks)

    const nextSession = shouldAutoStart ? createSession(nextType) : null
    const nextDuration = getSessionDuration(nextType)

    setState(prev => ({
      ...prev,
      currentSession: nextSession,
      timerState: shouldAutoStart ? 'running' : 'idle',
      timeRemaining: nextDuration,
      completedPomodoros: newCompletedPomodoros,
      totalPomodoros: newTotalPomodoros,
      sessions: [...prev.sessions, completedSession]
    }))

    // Callback
    onSessionComplete?.(completedSession)

    // Reset completed pomodoros after long break
    if (state.currentSession.type === 'longBreak') {
      setState(prev => ({ ...prev, completedPomodoros: 0 }))
    }
  }, [state, settings, createSession, getSessionDuration, getNextSessionType, onSessionComplete])

  // Timer tick logic
  const tick = useCallback(() => {
    if (state.timerState !== 'running') {
      animationFrameRef.current = undefined
      return
    }

    const now = Date.now()
    const deltaTime = now - lastTickRef.current
    lastTickRef.current = now

    // Accumulate time to handle fractional seconds
    accumulatedTimeRef.current += deltaTime

    // Update every second
    if (accumulatedTimeRef.current >= 1000) {
      const secondsToDeduct = Math.floor(accumulatedTimeRef.current / 1000)
      accumulatedTimeRef.current %= 1000

      setState(prev => {
        const newTimeRemaining = Math.max(0, prev.timeRemaining - secondsToDeduct)
        
        // Session complete
        if (newTimeRemaining === 0 && prev.timeRemaining > 0) {
          completeSession()
        }

        // Callback
        if (newTimeRemaining !== prev.timeRemaining) {
          onTick?.(newTimeRemaining)
        }

        return { ...prev, timeRemaining: newTimeRemaining }
      })
    }

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [state.timerState, completeSession, onTick])

  // Start/stop animation frame
  useEffect(() => {
    if (state.timerState === 'running' && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(tick)
    } else if (state.timerState !== 'running' && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [state.timerState, tick])

  // Update time remaining when settings change
  useEffect(() => {
    if (state.timerState === 'idle' && !state.currentSession) {
      setState(prev => ({
        ...prev,
        timeRemaining: settings.workDuration * 60
      }))
    }
  }, [settings.workDuration, state.timerState, state.currentSession])

  return {
    ...state,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    isRunning: state.timerState === 'running',
    isPaused: state.timerState === 'paused',
    isIdle: state.timerState === 'idle',
    progress: state.currentSession
      ? ((getSessionDuration(state.currentSession.type) - state.timeRemaining) / getSessionDuration(state.currentSession.type)) * 100
      : 0
  }
}