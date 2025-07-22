import { memo, useState, useEffect } from 'react';
import type { GiphySearchControlsProps } from '../../types/giphy.types';

export const GiphySearchControls = memo(function GiphySearchControls({
  searchQuery,
  rating,
  isLoading,
  onSearchChange,
  onRatingChange,
  onSearch,
}: GiphySearchControlsProps) {
  const [inputValue, setInputValue] = useState(searchQuery);

  // Sync input value with prop changes
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onSearchChange(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form className="giphy-search-controls" onSubmit={handleSubmit}>
      <input
        type="text"
        className="giphy-search-input"
        placeholder="Search for GIFs..."
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        maxLength={50}
        aria-label="Search GIFs"
        autoComplete="off"
        spellCheck="false"
      />
      
      <select
        className="giphy-rating-select"
        value={rating}
        onChange={(e) => onRatingChange(e.target.value as 'g' | 'pg' | 'pg-13' | 'r')}
        disabled={isLoading}
        aria-label="Content rating filter"
      >
        <option value="g">G - General Audiences</option>
        <option value="pg">PG - Parental Guidance</option>
        <option value="pg-13">PG-13 - Parents Strongly Cautioned</option>
        <option value="r">R - Restricted</option>
      </select>
      
      <button
        type="submit"
        className="giphy-search-btn"
        disabled={isLoading || !inputValue.trim()}
        aria-label="Search for GIFs"
      >
        {isLoading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span 
              style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid rgba(255,255,255,0.3)', 
                borderTop: '2px solid white', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite', 
              }}
            />
            Searching...
          </span>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
});