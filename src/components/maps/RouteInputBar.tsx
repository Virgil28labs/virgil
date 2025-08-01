import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import styles from './Maps.module.css';
import { logger } from '../../lib/logger';
import { useGooglePlacesAutocomplete, type PlaceSuggestion } from '../../hooks/useGooglePlacesAutocomplete';

interface RouteInputBarProps {
  currentLocation: google.maps.LatLngLiteral | null
  currentAddress?: string
  onRouteRequest: (origin: string, destination: string) => void
  onOriginSelect?: (place: google.maps.places.PlaceResult) => void
  onDestinationSelect?: (place: google.maps.places.PlaceResult) => void
  currentDestinationPlace?: google.maps.places.PlaceResult | null
  hasRoute?: boolean
  onClearRoute?: () => void
}

export const RouteInputBar = memo(function RouteInputBar({
  currentLocation,
  currentAddress,
  onRouteRequest,
  onOriginSelect,
  onDestinationSelect,
  hasRoute = false,
  onClearRoute,
}: RouteInputBarProps) {
  // Memoize last destination to avoid localStorage calls on every render
  const initialDestination = useMemo(() => {
    try {
      return localStorage.getItem('virgil_last_destination') || '';
    } catch {
      return '';
    }
  }, []);

  const [origin, setOrigin] = useState(currentAddress || 'Current Location');
  const [destination, setDestination] = useState(initialDestination);
  const [isOriginCurrentLocation, setIsOriginCurrentLocation] = useState(true);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  // Memoized autocomplete options to prevent re-creation
  const autocompleteOptions = useMemo(() => ({
    types: ['geocode', 'establishment'],
    fields: ['place_id', 'geometry', 'name', 'formatted_address'],
  }), []);

  // Origin autocomplete hook
  const {
    suggestions: originSuggestions,
    selectPlace: selectOriginPlace,
  } = useGooglePlacesAutocomplete(
    originInputRef,
    autocompleteOptions,
    (place) => {
      if (place && place.geometry) {
        setOrigin(place.name || place.formatted_address || '');
        setIsOriginCurrentLocation(false);
        setShowOriginSuggestions(false);
        if (onOriginSelect) {
          onOriginSelect(place);
        }
        // Auto-trigger route if destination is set
        if (destination) {
          onRouteRequest(place.name || place.formatted_address || '', destination);
        }
      }
    },
  );

  // Destination autocomplete hook
  const {
    suggestions: destinationSuggestions,
    selectPlace: selectDestinationPlace,
  } = useGooglePlacesAutocomplete(
    destinationInputRef,
    autocompleteOptions,
    (place) => {
      if (place && place.geometry) {
        const destinationText = place.name || place.formatted_address || '';
        setDestination(destinationText);
        setShowDestinationSuggestions(false);
        // Save to localStorage
        try {
          localStorage.setItem('virgil_last_destination', destinationText);
        } catch (error) {
          // localStorage might be full or disabled
          logger.warn('Failed to save destination to localStorage', {
            component: 'RouteInputBar',
            action: 'saveDestination',
            metadata: { error },
          });
        }

        if (onDestinationSelect) {
          onDestinationSelect(place);
        }
        // Auto-trigger route
        onRouteRequest(origin, destinationText);
      }
    },
  );

  // Update origin when current address changes
  useEffect(() => {
    if (isOriginCurrentLocation && currentAddress) {
      setOrigin(currentAddress);
    }
  }, [currentAddress, isOriginCurrentLocation]);

  const handleOriginFocus = useCallback(() => {
    if (isOriginCurrentLocation) {
      setOrigin('');
      setIsOriginCurrentLocation(false);
    }
    setShowOriginSuggestions(true);
  }, [isOriginCurrentLocation]);

  const handleOriginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigin(e.target.value);
    setIsOriginCurrentLocation(false);
    setShowOriginSuggestions(true);
  }, []);

  const handleDestinationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDestination(e.target.value);
    setShowDestinationSuggestions(true);
  }, []);

  const handleSwapLocations = useCallback(() => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setIsOriginCurrentLocation(false);

    if (origin && destination) {
      onRouteRequest(destination, origin);
    }
  }, [origin, destination, onRouteRequest]);

  const handleUseCurrentLocation = useCallback(() => {
    setOrigin(currentAddress || 'Current Location');
    setIsOriginCurrentLocation(true);

    if (destination) {
      onRouteRequest(currentAddress || 'Current Location', destination);
    }
  }, [currentAddress, destination, onRouteRequest]);

  const handleDestinationClick = useCallback(() => {
  }, []);

  const handleDestinationBlur = useCallback(() => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setShowDestinationSuggestions(false);
    }, 200);
  }, []);

  const handleOriginBlur = useCallback(() => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setShowOriginSuggestions(false);
    }, 200);
  }, []);

  // Handle suggestion selection
  const handleOriginSuggestionSelect = useCallback(async (suggestion: PlaceSuggestion) => {
    await selectOriginPlace(suggestion);
  }, [selectOriginPlace]);

  const handleDestinationSuggestionSelect = useCallback(async (suggestion: PlaceSuggestion) => {
    await selectDestinationPlace(suggestion);
  }, [selectDestinationPlace]);

  return (
    <div className={styles.routeInputBar}>
      <div className={styles.routeInputs}>
        <div className={styles.routeInputGroup}>
          <div className={styles.inputIcon}>
            <div className={`${styles.locationDot} ${styles.origin}`} />
          </div>
          <input
            ref={originInputRef}
            type="text"
            value={origin}
            onChange={handleOriginChange}
            onFocus={handleOriginFocus}
            onBlur={handleOriginBlur}
            placeholder="From"
            className={`${styles.routeInput} ${isOriginCurrentLocation ? styles.currentLocation : ''}`}
          />
          {!isOriginCurrentLocation && currentLocation && (
            <button
              className={styles.currentLocationBtn}
              onClick={handleUseCurrentLocation}
              title="Use current location"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
                <circle cx="8" cy="8" r="3" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* Origin autocomplete suggestions */}
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className={styles.autocompleteDropdown}>
              {originSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className={styles.autocompleteItem}
                  onClick={() => handleOriginSuggestionSelect(suggestion)}
                  type="button"
                >
                  <div className={styles.autocompleteMain}>{suggestion.suggestion.mainText}</div>
                  <div className={styles.autocompleteSecondary}>{suggestion.suggestion.secondaryText}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={styles.swapLocationsBtn}
          onClick={handleSwapLocations}
          disabled={!origin || !destination}
          title="Swap locations"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 6L6 3M6 3L9 6M6 3V13M13 10L10 13M10 13L7 10M10 13V3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={styles.routeInputGroup}>
          <div className={styles.inputIcon}>
            <div className={`${styles.locationDot} ${styles.destination}`} />
          </div>
          <input
            ref={destinationInputRef}
            type="text"
            value={destination}
            onChange={handleDestinationChange}
            onClick={handleDestinationClick}
            onBlur={handleDestinationBlur}
            placeholder="To"
            className={styles.routeInput}
          />
          {hasRoute && onClearRoute && (
            <button
              className={styles.clearRouteBtn}
              onClick={onClearRoute}
              title="Clear route"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M4 12L12 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          {/* Destination autocomplete suggestions */}
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className={styles.autocompleteDropdown}>
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className={styles.autocompleteItem}
                  onClick={() => handleDestinationSuggestionSelect(suggestion)}
                  type="button"
                >
                  <div className={styles.autocompleteMain}>{suggestion.suggestion.mainText}</div>
                  <div className={styles.autocompleteSecondary}>{suggestion.suggestion.secondaryText}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual connection line */}
      <div className={styles.routeConnectionLine} />
    </div>
  );
});
