import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useUserProfile } from '../../hooks/useUserProfile'

interface PomodoroTimerProps {
  isOpen: boolean
  onClose: () => void
}

// Constants
const DEFAULT_MINUTES = 25
const MIN_MINUTES = 1
const MAX_MINUTES = 60
const PRESET_TIMES = [5, 10, 25]
const SNAP_POINTS = [5, 10, 15, 20, 25, 30, 45, 60]
const SNAP_THRESHOLD = 3

// Clock dimensions
const CLOCK_RADIUS = 120
const INNER_RADIUS = 85
const CENTER_X = 140
const CENTER_Y = 140

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ isOpen, onClose }) => {
  const { profile } = useUserProfile()
  const userName = profile?.nickname || profile?.fullName || ''
  
  const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_MINUTES)
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [motivationalMessage, setMotivationalMessage] = useState('')
  const [particles, setParticles] = useState<Array<{ id: number; x: number }>>([])
  
  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Calculate total duration for current session
  const totalDuration = selectedMinutes * 60
  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100
  
  
  // Calculate minutes from angle
  const angleToMinutes = (angle: number) => {
    const minutes = Math.round((angle / 360) * 60)
    return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, minutes))
  }
  
  // Update motivational message based on timer progress
  useEffect(() => {
    const name = userName || 'Champion'
    
    if (showCelebration) {
      setMotivationalMessage(`Fantastic work, ${name}! You crushed it! 🎉`)
      return
    }
    
    if (!isRunning) {
      setMotivationalMessage('')
      return
    }
    
    // Contextual messages based on progress ranges
    if (progress < 5) {
      setMotivationalMessage(`Let's do this, ${name}! Focus mode activated 🚀`)
    } else if (progress >= 15 && progress < 30) {
      setMotivationalMessage(`Great start, ${name}! You're in the zone 💫`)
    } else if (progress >= 40 && progress < 60) {
      setMotivationalMessage(`Halfway there, ${name}! Keep that momentum going 💪`)
    } else if (progress >= 70 && progress < 85) {
      setMotivationalMessage(`Almost done, ${name}! You've got this 🔥`)
    } else if (progress >= 90 && progress < 95) {
      setMotivationalMessage(`Final minute, ${name}! Finish strong 🏁`)
    }
  }, [progress, isRunning, showCelebration, userName])
  
  
  
  // Handle dial dragging
  const handleDialStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isRunning) return
    isDraggingRef.current = true
    e.preventDefault()
  }
  
  const handleDialMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !dialRef.current) return
    
    const rect = dialRef.current.getBoundingClientRect()
    const dialCenterX = rect.left + rect.width / 2
    const dialCenterY = rect.top + rect.height / 2
    
    let clientX: number, clientY: number
    if (e instanceof MouseEvent) {
      clientX = e.clientX
      clientY = e.clientY
    } else {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    }
    
    const angle = Math.atan2(clientY - dialCenterY, clientX - dialCenterX)
    const degrees = (angle * 180 / Math.PI + 90 + 360) % 360
    const minutes = angleToMinutes(degrees)
    
    // Snap to common values
    let snappedMinutes = minutes
    
    for (const point of SNAP_POINTS) {
      if (Math.abs(minutes - point) <= SNAP_THRESHOLD) {
        snappedMinutes = point
        break
      }
    }
    
    setSelectedMinutes(snappedMinutes)
    setTimeRemaining(snappedMinutes * 60)
  }, [])
  
  const handleDialEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Intercept all arrow keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      
      // Remove focus from any active element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      
      // Only handle left/right for timer adjustment when not running
      if (!isRunning && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (e.key === 'ArrowLeft') {
          const newMinutes = Math.max(MIN_MINUTES, selectedMinutes - 1)
          setSelectedMinutes(newMinutes)
          setTimeRemaining(newMinutes * 60)
        } else if (e.key === 'ArrowRight') {
          const newMinutes = Math.min(MAX_MINUTES, selectedMinutes + 1)
          setSelectedMinutes(newMinutes)
          setTimeRemaining(newMinutes * 60)
        }
      }
    }
  }, [isRunning, selectedMinutes])
  
  // Add global mouse/touch listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleDialMove)
    window.addEventListener('mouseup', handleDialEnd)
    window.addEventListener('touchmove', handleDialMove)
    window.addEventListener('touchend', handleDialEnd)
    
    return () => {
      window.removeEventListener('mousemove', handleDialMove)
      window.removeEventListener('mouseup', handleDialEnd)
      window.removeEventListener('touchmove', handleDialMove)
      window.removeEventListener('touchend', handleDialEnd)
    }
  }, [handleDialMove, handleDialEnd])
  
  // Focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus()
    }
  }, [isOpen])
  
  
  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Play sound
  const playSound = useCallback((type: 'tick' | 'complete' | 'milestone') => {
    if (!soundEnabled) return
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      if (type === 'complete') {
        // Pleasant completion sound
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.5)
      } else if (type === 'milestone') {
        // Milestone sound
        oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
        oscillator.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1) // C#5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      } else {
        // Tick sound
        oscillator.frequency.setValueAtTime(800, ctx.currentTime)
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.1)
      }
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }, [soundEnabled])
  
  // Create milestone particles
  const createMilestoneParticles = () => {
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100
    }))
    setParticles(prev => [...prev, ...newParticles])
    
    // Clear particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)))
    }, 2000)
  }
  
  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false)
    playSound('complete')
    setShowCelebration(true)
    
    
    // Create particles
    const celebrationParticles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100
    }))
    setParticles(celebrationParticles)
    
    // Hide celebration
    setTimeout(() => {
      setShowCelebration(false)
      setParticles([])
    }, 2000)
    
  }, [playSound])
  
  // Timer tick
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      let lastMilestone = Math.floor((1 - timeRemaining / totalDuration) * 4)
      
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          
          // Check for milestones (25%, 50%, 75%)
          const currentProgress = (totalDuration - (prev - 1)) / totalDuration
          const currentMilestone = Math.floor(currentProgress * 4)
          if (currentMilestone > lastMilestone && currentMilestone < 4) {
            playSound('milestone')
            createMilestoneParticles()
            lastMilestone = currentMilestone
          }
          
          // Play tick in last 5 seconds
          if (prev <= 5) {
            playSound('tick')
          }
          
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeRemaining, totalDuration, handleTimerComplete, playSound])
  
  // Control functions
  const startTimer = () => setIsRunning(true)
  const pauseTimer = () => setIsRunning(false)
  const resetTimer = () => {
    setIsRunning(false)
    setTimeRemaining(selectedMinutes * 60)
    setMotivationalMessage('')
  }
  
  if (!isOpen) return null
  
  // Calculate visual elements for clock
  // For setup: show filled segment based on selected minutes
  // For running: show remaining time as filled segment
  const setupAngle = (selectedMinutes / 60) * 360
  const remainingAngle = setupAngle * (timeRemaining / (selectedMinutes * 60))
  const fillAngle = isRunning ? remainingAngle : setupAngle
  
  
  return (
    <div className="pomodoro-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pomodoro-panel" tabIndex={-1} ref={panelRef} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="pomodoro-header">
          <h2>🍅 Pomodoro Timer</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close" tabIndex={-1}>
            ×
          </button>
        </div>
        
        
        {/* Clock Container */}
        <div className="clock-container">
          {/* Time Display Above Clock */}
          <div className="time-display">{formatTime(timeRemaining)}</div>
          
          {/* Visual Clock */}
          <div 
            ref={dialRef}
            className={`visual-clock ${isDraggingRef.current ? 'dragging' : ''}`}
            onMouseDown={handleDialStart}
            onTouchStart={handleDialStart}
          >
            <svg width="280" height="280" className="clock-svg">
              {/* Gradient definitions */}
              <defs>
                <radialGradient id="progressGradient">
                  <stop offset="0%" stopColor="#6c3baa" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </radialGradient>
              </defs>
              
              {/* Clock face background */}
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={CLOCK_RADIUS}
                fill="#2d2233"
                stroke="rgba(178, 165, 193, 0.3)"
                strokeWidth="2"
              />
              
              
              {/* Clock numbers */}
              {[
                { num: 60, angle: -90 },
                { num: 15, angle: 0 },
                { num: 30, angle: 90 },
                { num: 45, angle: 180 }
              ].map(({ num, angle }) => {
                const radian = angle * Math.PI / 180
                const x = CENTER_X + Math.cos(radian) * (CLOCK_RADIUS - 15)
                const y = CENTER_Y + Math.sin(radian) * (CLOCK_RADIUS - 15)
                return (
                  <text
                    key={num}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`clock-number ${selectedMinutes === num ? 'active' : ''}`}
                    fill="#b2a5c1"
                    fontSize="18"
                    fontWeight="700"
                  >
                    {num}
                  </text>
                )
              })}
              
              {/* Hour and 5-minute markers */}
              {Array.from({ length: 12 }, (_, i) => {
                // Skip tick marks where numbers are displayed
                if (i % 3 === 0) return null
                
                const angle = (i * 30) - 90
                const x1 = CENTER_X + Math.cos(angle * Math.PI / 180) * (CLOCK_RADIUS - 5)
                const y1 = CENTER_Y + Math.sin(angle * Math.PI / 180) * (CLOCK_RADIUS - 5)
                const x2 = CENTER_X + Math.cos(angle * Math.PI / 180) * (CLOCK_RADIUS - 10)
                const y2 = CENTER_Y + Math.sin(angle * Math.PI / 180) * (CLOCK_RADIUS - 10)
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(178, 165, 193, 0.3)"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                )
              })}
              
              
              {/* Visual timer - filled segment for both setup and countdown */}
              <path
                d={`M ${CENTER_X} ${CENTER_Y} L ${CENTER_X} ${CENTER_Y - INNER_RADIUS} A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${
                  fillAngle > 180 ? 1 : 0
                } 1 ${
                  CENTER_X + Math.sin(fillAngle * Math.PI / 180) * INNER_RADIUS
                } ${
                  CENTER_Y - Math.cos(fillAngle * Math.PI / 180) * INNER_RADIUS
                } Z`}
                fill="#6c3baa"
                opacity="0.9"
                className="timer-segment"
              />
              
              {/* Minute hand indicator */}
              <line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={CENTER_X + Math.sin(fillAngle * Math.PI / 180) * INNER_RADIUS}
                y2={CENTER_Y - Math.cos(fillAngle * Math.PI / 180) * INNER_RADIUS}
                stroke="#f5f5f5"
                strokeWidth="3"
                strokeLinecap="round"
                className="minute-hand"
              />
              
              {/* Simple dot at end of minute hand */}
              <circle
                cx={CENTER_X + Math.sin(fillAngle * Math.PI / 180) * INNER_RADIUS}
                cy={CENTER_Y - Math.cos(fillAngle * Math.PI / 180) * INNER_RADIUS}
                r="5"
                fill="#f5f5f5"
                pointerEvents="none"
              />
              
              {/* Center circle */}
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="10"
                fill="#6c3baa"
                className="center-dot"
              />
              
            </svg>
            
          </div>
        </div>
        
        {/* Single container for presets OR message */}
        <div className="interaction-container">
          {!isRunning && !showCelebration ? (
            <div className="preset-buttons">
              {PRESET_TIMES.map(minutes => (
                <button 
                  key={minutes}
                  className={`preset-btn ${selectedMinutes === minutes ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMinutes(minutes)
                    setTimeRemaining(minutes * 60)
                  }}
                  tabIndex={-1}
                >
                  {minutes}m
                </button>
              ))}
            </div>
          ) : (
            <div className="motivational-text">{motivationalMessage}</div>
          )}
        </div>
        
        {/* Controls */}
        <div className="controls">
          {!isRunning ? (
            <button className="control-btn primary" onClick={startTimer} tabIndex={-1}>
              <span>▶</span>
              Start
            </button>
          ) : (
            <button className="control-btn primary" onClick={pauseTimer} tabIndex={-1}>
              <span>⏸</span>
              Pause
            </button>
          )}
          
          <button className="control-btn secondary" onClick={resetTimer} tabIndex={-1}>
            <span>↺</span>
            Reset
          </button>
          
          {/* Sound Toggle */}
          <button 
            className="sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            tabIndex={-1}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        
        {/* Celebration particles */}
        {showCelebration && (
          <div className="particles">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="particle"
                style={{
                  left: '50%',
                  top: '40%',
                  '--x-drift': `${particle.x}px`
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}