import { useState, memo, useCallback, lazy, Suspense } from 'react'

const DogGallery = lazy(() => import('./dog/DogGallery').then(module => ({ default: module.DogGallery })))

export const DogEmojiButton = memo(function DogEmojiButton() {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(() => {
    setIsGalleryOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsGalleryOpen(false)
  }, [])

  return (
    <>
      <button
        aria-label="Open Doggo Sanctuary"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: '1.2rem',
          background: hovered ? 'rgba(108, 59, 170, 0.2)' : 'none',
          border: hovered ? '2px solid rgba(178, 165, 193, 0.3)' : '2px solid transparent',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'fixed',
          top: '4.5rem',
          right: 'calc(2rem - 10px)',
          zIndex: 1000,
          opacity: hovered ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          transform: hovered ? 'scale(1.15) rotate(10deg) translateY(-2px)' : 'scale(1) rotate(0deg)',
          backdropFilter: hovered ? 'blur(10px)' : 'none',
        }}
        title="Visit the Doggo Sanctuary!"
      >
        🐕
      </button>
      
      {isGalleryOpen && (
        <Suspense fallback={null}>
          <DogGallery isOpen={isGalleryOpen} onClose={handleClose} />
        </Suspense>
      )}
    </>
  )
})