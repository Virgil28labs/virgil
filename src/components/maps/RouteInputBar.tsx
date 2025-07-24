import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SavedPlace } from '../../types/maps.types';
import './RouteInputBar.css';
import { logger } from '../../lib/logger';
import { useGooglePlacesAutocomplete } from '../../hooks/useGooglePlacesAutocomplete';

interface RouteInputBarProps {
  currentLocation: google.maps.LatLngLiteral | null
  currentAddress?: string
  onRouteRequest: (origin: string, destination: string) => void
  onOriginSelect?: (place: google.maps.places.PlaceResult) => void
  onDestinationSelect?: (place: google.maps.places.PlaceResult) => void
  savedPlaces?: SavedPlace[]
  currentDestinationPlace?: google.maps.places.PlaceResult | null
  onSavePlace?: (place: google.maps.places.PlaceResult, isHome?: boolean) => void
  onRemoveSavedPlace?: (placeId?: string) => void
  hasRoute?: boolean
  onClearRoute?: () => void
}

export const RouteInputBar: React.FC<RouteInputBarProps> = ({
  currentLocation,
  currentAddress,
  onRouteRequest,
  onOriginSelect,
  onDestinationSelect,
  savedPlaces = [],
  currentDestinationPlace,
  onSavePlace,
  onRemoveSavedPlace,
  hasRoute = false,
  onClearRoute,
}) => {
  // Load last destination from localStorage
  const getLastDestination = () => {
    try {
      return localStorage.getItem('virgil_last_destination') || '';
    } catch {
      return '';
    }
  };
  
  const [origin, setOrigin] = useState(currentAddress || 'Current Location');
  const [destination, setDestination] = useState(getLastDestination());
  const [isOriginCurrentLocation, setIsOriginCurrentLocation] = useState(true);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  // Origin autocomplete hook
  const {
    suggestions: originSuggestions,
    isLoading: originLoading,
    clearSuggestions: clearOriginSuggestions,
    selectPlace: selectOriginPlace,
  } = useGooglePlacesAutocomplete(
    originInputRef,
    {
      types: ['geocode', 'establishment'],
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
    },
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
    }
  );

  // Destination autocomplete hook
  const {
    suggestions: destinationSuggestions,
    isLoading: destinationLoading,
    clearSuggestions: clearDestinationSuggestions,
    selectPlace: selectDestinationPlace,
  } = useGooglePlacesAutocomplete(
    destinationInputRef,
    {
      types: ['geocode', 'establishment'],
      fields: ['place_id', 'geometry', 'name', 'formatted_address'],
    },
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
    }
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
    setActiveInput('origin');
    setShowOriginSuggestions(true);
  }, [isOriginCurrentLocation]);

  const handleOriginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigin(e.target.value);
    setIsOriginCurrentLocation(false);
    setShowOriginSuggestions(true);
  }, []);

  const handleDestinationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDestination(e.target.value);
    // Hide saved places dropdown when typing
    if (e.target.value) {
      setShowSavedPlaces(false);
    }
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

  // Check if current destination is saved
  const isDestinationSaved = useCallback(() => {
    if (!currentDestinationPlace?.place_id) return false;
    return savedPlaces.some(p => p.placeId === currentDestinationPlace.place_id);
  }, [currentDestinationPlace, savedPlaces]);

  // Handle save/unsave destination
  const handleToggleSaveDestination = useCallback(() => {
    if (!currentDestinationPlace || !onSavePlace || !onRemoveSavedPlace) return;
    
    if (isDestinationSaved()) {
      onRemoveSavedPlace(currentDestinationPlace.place_id);
    } else {
      onSavePlace(currentDestinationPlace);
    }
  }, [currentDestinationPlace, isDestinationSaved, onSavePlace, onRemoveSavedPlace]);

  // Handle saved place selection
  const handleSelectSavedPlace = useCallback((place: SavedPlace) => {
    setDestination(place.name);
    setShowSavedPlaces(false);
    
    // Save to localStorage
    try {
      localStorage.setItem('virgil_last_destination', place.name);
    } catch (error) {
      // localStorage might be full or disabled
      logger.warn('Failed to save destination to localStorage', {
        component: 'RouteInputBar',
        action: 'saveDestination',
        metadata: { error },
      });
    }
    
    // Create a PlaceResult-like object for routing
    if (place.placeId) {
      // Use place ID for routing
      onRouteRequest(origin, place.name);
    } else {
      // Fallback to address
      onRouteRequest(origin, place.address || place.name);
    }
  }, [origin, onRouteRequest]);

  // Show/hide saved places dropdown
  const handleDestinationClick = useCallback(() => {
    if (!destination && savedPlaces.length > 0) {
      setShowSavedPlaces(true);
    }
    setActiveInput('destination');
  }, [destination, savedPlaces]);

  const handleDestinationBlur = useCallback(() => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      setShowSavedPlaces(false);
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
  const handleOriginSuggestionSelect = useCallback(async (suggestion: any) => {
    await selectOriginPlace(suggestion);
  }, [selectOriginPlace]);

  const handleDestinationSuggestionSelect = useCallback(async (suggestion: any) => {
    await selectDestinationPlace(suggestion);
  }, [selectDestinationPlace]);

  return (
    <div className="route-input-bar">
      <div className="route-inputs">
        <div className="route-input-group">
          <div className="input-icon">
            <div className="location-dot origin" />
          </div>
          <input
            ref={originInputRef}
            type="text"
            value={origin}
            onChange={handleOriginChange}
            onFocus={handleOriginFocus}
            onBlur={handleOriginBlur}
            placeholder="From"
            className={`route-input ${isOriginCurrentLocation ? 'current-location' : ''}`}
          />
          {!isOriginCurrentLocation && currentLocation && (
            <button
              className="current-location-btn"
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
            <div className="autocomplete-dropdown">
              {originSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="autocomplete-item"
                  onClick={() => handleOriginSuggestionSelect(suggestion)}
                  type="button"
                >
                  <div className="autocomplete-main">{suggestion.suggestion.mainText}</div>
                  <div className="autocomplete-secondary">{suggestion.suggestion.secondaryText}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="swap-locations-btn"
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

        <div className="route-input-group">
          <div className="input-icon">
            <div className="location-dot destination" />
          </div>
          <input
            ref={destinationInputRef}
            type="text"
            value={destination}
            onChange={handleDestinationChange}
            onClick={handleDestinationClick}
            onBlur={handleDestinationBlur}
            placeholder="To"
            className="route-input"
          />
          {destination && currentDestinationPlace && (
            <button
              className={`save-destination-btn ${isDestinationSaved() ? 'saved' : ''}`}
              onClick={handleToggleSaveDestination}
              title={isDestinationSaved() ? 'Remove from saved places' : 'Save this place'}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5l2.14 4.33 4.86.71-3.5 3.41.82 4.82L8 12.5l-4.32 2.27.82-4.82-3.5-3.41 4.86-.71L8 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill={isDestinationSaved() ? 'currentColor' : 'none'}
                />
              </svg>
            </button>
          )}
          {hasRoute && onClearRoute && (
            <button
              className="clear-route-btn"
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
          {showDestinationSuggestions && destinationSuggestions.length > 0 && !showSavedPlaces && (
            <div className="autocomplete-dropdown">
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="autocomplete-item"
                  onClick={() => handleDestinationSuggestionSelect(suggestion)}
                  type="button"
                >
                  <div className="autocomplete-main">{suggestion.suggestion.mainText}</div>
                  <div className="autocomplete-secondary">{suggestion.suggestion.secondaryText}</div>
                </button>
              ))}
            </div>
          )}
          
          {/* Saved places dropdown */}
          {showSavedPlaces && savedPlaces.length > 0 && (
            <div className="saved-places-dropdown">
              {savedPlaces.map(place => (
                <button
                  key={place.id}
                  className="saved-place-item"
                  onClick={() => handleSelectSavedPlace(place)}
                  type="button"
                >
                  <div className="place-icon">
                    {place.isHome ? '🏠' : '📍'}
                  </div>
                  <div className="place-info">
                    <div className="place-name">{place.name}</div>
                    {place.address && (
                      <div className="place-address">{place.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual connection line */}
      <div className="route-connection-line" />
    </div>
  );
};