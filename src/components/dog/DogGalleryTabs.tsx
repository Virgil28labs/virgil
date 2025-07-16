import { memo } from 'react'
import type { TabType } from '../../types'

interface DogGalleryTabsProps {
  activeTab: TabType
  favoritesCount: number
  onTabChange: (tab: TabType) => void
}

export const DogGalleryTabs = memo(function DogGalleryTabs({
  activeTab,
  favoritesCount,
  onTabChange
}: DogGalleryTabsProps) {
  return (
    <div className="doggo-sanctuary-tabs" role="tablist">
      <button
        className={`doggo-sanctuary-tab ${activeTab === 'fetch' ? 'active' : ''}`}
        onClick={() => onTabChange('fetch')}
        role="tab"
        aria-selected={activeTab === 'fetch'}
        aria-controls="fetch-panel"
        title="Press 'f' for quick access"
      >
        <span>Fetch Doggos</span>
      </button>
      <button
        className={`doggo-sanctuary-tab ${activeTab === 'gallery' ? 'active' : ''}`}
        onClick={() => onTabChange('gallery')}
        role="tab"
        aria-selected={activeTab === 'gallery'}
        aria-controls="gallery-panel"
        title="Press 'g' for quick access"
      >
        <span>
          My Collection {favoritesCount > 0 && `(♥ ${favoritesCount})`}
        </span>
      </button>
    </div>
  )
})