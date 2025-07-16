import { useState, memo, useCallback, lazy, Suspense } from 'react'

const RhythmMachineViewer = lazy(() => import('./rhythm/RhythmMachineViewer').then(module => ({ default: module.RhythmMachineViewer })))

export const RhythmMachineButton = memo(function RhythmMachineButton() {
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
        aria-label="Open Rhythm Machine - AI-powered drum sequencer"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: '1.2rem',
          background: hovered 
            ? 'linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 143, 179, 0.3) 100%)' 
            : 'none',
          border: hovered 
            ? '2px solid rgba(255, 107, 157, 0.6)' 
            : '2px solid transparent',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'fixed',
          top: '12rem', // Position below the NASA button
          right: 'calc(2rem - 10px)',
          zIndex: 1000,
          opacity: hovered ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: hovered 
            ? 'drop-shadow(0 8px 25px rgba(255, 107, 157, 0.4))' 
            : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          transform: hovered 
            ? 'scale(1.15) rotate(-5deg) translateY(-3px)' 
            : 'scale(1) rotate(0deg)',
          backdropFilter: hovered ? 'blur(20px)' : 'none',
          boxShadow: hovered 
            ? '0 0 30px rgba(255, 107, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
            : 'none'
        }}
        title="Rhythm Machine - Create beats with AI-powered drum sequencer!"
      >
        <span
          style={{
            background: hovered 
              ? 'linear-gradient(45deg, #ff6b9d, #ff8fb3)' 
              : 'transparent',
            WebkitBackgroundClip: hovered ? 'text' : 'none',
            WebkitTextFillColor: hovered ? 'transparent' : 'inherit',
            transition: 'all 0.3s ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            display: 'inline-block'
          }}
        >
          🥁
        </span>
      </button>
      
      {isViewerOpen && (
        <Suspense fallback={
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(35, 10, 25, 0.8)',
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
                border: '3px solid rgba(255, 107, 157, 0.3)',
                borderTop: '3px solid #ff6b9d',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Loading rhythm machine...</span>
            </div>
          </div>
        }>
          <RhythmMachineViewer isOpen={isViewerOpen} onClose={handleClose} />
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