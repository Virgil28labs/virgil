/**
 * TimezoneSearch Component
 *
 * Provides search and autocomplete functionality for timezone selection.
 * Features city-first search with keyboard navigation and accessibility support.
 */

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  searchTimezones,
  getPopularTimezones,
  TimezoneInfo,
} from "./timezoneData";

interface TimezoneSearchProps {
  onSelect: (timezone: string) => void;
  excludeTimezones?: string[];
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

const TimezoneSearch = memo(function TimezoneSearch({
  onSelect,
  excludeTimezones = [],
  className = "",
  placeholder = "Search cities or countries...",
  autoFocus = false,
}: TimezoneSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Search results with popular timezones when empty query
  const searchResults = useMemo(() => {
    const results = query.trim()
      ? searchTimezones(query, 8)
      : getPopularTimezones().slice(0, 8);

    // Filter out already selected timezones
    return results.filter((tz) => !excludeTimezones.includes(tz.timezone));
  }, [query, excludeTimezones]);

  // Auto-focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setQuery(value);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    },
    [],
  );

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  // Handle input blur with delay to allow for suggestion clicks
  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  // Handle timezone selection
  const handleTimezoneSelect = useCallback(
    (timezone: TimezoneInfo) => {
      onSelect(timezone.timezone);
      setQuery("");
      setShowSuggestions(false);
      setSelectedIndex(-1);
    },
    [onSelect],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || searchResults.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev < searchResults.length - 1 ? prev + 1 : 0;
            // Scroll to selected item
            setTimeout(() => {
              suggestionRefs.current[next]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }, 0);
            return next;
          });
          break;

        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : searchResults.length - 1;
            // Scroll to selected item
            setTimeout(() => {
              suggestionRefs.current[next]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }, 0);
            return next;
          });
          break;

        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleTimezoneSelect(searchResults[selectedIndex]);
          }
          break;

        case "Escape":
          event.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;

        case "Tab":
          // Allow tab to close suggestions
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, searchResults, selectedIndex, handleTimezoneSelect],
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    setQuery("");
    setShowSuggestions(true);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={`timezone-search ${className}`}>
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          aria-label="Search for timezone by city or country"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && searchResults.length > 0}
          aria-activedescendant={
            selectedIndex >= 0
              ? `timezone-suggestion-${selectedIndex}`
              : undefined
          }
          role="combobox"
        />

        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="clear-search"
            aria-label="Clear search"
            tabIndex={-1}
          >
            ✕
          </button>
        )}

        <div className="search-icon" aria-hidden="true">
          🔍
        </div>
      </div>

      {showSuggestions && (
        <ul
          className="suggestions-list"
          role="listbox"
          aria-label="Timezone suggestions"
        >
          {searchResults.length === 0 ? (
            <li className="no-results" role="option" aria-selected={false}>
              No timezones found
            </li>
          ) : (
            searchResults.map((timezone, index) => (
              <li
                key={timezone.timezone}
                ref={(el) => {
                  suggestionRefs.current[index] = el;
                }}
                id={`timezone-suggestion-${index}`}
                className={`suggestion-item ${index === selectedIndex ? "selected" : ""}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleTimezoneSelect(timezone)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="suggestion-main">
                  <span className="suggestion-city">{timezone.city}</span>
                  <span className="suggestion-country">{timezone.country}</span>
                </div>
                <div className="suggestion-meta">
                  {timezone.region && (
                    <span className="suggestion-region">{timezone.region}</span>
                  )}
                  {timezone.popular && (
                    <span className="suggestion-badge">Popular</span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
});

export { TimezoneSearch };
