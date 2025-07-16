import { memo } from 'react'
import type { TabType } from '../../types'

interface DogImageStatesProps {
  loading: boolean
  error: string | null
  dogsCount: number
  activeTab: TabType
  onSwitchToFetch?: () => void
}

export const DogImageStates = memo(function DogImageStates({
  loading,
  error,
  dogsCount,
  activeTab,
  onSwitchToFetch
}: DogImageStatesProps) {
  // Loading State
  if (loading) {
    return (
      <div className="doggo-loading">
        <div className="doggo-loading-spinner"></div>
        <p className="doggo-loading-text">Fetching adorable doggos...</p>
      </div>
    )
  }

  // Error State
  if (error && !loading) {
    return (
      <div className="doggo-error">
        <div className="doggo-error-icon">😢</div>
        <p className="doggo-error-message">{error}</p>
      </div>
    )
  }

  // Empty State
  if (!loading && !error && dogsCount === 0) {
    return (
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
        {activeTab === 'gallery' && onSwitchToFetch && (
          <button 
            className="doggo-empty-button" 
            onClick={onSwitchToFetch}
            aria-label="Switch to fetch tab to get dogs"
          >
            Go Fetch →
          </button>
        )}
      </div>
    )
  }

  // Return null if there are dogs to display
  return null
})

// Specialized loading component for individual images
export const DogImageSkeleton = memo(function DogImageSkeleton() {
  return <div className="doggo-image-skeleton" />
})

// Specialized error component for individual images
export const DogImageError = memo(function DogImageError() {
  return (
    <div className="doggo-image-error" aria-label="Image failed to load">
      🐕‍🦺
    </div>
  )
})