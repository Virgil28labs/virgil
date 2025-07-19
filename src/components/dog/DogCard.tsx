import { memo, useState } from "react";
import type { DogCardProps } from "../../types";
import { DogFavoriteOverlay } from "./DogFavoriteOverlay";
import { DogCardActions } from "./DogCardActions";
import { DogImageSkeleton, DogImageError } from "./DogImageStates";

export const DogCard = memo(function DogCard({
  dog,
  index,
  isFavorited,
  onImageClick,
  onFavoriteToggle,
}: DogCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="doggo-grid-item"
      onClick={onImageClick}
      style={{ "--index": index } as React.CSSProperties}
      data-loaded={imageLoaded}
    >
      {!imageLoaded && !imageError && <DogImageSkeleton />}

      {imageError ? (
        <DogImageError />
      ) : (
        <img
          src={dog.url}
          alt={`${dog.breed} dog`}
          className="doggo-grid-image"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      )}

      <DogFavoriteOverlay
        isFavorited={isFavorited}
        onFavoriteToggle={onFavoriteToggle}
      />

      <DogCardActions dog={dog} />
    </div>
  );
});
