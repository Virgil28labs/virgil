import React, { memo, useState, useEffect, useCallback } from 'react'
import { nasaService } from '../../lib/nasaService'
import type { ApodImage, NasaApodViewerProps } from '../../types'
import './NasaApodViewer.css'

export const NasaApodViewer = memo(function NasaApodViewer({ 
  isOpen, 
  onClose,
  initialDate 
}: NasaApodViewerProps) {
  const [currentApod, setCurrentApod] = useState<ApodImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(() => 
    initialDate || new Date().toISOString().split('T')[0]
  )
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  // Load APOD for specific date
  const loadApodByDate = useCallback(async (date: string) => {
    if (!isOpen || loading) return

    setLoading(true)
    setError(null)
    setImageLoading(true)
    
    try {
      const apod = await nasaService.getApodByDate(date)
      setCurrentApod(apod)
      setSelectedDate(date)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load APOD'
      setError(errorMessage)
      console.error('Failed to load APOD:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen, loading])

  // Load today's APOD (convenience function)
  const loadTodaysApod = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    await loadApodByDate(today)
  }, [loadApodByDate])

  // Handle image load complete
  const handleImageLoad = useCallback(() => {
    setImageLoading(false)
  }, [])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoading(false)
    setError('Failed to load APOD image')
  }, [])

  // Handle date change
  const handleDateChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value
    if (newDate && newDate !== selectedDate) {
      await loadApodByDate(newDate)
    }
  }, [selectedDate, loadApodByDate])

  // Handle "Today" button click
  const handleTodayClick = useCallback(async () => {
    await loadTodaysApod()
  }, [loadTodaysApod])

  // Toggle description expanded state
  const toggleDescription = useCallback(() => {
    setDescriptionExpanded(prev => !prev)
  }, [])

  // Simple keyboard navigation - just ESC to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Load APOD when opened
  useEffect(() => {
    if (isOpen && !currentApod && !loading) {
      loadApodByDate(selectedDate)
    }
  }, [isOpen, currentApod, loading, selectedDate, loadApodByDate])

  // Clear state when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentApod(null)
      setError(null)
      setImageLoading(true)
      setDescriptionExpanded(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="nasa-apod-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="NASA Astronomy Picture of the Day"
    >
      <div 
        className="nasa-apod-panel" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="nasa-apod-header">
          <div>
            <h2 className="nasa-apod-title">
              <span>🔭</span>
              Astronomy Picture of the Day
            </h2>
            <div className="nasa-apod-date-picker">
              <input
                type="date"
                className="nasa-apod-date-input"
                value={selectedDate}
                onChange={handleDateChange}
                min="1995-06-16"
                max={new Date().toISOString().split('T')[0]}
                disabled={loading}
                aria-label="Select APOD date"
              />
              <button
                className="nasa-apod-today-btn"
                onClick={handleTodayClick}
                disabled={loading || selectedDate === new Date().toISOString().split('T')[0]}
                aria-label="Go to today's APOD"
              >
                Today
              </button>
            </div>
          </div>
          <button 
            className="nasa-apod-close" 
            onClick={onClose}
            aria-label="Close APOD viewer"
          >
            ×
          </button>
        </div>

        {/* Content Area - Focus on Large Image Display */}
        <div className="nasa-apod-content">
          {error ? (
            <div className="nasa-apod-error">
              <div className="nasa-apod-error-icon">⚠️</div>
              <div className="nasa-apod-error-message">{error}</div>
              <button 
                className="nasa-apod-error-retry"
                onClick={loadTodaysApod}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Retry'}
              </button>
            </div>
          ) : loading && !currentApod ? (
            <div className="nasa-apod-loading">
              <div className="nasa-apod-loading-spinner" />
              <div className="nasa-apod-loading-text">Loading today's cosmic wonder...</div>
            </div>
          ) : currentApod ? (
            <>
              {/* Large Image Display - 85% of space */}
              <div className="nasa-apod-image-container">
                {imageLoading && (
                  <div className="nasa-apod-image-skeleton">
                    <div className="nasa-apod-skeleton-shimmer" />
                  </div>
                )}
                {currentApod.mediaType === 'image' ? (
                  <img
                    src={currentApod.hdImageUrl || currentApod.imageUrl}
                    alt={currentApod.title}
                    className="nasa-apod-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ display: imageLoading ? 'none' : 'block' }}
                  />
                ) : (
                  <iframe
                    src={currentApod.imageUrl}
                    title={currentApod.title}
                    className="nasa-apod-video"
                    onLoad={handleImageLoad}
                    style={{ display: imageLoading ? 'none' : 'block' }}
                  />
                )}
              </div>

              {/* Minimal Metadata */}
              <div className="nasa-apod-metadata">
                <div className="nasa-apod-info">
                  <h3 className="nasa-apod-image-title">{currentApod.title}</h3>
                  <p className="nasa-apod-date">
                    {new Date(currentApod.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {currentApod.copyright && (
                    <p className="nasa-apod-copyright">© {currentApod.copyright}</p>
                  )}
                  
                  {/* Expandable Description */}
                  {currentApod.explanation && (
                    <div className="nasa-apod-description">
                      {descriptionExpanded ? (
                        <p className="nasa-apod-description-full">
                          {currentApod.explanation}
                        </p>
                      ) : (
                        <p className="nasa-apod-description-preview">
                          {currentApod.explanation}
                        </p>
                      )}
                      <button
                        className={`nasa-apod-description-toggle ${descriptionExpanded ? 'expanded' : ''}`}
                        onClick={toggleDescription}
                        aria-label={descriptionExpanded ? 'Show less description' : 'Show full description'}
                      >
                        <span>{descriptionExpanded ? 'Show less' : 'Read more'}</span>
                        <span className="nasa-apod-description-toggle-icon">▼</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
})