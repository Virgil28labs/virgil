import React, { memo } from 'react';

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
    <div className="photo-gallery-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`photo-gallery-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={`Switch to ${tab.label} tab`}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {tab.count !== null && (
            <span className="tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
});
