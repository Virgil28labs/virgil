import { useState, memo, useCallback, lazy, Suspense } from 'react'
import styles from './CircleGameButton.module.css'
import { CircleErrorBoundary } from './circle/CircleErrorBoundary'

const DrawPerfectCircle = lazy(() => import('./circle/DrawPerfectCircle').then(module => ({ default: module.DrawPerfectCircle })))

export const CircleGameButton = memo(function CircleGameButton() {
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  const handleClick = useCallback(() => {
    setIsViewerOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsViewerOpen(false)
  }, [])

  return (
    <>
      <button
        aria-label="Open Perfect Circle Game - Test your drawing skills!"
        onClick={handleClick}
        className={styles.button}
        title="Draw Perfect Circle - Can you draw a perfect circle?"
      >
        <span className={styles.emoji}>
          ⭕
        </span>
      </button>
      
      {isViewerOpen && (
        <CircleErrorBoundary>
          <Suspense fallback={
            <div className={styles.loadingBackdrop}>
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <span>Loading circle game...</span>
              </div>
            </div>
          }>
            <DrawPerfectCircle isOpen={isViewerOpen} onClose={handleClose} />
          </Suspense>
        </CircleErrorBoundary>
      )}
    </>
  )
})