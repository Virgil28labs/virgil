import { SessionType, POMODORO_PHRASES } from '../../../types/pomodoro.types'

// Format seconds to MM:SS
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Get session type display name
export const getSessionTypeName = (type: SessionType): string => {
  switch (type) {
    case 'work':
      return 'Focus Time'
    case 'shortBreak':
      return 'Short Break'
    case 'longBreak':
      return 'Long Break'
  }
}

// Get session type color
export const getSessionTypeColor = (type: SessionType): string => {
  switch (type) {
    case 'work':
      return 'var(--violet-purple)'
    case 'shortBreak':
      return 'var(--lavender)'
    case 'longBreak':
      return 'var(--soft-pink)'
  }
}

// Get motivational phrase for current context
export const getMotivationalPhrase = (type: SessionType, timeRemaining: number, totalTime: number) => {
  const progress = (totalTime - timeRemaining) / totalTime
  const relevantPhrases = POMODORO_PHRASES.filter(phrase => {
    if (type === 'work') {
      return phrase.type === 'focus' || (phrase.type === 'motivation' && progress > 0.5)
    } else {
      return phrase.type === 'break'
    }
  })

  return relevantPhrases[Math.floor(Math.random() * relevantPhrases.length)]
}

// Generate raccoon encouragement message
export const getRaccoonMessage = (type: SessionType, completedPomodoros: number): string => {
  const workMessages = [
    "You're doing great! 🦝",
    "Keep that focus sharp! 🎯",
    "Virgil believes in you! 💜",
    "One pomodoro at a time! 🍅",
    "Deep work mode activated! 🚀"
  ]

  const breakMessages = [
    "Time to recharge! ⚡",
    "Stretch those paws! 🦝",
    "Hydrate and breathe! 💧",
    "You've earned this break! 🌟",
    "Rest is productive too! 😌"
  ]

  const messages = type === 'work' ? workMessages : breakMessages
  return messages[completedPomodoros % messages.length]
}

// Calculate streak fire intensity (for visual effect)
export const getStreakIntensity = (streak: number): 'low' | 'medium' | 'high' | 'blazing' => {
  if (streak >= 20) return 'blazing'
  if (streak >= 10) return 'high'
  if (streak >= 5) return 'medium'
  return 'low'
}

// Get time of day greeting
export const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

// Check if should use night mode
export const shouldUseNightMode = (): boolean => {
  const hour = new Date().getHours()
  return hour >= 20 || hour < 6
}

// Calculate estimated finish time
export const getEstimatedFinishTime = (secondsRemaining: number): string => {
  const now = new Date()
  const finishTime = new Date(now.getTime() + secondsRemaining * 1000)
  return finishTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

// Get progress ring dash array for SVG
export const getProgressDashArray = (progress: number, radius: number): string => {
  const circumference = 2 * Math.PI * radius
  const dashLength = (progress / 100) * circumference
  return `${dashLength} ${circumference}`
}

// Parse duration constraint value
export const parseDurationValue = (value: string | number, min: number, max: number, step: number): number => {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(parsed)) return min
  
  // Round to nearest step
  const rounded = Math.round(parsed / step) * step
  return Math.min(Math.max(rounded, min), max)
}