import { useState, useEffect, memo, useMemo } from 'react'

/**
 * DateTime Component
 * 
 * Displays current local time and date with real-time updates
 * Positioned in center-top of dashboard between logo and power button
 * Memoized and optimized to prevent unnecessary parent re-renders
 */
export const DateTime = memo(function DateTime() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Memoize formatters to prevent recreation on every render
  const formatters = useMemo(() => ({
    time: (date: Date): string => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    date: (date: Date): string => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    day: (date: Date): string => date.toLocaleDateString('en-US', {
      weekday: 'long'
    }).toLowerCase()
  }), [])

  return (
    <div className="datetime-display">
      <div className="time">{formatters.time(currentTime)}</div>
      <div className="date">{formatters.date(currentTime)}</div>
      <div className="day">{formatters.day(currentTime)}</div>
    </div>
  )
})