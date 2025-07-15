import React, { useState, useEffect, useCallback, memo } from 'react'
import { useDogApi } from './hooks/useDogApi'
import { useDogFavorites } from './hooks/useDogFavorites'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { FetchControls } from './FetchControls'
import { DogGrid } from './DogGrid'
import { ImageModal } from './ImageModal'
import './DogGallery.css'

interface DogGalleryProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'fetch' | 'gallery'

export const DogGallery = memo(function DogGallery({ isOpen, onClose }: DogGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('fetch')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [fetchCount, setFetchCount] = useState(3)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  
  const { dogs, breeds, loading, error, fetchDogs, fetchBreeds } = useDogApi()
  const { favorites, isFavorited, toggleFavorite } = useDogFavorites()

  // Load breeds when opening
  useEffect(() => {
    if (isOpen && breeds.length === 0) {
      fetchBreeds()
    }
  }, [isOpen, breeds.length, fetchBreeds])


  // Handle fetch button click
  const handleFetch = useCallback(() => {
    fetchDogs(selectedBreed, fetchCount)
  }, [fetchDogs, selectedBreed, fetchCount])

  // Switch to fetch tab
  const handleGoFetch = useCallback(() => {
    setActiveTab('fetch')
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Escape': selectedImageIndex !== null ? () => setSelectedImageIndex(null) : onClose,
    'f': () => setActiveTab('fetch'),
    'g': () => setActiveTab('gallery')
  }, isOpen)

  if (!isOpen) return null

  const displayDogs = activeTab === 'fetch' ? dogs : favorites

  return (
    <div className="doggo-sanctuary-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Doggo Sanctuary">
      <div className="doggo-sanctuary-panel" onClick={(e) => e.stopPropagation()} role="document">
        {/* Header */}
        <div className="doggo-sanctuary-header">
          <div>
            <h2 className="doggo-sanctuary-title">
              <span>🐕</span>
              Doggo Sanctuary
            </h2>
            <p className="doggo-sanctuary-subtitle">Your personal collection of adorable companions</p>
          </div>
          <button 
            className="doggo-sanctuary-close" 
            onClick={onClose}
            aria-label="Close sanctuary"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="doggo-sanctuary-tabs" role="tablist">
          <button
            className={`doggo-sanctuary-tab ${activeTab === 'fetch' ? 'active' : ''}`}
            onClick={() => setActiveTab('fetch')}
            role="tab"
            aria-selected={activeTab === 'fetch'}
            aria-controls="fetch-panel"
            title="Press 'f' for quick access"
          >
            <span>Fetch Doggos</span>
          </button>
          <button
            className={`doggo-sanctuary-tab ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
            role="tab"
            aria-selected={activeTab === 'gallery'}
            aria-controls="gallery-panel"
            title="Press 'g' for quick access"
          >
            <span>My Collection {favorites.length > 0 && `(♥ ${favorites.length})`}</span>
          </button>
        </div>

        {/* Content */}
        <div className="doggo-sanctuary-content">
          {activeTab === 'fetch' && (
            <FetchControls
              selectedBreed={selectedBreed}
              fetchCount={fetchCount}
              breeds={breeds}
              loading={loading}
              onBreedChange={setSelectedBreed}
              onCountChange={setFetchCount}
              onFetch={handleFetch}
            />
          )}

          {/* Loading State */}
          {loading && (
            <div className="doggo-loading">
              <div className="doggo-loading-spinner"></div>
              <p className="doggo-loading-text">Fetching adorable doggos...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="doggo-error">
              <div className="doggo-error-icon">😢</div>
              <p className="doggo-error-message">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayDogs.length === 0 && (
            <div className="doggo-empty">
              <div className="doggo-empty-icon">🏠</div>
              <h3 className="doggo-empty-title">
                {activeTab === 'fetch' 
                  ? "Ready to meet some doggos?"
                  : "Your Doggo Sanctuary is empty!"}
              </h3>
              <p className="doggo-empty-message">
                {activeTab === 'fetch' 
                  ? "Choose your preferences and click 'Fetch'"
                  : "Start by fetching some adorable friends"}
              </p>
              {activeTab === 'gallery' && (
                <button className="doggo-empty-button" onClick={handleGoFetch}>
                  Go Fetch →
                </button>
              )}
            </div>
          )}

          {/* Dog Grid */}
          {!loading && displayDogs.length > 0 && (
            <DogGrid
              dogs={displayDogs}
              isFavorited={isFavorited}
              onImageClick={(url) => {
                const index = displayDogs.findIndex(dog => dog.url === url)
                if (index !== -1) setSelectedImageIndex(index)
              }}
              onFavoriteToggle={toggleFavorite}
            />
          )}
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal 
        dogs={displayDogs}
        currentIndex={selectedImageIndex}
        isFavorited={isFavorited}
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={setSelectedImageIndex}
        onFavoriteToggle={toggleFavorite}
      />
    </div>
  )
})