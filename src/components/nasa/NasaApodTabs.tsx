import { memo } from 'react';
import styles from './NasaApodViewer.module.css';

export type NasaTabType = 'browse' | 'gallery'

interface NasaApodTabsProps {
  activeTab: NasaTabType
  favoritesCount: number
  onTabChange: (tab: NasaTabType) => void
}

export const NasaApodTabs = memo(function NasaApodTabs({
  activeTab,
  favoritesCount,
  onTabChange,
}: NasaApodTabsProps) {
  return (
    <div className={styles.nasaApodTabs} role="tablist">
      <button
        className={`${styles.nasaApodTab} ${activeTab === 'browse' ? styles.active : ''}`}
        onClick={() => onTabChange('browse')}
        role="tab"
        aria-selected={activeTab === 'browse'}
        aria-controls="browse-panel"
        title="Browse daily APOD images"
      >
        <span className={styles.nasaApodTabIcon}>🔭</span>
        <span>Browse</span>
      </button>
      <button
        className={`${styles.nasaApodTab} ${activeTab === 'gallery' ? styles.active : ''}`}
        onClick={() => onTabChange('gallery')}
        role="tab"
        aria-selected={activeTab === 'gallery'}
        aria-controls="gallery-panel"
        title="View your favorite APOD images"
      >
        <span className={styles.nasaApodTabIcon}>❤️</span>
        <span>
          Favorites {favoritesCount > 0 && `(${favoritesCount})`}
        </span>
      </button>
    </div>
  );
});
