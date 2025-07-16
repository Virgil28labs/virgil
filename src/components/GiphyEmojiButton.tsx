import { useState, memo, useCallback, lazy, Suspense } from 'react'

const GiphyGallery = lazy(() => import('./giphy/GiphyGallery').then(module => ({ default: module.GiphyGallery })))

export const GiphyEmojiButton = memo(function GiphyEmojiButton() {
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
        aria-label="Open GIF Gallery"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontSize: '1.2rem',
          background: hovered ? 'rgba(255, 107, 157, 0.2)' : 'none',
          border: hovered ? '2px solid rgba(255, 107, 157, 0.4)' : '2px solid transparent',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'fixed',
          top: '7.5rem', // Position below the dog button
          right: 'calc(2rem - 10px)',
          zIndex: 1000,
          opacity: hovered ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          transform: hovered ? 'scale(1.15) rotate(-5deg) translateY(-2px)' : 'scale(1) rotate(0deg)',
          backdropFilter: hovered ? 'blur(10px)' : 'none',
        }}
        title="Open GIF Gallery - Search and save your favorite GIFs!"
      >
        🎬
      </button>
      
      {isGalleryOpen && (
        <Suspense fallback={null}>
          <GiphyGallery isOpen={isGalleryOpen} onClose={handleClose} />
        </Suspense>
      )}
    </>
  )
})