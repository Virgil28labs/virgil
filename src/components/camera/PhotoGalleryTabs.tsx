import { memo } from 'react';
import styles from './Camera.module.css';

interface PhotoGalleryTabsProps {
  activeTab: 'camera' | 'gallery' | 'favorites'
  onTabChange: (tab: 'camera' | 'gallery' | 'favorites') => void
  photoCount: number
  favoriteCount: number
}

export const PhotoGalleryTabs = memo(function PhotoGalleryTabs({
  activeTab,
  onTabChange,
  photoCount,
  favoriteCount,
}: PhotoGalleryTabsProps) {
  const tabs = [
    {
      id: 'camera' as const,
      label: 'Camera',
      icon: '📸',
      count: null,
    },
    {
      id: 'gallery' as const,
      label: 'Gallery',
      icon: '🖼️',
      count: photoCount,
    },
    {
      id: 'favorites' as const,
      label: 'Favorites',
      icon: '❤️',
      count: favoriteCount,
    },
  ];

  return (
    <div className={styles.photoGalleryTabs}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${styles.photoGalleryTab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={`Switch to ${tab.label} tab`}
        >
          <span className={styles.tabIcon}>{tab.icon}</span>
          <span className={styles.tabLabel}>{tab.label}</span>
          {tab.count !== null && (
            <span className={styles.tabCount}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
});
