import { memo } from 'react';
import { DogGalleryProvider } from './DogGalleryProvider';
import { useDogGallery } from './hooks/useDogGallery';
import { DogGalleryTabs } from './DogGalleryTabs';
import { DogGalleryContent } from './DogGalleryContent';
import { ImageModal } from './ImageModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { DogGalleryProps } from '../../types';
import './DogGallery.css';

// Inner component that has access to the context
const DogGalleryInner = memo(function DogGalleryInner({ isOpen, onClose }: DogGalleryProps) {
  const {
    state,
    dogs,
    favorites,
    setActiveTab,
    setSelectedImageIndex,
    isFavorited,
    toggleFavorite,
  } = useDogGallery();

  const displayDogs = state.activeTab === 'fetch' ? dogs : favorites;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Escape': state.selectedImageIndex !== null ? () => setSelectedImageIndex(null) : onClose,
    'f': () => setActiveTab('fetch'),
    'g': () => setActiveTab('gallery'),
  }, isOpen);

  if (!isOpen) return null;

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
        <DogGalleryTabs
          activeTab={state.activeTab}
          favoritesCount={favorites.length}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <DogGalleryContent />
      </div>

      {/* Image Modal */}
      <ImageModal 
        dogs={displayDogs}
        currentIndex={state.selectedImageIndex}
        isFavorited={isFavorited}
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={setSelectedImageIndex}
        onFavoriteToggle={toggleFavorite}
      />
    </div>
  );
});

// Main component with provider
export const DogGallery = memo(function DogGallery(props: DogGalleryProps) {
  return (
    <DogGalleryProvider isOpen={props.isOpen}>
      <DogGalleryInner {...props} />
    </DogGalleryProvider>
  );
});