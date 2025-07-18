import { useState, useEffect, useCallback } from 'react'
import type { 
  Habit, 
  UserHabitsData, 
  Achievement
} from '../types/habit.types'

const STORAGE_KEY = 'virgil_habits'
const MAX_HABITS = 10

// Default achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-checkin',
    name: 'First Step',
    description: 'Complete your first check-in',
    icon: '✨',
    progress: 0,
    requirement: { type: 'total-checkins', value: 1 }
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    progress: 0,
    requirement: { type: 'streak', value: 7 }
  },
  {
    id: 'monthly-master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    progress: 0,
    requirement: { type: 'streak', value: 30 }
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 days',
    icon: '🌟',
    progress: 0,
    requirement: { type: 'perfect-week', value: 7 }
  },
  {
    id: 'habit-collector',
    name: 'Habit Builder',
    description: 'Create 5 habits',
    icon: '🎯',
    progress: 0,
    requirement: { type: 'all-habits', value: 5 }
  }
]

// Check if can check in today
const canCheckInToday = (lastCheckIn: string | null): boolean => {
  if (!lastCheckIn) return true
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const lastDate = new Date(lastCheckIn)
  lastDate.setHours(0, 0, 0, 0)
  
  return today.getTime() > lastDate.getTime()
}

// Calculate current streak
const calculateStreak = (checkIns: string[]): number => {
  if (!checkIns.length) return 0
  
  const sortedDates = [...checkIns].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(sortedDates[i])
    checkDate.setHours(0, 0, 0, 0)
    
    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - streak)
    
    if (checkDate.getTime() === expectedDate.getTime()) {
      streak++
    } else if (streak > 0 && checkDate < expectedDate) {
      break
    }
  }
  
  return streak
}

export const useHabits = () => {
  const [userData, setUserData] = useState<UserHabitsData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as UserHabitsData
        // Update streak values based on current time
        data.habits = data.habits.map(habit => ({
          ...habit,
          streak: calculateStreak(habit.checkIns)
        }))
        return data
      }
    } catch (e) {
      console.error('Failed to load habit data:', e)
    }
    
    return {
      habits: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      settings: {
        soundEnabled: true
      },
      stats: {
        totalCheckIns: 0,
        currentStreak: 0,
        perfectDays: []
      }
    }
  })
  
  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    } catch (e) {
      console.error('Failed to save habit data:', e)
    }
  }, [userData])
  
  // Add a new habit
  const addHabit = useCallback((name: string, emoji: string) => {
    if (userData.habits.length >= MAX_HABITS) {
      throw new Error(`Maximum ${MAX_HABITS} habits allowed`)
    }
    
    const newHabit: Habit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      emoji,
      streak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      checkIns: [],
      createdAt: new Date().toISOString()
    }
    
    setUserData(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit]
    }))
  }, [userData.habits.length])
  
  // Check in for a habit
  const checkIn = useCallback((habitId: string) => {
    setUserData(prev => {
      const habit = prev.habits.find(h => h.id === habitId)
      if (!habit || !canCheckInToday(habit.lastCheckIn)) {
        return prev
      }
      
      const today = new Date().toISOString().split('T')[0]
      const updatedHabits = prev.habits.map(h => {
        if (h.id === habitId) {
          const newCheckIns = [...h.checkIns, today]
          const newStreak = calculateStreak(newCheckIns)
          const newLongestStreak = Math.max(h.longestStreak, newStreak)
          
          return {
            ...h,
            checkIns: newCheckIns,
            lastCheckIn: today,
            streak: newStreak,
            longestStreak: newLongestStreak
          }
        }
        return h
      })
      
      // Check if all habits are completed today
      const allCompleted = updatedHabits.every(h => 
        h.lastCheckIn === today
      )
      
      const perfectDays = allCompleted && !prev.stats.perfectDays.includes(today)
        ? [...prev.stats.perfectDays, today]
        : prev.stats.perfectDays
      
      // Update achievements
      const updatedAchievements = updateAchievements(
        prev.achievements,
        updatedHabits,
        perfectDays
      )
      
      return {
        ...prev,
        habits: updatedHabits,
        stats: {
          ...prev.stats,
          perfectDays
        },
        achievements: updatedAchievements
      }
    })
  }, [])
  
  // Update achievements based on progress
  const updateAchievements = (
    achievements: Achievement[],
    habits: Habit[],
    perfectDays: string[]
  ): Achievement[] => {
    return achievements.map(achievement => {
      let progress = 0
      let unlocked = false
      
      switch (achievement.requirement.type) {
        case 'total-checkins':
          const totalCheckIns = habits.reduce((sum, h) => sum + h.checkIns.length, 0)
          progress = Math.min(100, (totalCheckIns / achievement.requirement.value) * 100)
          unlocked = totalCheckIns >= achievement.requirement.value
          break
          
        case 'streak':
          const maxStreak = Math.max(...habits.map(h => h.streak))
          progress = Math.min(100, (maxStreak / achievement.requirement.value) * 100)
          unlocked = maxStreak >= achievement.requirement.value
          break
          
        case 'perfect-week':
          const recentPerfectDays = perfectDays.filter(day => {
            const dayDate = new Date(day)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return dayDate >= weekAgo
          }).length
          progress = Math.min(100, (recentPerfectDays / achievement.requirement.value) * 100)
          unlocked = recentPerfectDays >= achievement.requirement.value
          break
          
        case 'all-habits':
          progress = Math.min(100, (habits.length / achievement.requirement.value) * 100)
          unlocked = habits.length >= achievement.requirement.value
          break
      }
      
      return {
        ...achievement,
        progress,
        unlockedAt: unlocked && !achievement.unlockedAt 
          ? new Date().toISOString() 
          : achievement.unlockedAt
      }
    })
  }
  
  // Update a habit
  const updateHabit = useCallback((habitId: string, updates: { name?: string; emoji?: string }) => {
    setUserData(prev => ({
      ...prev,
      habits: prev.habits.map(h => 
        h.id === habitId 
          ? { ...h, ...updates }
          : h
      )
    }))
  }, [])
  
  // Delete a habit
  const deleteHabit = useCallback((habitId: string) => {
    setUserData(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== habitId)
    }))
  }, [])
  
  // Undo a check-in
  const undoCheckIn = useCallback((habitId: string) => {
    setUserData(prev => {
      const habit = prev.habits.find(h => h.id === habitId)
      if (!habit || !habit.lastCheckIn) {
        return prev
      }
      
      const today = new Date().toISOString().split('T')[0]
      // Only allow undo for today's check-ins
      if (habit.lastCheckIn !== today) {
        return prev
      }
      
      const updatedHabits = prev.habits.map(h => {
        if (h.id === habitId) {
          // Remove today's check-in
          const newCheckIns = h.checkIns.filter(date => date !== today)
          const newStreak = calculateStreak(newCheckIns)
          
          return {
            ...h,
            checkIns: newCheckIns,
            lastCheckIn: newCheckIns.length > 0 
              ? newCheckIns[newCheckIns.length - 1] 
              : null,
            streak: newStreak
          }
        }
        return h
      })
      
      // Update stats
      const allCompleted = updatedHabits.every(h => 
        h.lastCheckIn === today
      )
      
      const perfectDays = !allCompleted && prev.stats.perfectDays.includes(today)
        ? prev.stats.perfectDays.filter(day => day !== today)
        : prev.stats.perfectDays
      
      return {
        ...prev,
        habits: updatedHabits,
        stats: {
          ...prev.stats,
          perfectDays
        }
      }
    })
  }, [])
  
  // Toggle settings
  const toggleSetting = useCallback((
    setting: keyof UserHabitsData['settings']
  ) => {
    setUserData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: !prev.settings[setting]
      }
    }))
  }, [])
  
  // Calculate totalCheckIns dynamically from all habits
  const dynamicTotalCheckIns = userData.habits.reduce((total, habit) => 
    total + habit.checkIns.length, 0
  )
  
  // Calculate best streak across all habits (longest ever)
  const bestStreak = userData.habits.reduce((best, habit) => 
    Math.max(best, habit.longestStreak), 0
  )
  
  return {
    // Data
    habits: userData.habits,
    achievements: userData.achievements,
    settings: userData.settings,
    stats: {
      ...userData.stats,
      totalCheckIns: dynamicTotalCheckIns,
      currentStreak: bestStreak
    },
    
    // Actions
    addHabit,
    checkIn,
    updateHabit,
    deleteHabit,
    undoCheckIn,
    toggleSetting,
    
    // Helpers
    canCheckInToday: (habitId: string) => {
      const habit = userData.habits.find(h => h.id === habitId)
      return habit ? canCheckInToday(habit.lastCheckIn) : false
    }
  }
}