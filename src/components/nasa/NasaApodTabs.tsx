import { memo } from 'react'

export type NasaTabType = 'browse' | 'gallery'

interface NasaApodTabsProps {
  activeTab: NasaTabType
  favoritesCount: number
  onTabChange: (tab: NasaTabType) => void
}

export const NasaApodTabs = memo(function NasaApodTabs({
  activeTab,
  favoritesCount,
  onTabChange
}: NasaApodTabsProps) {
  return (
    <div className="nasa-apod-tabs" role="tablist">
      <button
        className={`nasa-apod-tab ${activeTab === 'browse' ? 'active' : ''}`}
        onClick={() => onTabChange('browse')}
        role="tab"
        aria-selected={activeTab === 'browse'}
        aria-controls="browse-panel"
        title="Browse daily APOD images"
      >
        <span className="nasa-apod-tab-icon">🔭</span>
        <span>Browse</span>
      </button>
      <button
        className={`nasa-apod-tab ${activeTab === 'gallery' ? 'active' : ''}`}
        onClick={() => onTabChange('gallery')}
        role="tab"
        aria-selected={activeTab === 'gallery'}
        aria-controls="gallery-panel"
        title="View your favorite APOD images"
      >
        <span className="nasa-apod-tab-icon">❤️</span>
        <span>
          Favorites {favoritesCount > 0 && `(${favoritesCount})`}
        </span>
      </button>
    </div>
  )
})