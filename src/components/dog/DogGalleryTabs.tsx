import { memo } from 'react';
import type { TabType } from '../../types';
import styles from './DogGallery.module.css';

interface DogGalleryTabsProps {
  activeTab: TabType
  favoritesCount: number
  onTabChange: (tab: TabType) => void
}

export const DogGalleryTabs = memo(function DogGalleryTabs({
  activeTab,
  favoritesCount,
  onTabChange,
}: DogGalleryTabsProps) {
  return (
    <div className={styles.doggoSanctuaryTabs} role="tablist">
      <button
        className={`${styles.doggoSanctuaryTab} ${activeTab === 'fetch' ? styles.active : ''}`}
        onClick={() => onTabChange('fetch')}
        role="tab"
        aria-selected={activeTab === 'fetch'}
        aria-controls="fetch-panel"
        title="Press 'f' for quick access"
      >
        <span>Fetch Doggos</span>
      </button>
      <button
        className={`${styles.doggoSanctuaryTab} ${activeTab === 'gallery' ? styles.active : ''}`}
        onClick={() => onTabChange('gallery')}
        role="tab"
        aria-selected={activeTab === 'gallery'}
        aria-controls="gallery-panel"
        title="Press 'g' for quick access"
      >
        <span>
          ❤️ Favorites {favoritesCount > 0 && `(${favoritesCount})`}
        </span>
      </button>
    </div>
  );
});
