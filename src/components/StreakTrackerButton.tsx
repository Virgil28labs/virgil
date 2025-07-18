import { useState, memo, useCallback, lazy, Suspense } from 'react'

const MinimalHabitTracker = lazy(() => import('./streak/MinimalHabitTracker').then(module => ({ default: module.MinimalHabitTracker })))

export const StreakTrackerButton = memo(function StreakTrackerButton() {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(() => {
    setIsViewerOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsViewerOpen(false)
  }, [])

  return (
    <>
      <button
        aria-label="Open Habit Tracker - Track your daily habits with fire streaks!"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: '1.2rem',
          background: hovered 
            ? 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(90, 50, 140, 0.3) 100%)' 
            : 'none',
          border: hovered 
            ? '2px solid rgba(108, 59, 170, 0.6)' 
            : '2px solid transparent',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'fixed',
          top: '17rem', // Position below the Circle Game button
          right: 'calc(2rem - 10px)',
          zIndex: 1000,
          opacity: hovered ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: hovered 
            ? 'drop-shadow(0 8px 25px rgba(108, 59, 170, 0.4))' 
            : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          transform: hovered 
            ? 'scale(1.15) rotate(-5deg) translateY(-3px)' 
            : 'scale(1) rotate(0deg)',
          backdropFilter: hovered ? 'blur(20px)' : 'none',
          boxShadow: hovered 
            ? '0 0 30px rgba(108, 59, 170, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
            : 'none'
        }}
        title="Habit Streaks - Track up to 10 habits and build fire streaks!"
      >
        <span
          style={{
            background: hovered 
              ? 'linear-gradient(45deg, #6c3baa, #5a32a3)' 
              : 'transparent',
            WebkitBackgroundClip: hovered ? 'text' : 'none',
            WebkitTextFillColor: hovered ? 'transparent' : 'inherit',
            transition: 'all 0.3s ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            display: 'inline-block'
          }}
        >
          🔥
        </span>
      </button>
      
      {isViewerOpen && (
        <Suspense fallback={
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(35, 15, 10, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3000,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              color: 'white'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '3px solid rgba(108, 59, 170, 0.3)',
                borderTop: '3px solid #6c3baa',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Loading habit tracker...</span>
            </div>
          </div>
        }>
          <MinimalHabitTracker isOpen={isViewerOpen} onClose={handleClose} />
        </Suspense>
      )}
      
      {/* Add the spin animation for the loading fallback */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
})