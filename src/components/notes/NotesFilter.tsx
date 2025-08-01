/**
 * Filter and search component for notes
 * Provides tag-based filtering and text search functionality
 */

import React, { useState, useCallback } from 'react';
import type { FilterType, ActionFilterType } from './types';
import { DOMAIN_FILTERS, ACTION_FILTERS } from './constants';
import styles from './Notes.module.css';

interface NotesFilterProps {
  /** Currently active filter */
  activeFilter: FilterType
  /** Callback when filter changes */
  onFilterChange: (filter: FilterType) => void
  /** Currently active action filter */
  activeActionFilter?: ActionFilterType
  /** Callback when action filter changes */
  onActionFilterChange?: (filter: ActionFilterType) => void
  /** Current search query */
  searchQuery: string
  /** Callback when search query changes */
  onSearchChange: (query: string) => void
}

/**
 * Filter bar with tag buttons and search functionality
 * - Keyboard navigation support
 * - Clear visual feedback for active states
 * - Accessible search toggle
 */
export const NotesFilter = ({
  activeFilter,
  onFilterChange,
  activeActionFilter = 'all',
  onActionFilterChange,
  searchQuery,
  onSearchChange,
}: NotesFilterProps) => {
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearch(false);
      onSearchChange('');
    }
  }, [onSearchChange]);

  // Use centralized filter constants
  const filters = DOMAIN_FILTERS;
  const actionFilters = ACTION_FILTERS;

  return (
    <div className={styles.notesFilterContainer} role="toolbar" aria-label="Note filters">
      <div className={styles.notesFilterBar} role="tablist" aria-label="Filter by tag">
        {filters.map(filter => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value as FilterType)}
            className={`${styles.notesFilterButton} ${activeFilter === filter.value ? styles.active : ''}`}
            aria-label={`Filter by ${filter.label}`}
            aria-pressed={activeFilter === filter.value}
            role="tab"
            aria-selected={activeFilter === filter.value}
          >
            {filter.label}
          </button>
        ))}

        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`${styles.notesSearchToggle} ${showSearch ? styles.active : ''}`}
          aria-label="Toggle search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {onActionFilterChange && (
        <div className={`${styles.notesFilterBar} ${styles.notesActionFilters}`} role="tablist" aria-label="Filter by action type">
          {actionFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => onActionFilterChange(filter.value as ActionFilterType)}
              className={`${styles.notesFilterButton} ${activeActionFilter === filter.value ? styles.active : ''}`}
              aria-label={`Filter by ${filter.label}`}
              aria-pressed={activeActionFilter === filter.value}
              role="tab"
              aria-selected={activeActionFilter === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {showSearch && (
        <div className={styles.notesSearchWrapper}>
          <span className={styles.notesSearchIcon}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search notes..."
            className={styles.notesSearchInput}
            autoFocus
            aria-label="Search notes"
            aria-describedby="search-hint"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={styles.notesSearchClear}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <span id="search-hint" className="sr-only">Press Escape to close search</span>
        </div>
      )}
    </div>
  );
};
