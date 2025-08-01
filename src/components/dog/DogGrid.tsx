import React, { memo, useCallback } from 'react';
import { DogCard } from './DogCard';
import type { DogImage } from './hooks/useDogApi';
import styles from './DogGallery.module.css';

interface DogGridProps {
  dogs: DogImage[]
  isFavorited: (url: string) => boolean
  onImageClick: (url: string) => void
  onFavoriteToggle: (dog: DogImage) => void
}

export const DogGrid = memo(function DogGrid({
  dogs,
  isFavorited,
  onImageClick,
  onFavoriteToggle,
}: DogGridProps) {
  const handleFavoriteToggle = useCallback((e: React.MouseEvent, dog: DogImage) => {
    e.stopPropagation();
    onFavoriteToggle(dog);
  }, [onFavoriteToggle]);

  return (
    <div className={styles.doggoGrid}>
      {dogs.map((dog, index) => (
        <DogCard
          key={dog.id}
          dog={dog}
          index={index}
          isFavorited={isFavorited(dog.url)}
          onImageClick={() => onImageClick(dog.url)}
          onFavoriteToggle={(e) => handleFavoriteToggle(e, dog)}
        />
      ))}
    </div>
  );
});
