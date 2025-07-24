import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import { logger } from '../lib/logger';

interface AutocompleteOptions {
  componentRestrictions?: google.maps.places.ComponentRestrictions;
  fields?: string[];
  types?: string[];
  locationBias?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
  locationRestriction?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
}

interface PlaceSuggestion {
  placePrediction: any; // google.maps.places.PlacePrediction - types not yet available
  suggestion: {
    mainText: string;
    secondaryText: string;
    placeId: string;
  };
}

interface UseGooglePlacesAutocompleteReturn {
  suggestions: PlaceSuggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
  selectPlace: (suggestion: PlaceSuggestion) => Promise<google.maps.places.PlaceResult>;
}

export function useGooglePlacesAutocomplete(
  inputRef: RefObject<HTMLInputElement>,
  options: AutocompleteOptions = {},
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
): UseGooglePlacesAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session token
  useEffect(() => {
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Import the places library if not already loaded
      const placesLib = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      
      // Create request object
      // @ts-ignore - TypeScript types may not be updated yet
      const request = {
        input,
        sessionToken: sessionTokenRef.current!,
        ...(options.componentRestrictions && { componentRestrictions: options.componentRestrictions }),
        ...(options.locationBias && { locationBias: options.locationBias }),
        ...(options.locationRestriction && { locationRestriction: options.locationRestriction }),
      };

      // Fetch suggestions using the new API
      // @ts-ignore - TypeScript types may not be updated yet
      const { suggestions: autocompleteSuggestions } = 
        await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      // Transform suggestions to our format
      const formattedSuggestions: PlaceSuggestion[] = autocompleteSuggestions.map((suggestion: any) => ({
        placePrediction: suggestion.placePrediction,
        suggestion: {
          mainText: suggestion.placePrediction.mainText?.text || '',
          secondaryText: suggestion.placePrediction.secondaryText?.text || '',
          placeId: suggestion.placePrediction.placeId || '',
        },
      }));

      setSuggestions(formattedSuggestions);
    } catch (error) {
      logger.error('Failed to fetch autocomplete suggestions', error as Error, {
        component: 'useGooglePlacesAutocomplete',
        action: 'fetchSuggestions',
        metadata: { input },
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  // Handle input changes with debouncing
  useEffect(() => {
    if (!inputRef.current) return;

    const handleInput = (event: Event) => {
      const input = (event.target as HTMLInputElement).value;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(input);
      }, 300); // 300ms debounce
    };

    const inputElement = inputRef.current;
    inputElement.addEventListener('input', handleInput);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      inputElement.removeEventListener('input', handleInput);
    };
  }, [inputRef, fetchSuggestions]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const selectPlace = useCallback(async (suggestion: PlaceSuggestion): Promise<google.maps.places.PlaceResult> => {
    try {
      // Convert prediction to place
      // @ts-ignore - TypeScript types may not be updated yet
      const place = suggestion.placePrediction.toPlace();
      
      // Fetch place details
      await place.fetchFields({
        fields: options.fields || ['place_id', 'geometry', 'name', 'formatted_address'],
      });

      // Convert to PlaceResult format for compatibility
      const placeResult: google.maps.places.PlaceResult = {
        place_id: place.placeId || undefined,
        geometry: place.location ? {
          location: place.location,
          viewport: place.viewport,
        } : undefined,
        name: place.displayName || undefined,
        formatted_address: place.formattedAddress || undefined,
      };

      // Clear suggestions after selection
      clearSuggestions();

      // Create new session token for next search
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

      // Call the callback if provided
      if (onPlaceSelect) {
        onPlaceSelect(placeResult);
      }

      return placeResult;
    } catch (error) {
      logger.error('Failed to select place', error as Error, {
        component: 'useGooglePlacesAutocomplete',
        action: 'selectPlace',
      });
      throw error;
    }
  }, [options.fields, clearSuggestions, onPlaceSelect]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
    selectPlace,
  };
}