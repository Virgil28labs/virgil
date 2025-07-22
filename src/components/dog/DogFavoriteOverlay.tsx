import { memo } from 'react';
import type { MouseEvent } from 'react';

interface DogFavoriteOverlayProps {
  isFavorited: boolean
  onFavoriteToggle: (e: MouseEvent) => void
}

export const DogFavoriteOverlay = memo(function DogFavoriteOverlay({
  isFavorited,
  onFavoriteToggle,
}: DogFavoriteOverlayProps) {
  return (
    <button
      className={`doggo-favorite-overlay ${isFavorited ? 'favorited' : ''}`}
      onClick={onFavoriteToggle}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
});