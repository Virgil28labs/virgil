import { memo } from 'react'

interface FetchControlsProps {
  selectedBreed: string
  fetchCount: number
  breeds: string[]
  loading: boolean
  onBreedChange: (breed: string) => void
  onCountChange: (count: number) => void
  onFetch: () => void
}

const FETCH_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export const FetchControls = memo(function FetchControls({
  selectedBreed,
  fetchCount,
  breeds,
  loading,
  onBreedChange,
  onCountChange,
  onFetch
}: FetchControlsProps) {
  return (
    <div className="doggo-fetch-controls">
      <div className="doggo-control-group">
        <label className="doggo-control-label" htmlFor="breed-select">
          Breed:
        </label>
        <select
          id="breed-select"
          className="doggo-breed-select"
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

      <div className="doggo-control-group">
        <label className="doggo-control-label" htmlFor="count-select">
          Count:
        </label>
        <select
          id="count-select"
          className="doggo-count-select"
          value={fetchCount}
          onChange={(e) => onCountChange(Number(e.target.value))}
        >
          {FETCH_COUNTS.map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      <button
        className="doggo-fetch-btn"
        onClick={onFetch}
        disabled={loading}
      >
        {loading ? 'Fetching...' : 'Fetch'}
      </button>
    </div>
  )
})