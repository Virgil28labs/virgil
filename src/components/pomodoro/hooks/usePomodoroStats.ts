import { useState, useEffect, useCallback } from 'react'
import { PomodoroStats, PomodoroSession, STORAGE_KEY_STATS, STORAGE_KEY_SESSIONS } from '../../../types/pomodoro.types'

const getDefaultStats = (): PomodoroStats => ({
  dailyGoal: 8,
  todayCompleted: 0,
  weeklyCompleted: [0, 0, 0, 0, 0, 0, 0],
  totalCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  averagePerDay: 0
})

export const usePomodoroStats = () => {
  const [stats, setStats] = useState<PomodoroStats>(getDefaultStats())
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get today's date string (YYYY-MM-DD)
  const getTodayString = useCallback(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }, [])

  // Load stats and sessions from localStorage
  useEffect(() => {
    try {
      // Load stats
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS)
      if (savedStats) {
        const parsed = JSON.parse(savedStats) as PomodoroStats
        
        // Check if we need to reset daily stats
        const today = getTodayString()
        if (parsed.lastCompletedDate !== today) {
          // Shift weekly stats
          const weeklyCompleted = [...parsed.weeklyCompleted]
          weeklyCompleted.shift()
          weeklyCompleted.push(0)
          
          // Reset streak if missed a day
          const lastDate = parsed.lastCompletedDate ? new Date(parsed.lastCompletedDate) : null
          const daysSinceLastCompleted = lastDate 
            ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999
          
          const newStreak = daysSinceLastCompleted > 1 ? 0 : parsed.currentStreak
          
          setStats({
            ...parsed,
            todayCompleted: 0,
            weeklyCompleted,
            currentStreak: newStreak
          })
        } else {
          setStats(parsed)
        }
      }

      // Load sessions
      const savedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS)
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions) as PomodoroSession[]
        // Keep only last 100 sessions
        setSessions(parsed.slice(-100))
      }
    } catch (error) {
      console.error('Error loading pomodoro stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getTodayString])

  // Save stats to localStorage
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats))
      } catch (error) {
        console.error('Error saving pomodoro stats:', error)
      }
    }
  }, [stats, isLoading])

  // Save sessions to localStorage
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions))
      } catch (error) {
        console.error('Error saving pomodoro sessions:', error)
      }
    }
  }, [sessions, isLoading])

  // Add completed session
  const addCompletedSession = useCallback((session: PomodoroSession) => {
    if (session.type !== 'work' || session.wasSkipped) return

    const today = getTodayString()
    
    setStats(prev => {
      const newTodayCompleted = prev.todayCompleted + 1
      const newTotalCompleted = prev.totalCompleted + 1
      
      // Update weekly completed
      const weeklyCompleted = [...prev.weeklyCompleted]
      weeklyCompleted[6] = newTodayCompleted
      
      // Update streak
      let newCurrentStreak = prev.currentStreak
      if (prev.lastCompletedDate !== today && prev.todayCompleted === 0) {
        // First pomodoro of the day
        const lastDate = prev.lastCompletedDate ? new Date(prev.lastCompletedDate) : null
        const daysSinceLastCompleted = lastDate 
          ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999
        
        if (daysSinceLastCompleted === 1) {
          // Consecutive day
          newCurrentStreak = prev.currentStreak + 1
        } else {
          // Streak broken
          newCurrentStreak = 1
        }
      }
      
      const newBestStreak = Math.max(prev.bestStreak, newCurrentStreak)
      
      // Calculate new average
      const totalDays = Math.max(1, weeklyCompleted.filter(d => d > 0).length)
      const newAverage = weeklyCompleted.reduce((sum, day) => sum + day, 0) / totalDays
      
      return {
        ...prev,
        todayCompleted: newTodayCompleted,
        weeklyCompleted,
        totalCompleted: newTotalCompleted,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastCompletedDate: today,
        averagePerDay: Math.round(newAverage * 10) / 10
      }
    })

    // Add session to history
    setSessions(prev => [...prev, session].slice(-100))
  }, [getTodayString])

  // Update daily goal
  const updateDailyGoal = useCallback((goal: number) => {
    setStats(prev => ({ ...prev, dailyGoal: Math.max(1, Math.min(20, goal)) }))
  }, [])

  // Reset all stats
  const resetStats = useCallback(() => {
    setStats(getDefaultStats())
    setSessions([])
  }, [])

  // Get sessions for a specific date
  const getSessionsForDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const startOfDay = new Date(dateString).getTime()
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000)
    
    return sessions.filter(session => 
      session.completedAt && 
      session.completedAt >= startOfDay && 
      session.completedAt < endOfDay &&
      session.type === 'work' &&
      !session.wasSkipped
    )
  }, [sessions])

  // Get progress percentage for today
  const getTodayProgress = useCallback(() => {
    return Math.min(100, (stats.todayCompleted / stats.dailyGoal) * 100)
  }, [stats])

  return {
    stats,
    sessions,
    addCompletedSession,
    updateDailyGoal,
    resetStats,
    getSessionsForDate,
    getTodayProgress,
    isLoading
  }
}