import { memo } from 'react';
import styles from './DogGallery.module.css';

interface FetchControlsProps {
  selectedBreed: string
  fetchCount: number
  breeds: string[]
  loading: boolean
  onBreedChange: (breed: string) => void
  onCountChange: (count: number) => void
  onFetch: () => void
}

const FETCH_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const FetchControls = memo(function FetchControls({
  selectedBreed,
  fetchCount,
  breeds,
  loading,
  onBreedChange,
  onCountChange,
  onFetch,
}: FetchControlsProps) {
  return (
    <div className={styles.doggoFetchControls}>
      <div className={styles.doggoControlGroup}>
        <label className={styles.doggoControlLabel} htmlFor="breed-select">
          Breed:
        </label>
        <select
          id="breed-select"
          className={styles.doggoBreedSelect}
          value={selectedBreed}
          onChange={(e) => onBreedChange(e.target.value)}
        >
          <option value="">Random Mix</option>
          {breeds.map(breed => (
            <option key={breed} value={breed}>
              {breed.charAt(0).toUpperCase() + breed.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.doggoControlGroup}>
        <label className={styles.doggoControlLabel} htmlFor="count-select">
          Count:
        </label>
        <select
          id="count-select"
          className={styles.doggoCountSelect}
          value={fetchCount}
          onChange={(e) => onCountChange(Number(e.target.value))}
        >
          {FETCH_COUNTS.map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      <button
        className={styles.doggoFetchBtn}
        onClick={onFetch}
        disabled={loading}
      >
        {loading ? 'Fetching...' : 'Fetch'}
      </button>
    </div>
  );
});
