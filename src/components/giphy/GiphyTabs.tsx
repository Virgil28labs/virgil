import { memo } from 'react';
import styles from './GiphyGallery.module.css';

export interface GiphyTabsProps {
  currentTab: 'search' | 'trending' | 'favorites'
  searchCount: number
  trendingCount: number
  favoritesCount: number
  onTabChange: (tab: 'search' | 'trending' | 'favorites') => void
}

export const GiphyTabs = memo(function GiphyTabs({
  currentTab,
  searchCount,
  trendingCount,
  favoritesCount,
  onTabChange,
}: GiphyTabsProps) {
  return (
    <div className={styles.giphyGalleryTabs}>
      <button
        className={`${styles.giphyGalleryTab} ${currentTab === 'search' ? styles.active : ''}`}
        onClick={() => onTabChange('search')}
        aria-label="Search GIFs"
      >
        <span>🔍 Search</span>
        {searchCount > 0 && (
          <span className={styles.giphyTabCount}>{searchCount}</span>
        )}
      </button>

      <button
        className={`${styles.giphyGalleryTab} ${currentTab === 'trending' ? styles.active : ''}`}
        onClick={() => onTabChange('trending')}
        aria-label="Trending GIFs"
      >
        <span>🔥 Trending</span>
        {trendingCount > 0 && (
          <span className={styles.giphyTabCount}>{trendingCount}</span>
        )}
      </button>

      <button
        className={`${styles.giphyGalleryTab} ${currentTab === 'favorites' ? styles.active : ''}`}
        onClick={() => onTabChange('favorites')}
        aria-label="Favorite GIFs"
      >
        <span>❤️ Favorites</span>
        {favoritesCount > 0 && (
          <span className={styles.giphyTabCount}>{favoritesCount}</span>
        )}
      </button>
    </div>
  );
});
