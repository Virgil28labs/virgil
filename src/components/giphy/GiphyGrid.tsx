import { memo } from "react";
import { GiphyCard } from "./GiphyCard";
import type { GiphyGridProps } from "../../types/giphy.types";

export const GiphyGrid = memo(function GiphyGrid({
  gifs,
  loading,
  error,
  onImageClick,
  onFavoriteToggle,
  isFavorited,
}: GiphyGridProps) {
  // Show loading state
  if (loading && gifs.length === 0) {
    return (
      <div className="giphy-loading">
        <div className="giphy-loading-spinner" />
        <div className="giphy-loading-text">Loading GIFs...</div>
      </div>
    );
  }

  // Show error state if no gifs to display
  if (error && gifs.length === 0) {
    return null; // Error is handled by parent component
  }

  return (
    <div className="giphy-grid">
      {gifs.map((gif, index) => (
        <GiphyCard
          key={gif.id}
          gif={gif}
          index={index}
          isFavorited={isFavorited(gif.url)}
          onImageClick={() => onImageClick(index)}
          onFavoriteToggle={() => onFavoriteToggle(gif)}
        />
      ))}

      {/* Loading more indicator */}
      {loading && gifs.length > 0 && (
        <div className="giphy-loading-more">
          <div className="giphy-loading-spinner" />
        </div>
      )}
    </div>
  );
});
