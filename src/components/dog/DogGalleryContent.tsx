import { memo } from 'react';
import { FetchControls } from './FetchControls';
import { DogGrid } from './DogGrid';
import { DogImageStates } from './DogImageStates';
import { useDogGallery } from './hooks/useDogGallery';
import styles from './DogGallery.module.css';

export const DogGalleryContent = memo(function DogGalleryContent() {
  const {
    state,
    dogs,
    breeds,
    loading,
    error,
    favorites,
    setActiveTab,
    setSelectedBreed,
    setFetchCount,
    setSelectedImageIndex,
    fetchDogs,
    isFavorited,
    toggleFavorite,
  } = useDogGallery();

  const displayDogs = state.activeTab === 'fetch' ? dogs : favorites;

  const handleImageClick = (url: string) => {
    const index = displayDogs.findIndex(dog => dog.url === url);
    if (index !== -1) setSelectedImageIndex(index);
  };

  const handleFetch = () => {
    fetchDogs();
  };

  const handleSwitchToFetch = () => {
    setActiveTab('fetch');
  };

  return (
    <div className={styles.doggoSanctuaryContent}>
      {/* Fetch Controls - Only show in fetch tab */}
      {state.activeTab === 'fetch' && (
        <FetchControls
          selectedBreed={state.selectedBreed}
          fetchCount={state.fetchCount}
          breeds={breeds}
          loading={loading}
          onBreedChange={setSelectedBreed}
          onCountChange={setFetchCount}
          onFetch={handleFetch}
        />
      )}

      {/* States: Loading, Error, or Empty */}
      <DogImageStates
        loading={loading}
        error={error}
        dogsCount={displayDogs.length}
        activeTab={state.activeTab}
        onSwitchToFetch={state.activeTab === 'gallery' ? handleSwitchToFetch : undefined}
      />

      {/* Dog Grid - Only show when there are dogs and no loading/error states */}
      {!loading && displayDogs.length > 0 && (
        <DogGrid
          dogs={displayDogs}
          isFavorited={isFavorited}
          onImageClick={handleImageClick}
          onFavoriteToggle={toggleFavorite}
        />
      )}
    </div>
  );
});
