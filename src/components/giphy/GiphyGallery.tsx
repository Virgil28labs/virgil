import React, { memo, useState } from 'react';
import { GiphyGalleryProvider } from './GiphyGalleryProvider';
import { useGiphyGallery } from './useGiphyGallery';
import { GiphyTabs } from './GiphyTabs';
import { GiphySearchControls } from './GiphySearchControls';
import { GiphyGrid } from './GiphyGrid';
import { GiphyModal } from './GiphyModal';
import type { GiphyImage } from '../../types';
import styles from './GiphyGallery.module.css';

// Props for the gallery
export interface GiphyGalleryProps {
  isOpen: boolean
  onClose: () => void
}

// Inner component that has access to the context
const GiphyGalleryInner = memo(function GiphyGalleryInner({ isOpen, onClose }: GiphyGalleryProps) {
  const {
    searchResults,
    trendingGifs,
    favorites,
    searchQuery,
    currentTab,
    rating,
    loading,
    error,
    search,
    setSearchQuery,
    setCurrentTab,
    setRating,
    toggleFavorite,
    isFavorited,
    clearError,
  } = useGiphyGallery();

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Get current display GIFs based on active tab
  const getCurrentGifs = (): GiphyImage[] => {
    switch (currentTab) {
      case 'search':
        return searchResults;
      case 'trending':
        return trendingGifs;
      case 'favorites':
        return favorites;
      default:
        return [];
    }
  };

  const currentGifs = getCurrentGifs();

  // Handle search form submission
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setCurrentTab('search');
      search(searchQuery.trim());
    }
  };

  // Handle image click to open modal
  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (selectedImageIndex !== null) {
        setSelectedImageIndex(null);
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && e.target === e.currentTarget) {
      // Handle Enter on main container if no other element has focus
      if (currentTab === 'search' && searchQuery.trim()) {
        handleSearch();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.giphyGalleryBackdrop}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Giphy Gallery"
      tabIndex={-1}
    >
      <div
        className={styles.giphyGalleryPanel}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className={styles.giphyGalleryHeader}>
          <div>
            <h2 className={styles.giphyGalleryTitle}>
              <span>🎬</span>
              GIPHY Gifs
            </h2>
          </div>
          <button
            className={styles.giphyGalleryClose}
            onClick={onClose}
            aria-label="Close gallery"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <GiphyTabs
          currentTab={currentTab}
          searchCount={searchResults.length}
          trendingCount={trendingGifs.length}
          favoritesCount={favorites.length}
          onTabChange={setCurrentTab}
        />

        {/* Search Controls (only show for search tab) */}
        {currentTab === 'search' && (
          <GiphySearchControls
            searchQuery={searchQuery}
            rating={rating}
            isLoading={loading === 'loading'}
            onSearchChange={setSearchQuery}
            onRatingChange={setRating}
            onSearch={handleSearch}
          />
        )}

        {/* Content Area */}
        <div className={styles.giphyGalleryContent}>
          {error && (
            <div className={styles.giphyError}>
              <div className={styles.giphyErrorIcon}>⚠️</div>
              <div className={styles.giphyErrorMessage}>{error}</div>
              <button
                className={styles.giphyErrorRetry}
                onClick={clearError}
              >
                Dismiss
              </button>
            </div>
          )}

          <GiphyGrid
            gifs={currentGifs}
            loading={loading === 'loading'}
            error={error}
            onImageClick={handleImageClick}
            onFavoriteToggle={toggleFavorite}
            isFavorited={isFavorited}
          />

          {/* Empty state messages */}
          {loading !== 'loading' && !error && currentGifs.length === 0 && (
            <div className={styles.giphyEmpty}>
              {currentTab === 'search' ? (
                <>
                  <div className={styles.giphyEmptyIcon}>🔍</div>
                  <div className={styles.giphyEmptyTitle}>No search results</div>
                  <div className={styles.giphyEmptyMessage}>
                    {searchQuery ?
                      `No GIFs found for "${searchQuery}". Try a different search term.` :
                      'Enter a search term to find GIFs'}
                  </div>
                </>
              ) : currentTab === 'trending' ? (
                <>
                  <div className={styles.giphyEmptyIcon}>🔥</div>
                  <div className={styles.giphyEmptyTitle}>No trending GIFs</div>
                  <div className={styles.giphyEmptyMessage}>
                    Unable to load trending GIFs. Please try again later.
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.giphyEmptyIcon}>❤️</div>
                  <div className={styles.giphyEmptyTitle}>No favorites yet</div>
                  <div className={styles.giphyEmptyMessage}>
                    Save GIFs to your favorites by clicking the heart icon
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (
        <GiphyModal
          gifs={currentGifs}
          currentIndex={selectedImageIndex}
          isFavorited={isFavorited}
          onClose={() => setSelectedImageIndex(null)}
          onNavigate={setSelectedImageIndex}
          onFavoriteToggle={toggleFavorite}
        />
      )}
    </div>
  );
});

// Main component with provider
export const GiphyGallery = memo(function GiphyGallery(props: GiphyGalleryProps) {
  return (
    <GiphyGalleryProvider isOpen={props.isOpen}>
      <GiphyGalleryInner {...props} />
    </GiphyGalleryProvider>
  );
});
