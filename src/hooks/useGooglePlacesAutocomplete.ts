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

// Extended Google Maps interfaces for newer API features
interface ExtendedPlacePrediction {
  placeId?: string;
  mainText?: { text: string };
  secondaryText?: { text: string };
  toPlace?: () => ExtendedPlace;
}

interface ExtendedPlace {
  placeId?: string;
  location?: google.maps.LatLng;
  viewport?: google.maps.LatLngBounds;
  displayName?: string;
  name?: string;
  formattedAddress?: string;
  formatted_address?: string;
  fetchFields?: (options: { fields: string[] }) => Promise<void>;
}

interface PlaceSuggestion {
  placePrediction: google.maps.places.AutocompletePrediction | ExtendedPlacePrediction;
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
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void,
): UseGooglePlacesAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchSuggestionsRef = useRef<((input: string) => Promise<void>) | undefined>(undefined);

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
      await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      
      let formattedSuggestions: PlaceSuggestion[] = [];
      
      // Try new API first
      if ((google.maps.places as unknown as { AutocompleteSuggestion?: unknown }).AutocompleteSuggestion) {
        
        try {
          // Create request object
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          
          const request = {
            input,
            sessionToken: sessionTokenRef.current,
            ...(options.componentRestrictions && { componentRestrictions: options.componentRestrictions }),
            ...(options.locationBias && { locationBias: options.locationBias }),
            ...(options.locationRestriction && { locationRestriction: options.locationRestriction }),
          };
          
          // Fetch suggestions using the new API
          // @ts-ignore - TypeScript types may not be updated yet
          const { suggestions: autocompleteSuggestions } = 
            await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

          // Transform suggestions to our format
          formattedSuggestions = autocompleteSuggestions.map((suggestion: { placePrediction: ExtendedPlacePrediction }) => ({
            placePrediction: suggestion.placePrediction,
            suggestion: {
              mainText: suggestion.placePrediction.mainText?.text || '',
              secondaryText: suggestion.placePrediction.secondaryText?.text || '',
              placeId: suggestion.placePrediction.placeId || '',
            },
          }));
        } catch (_apiError) {
          // New API failed, will use fallback
          // Let it fall through to the fallback method
        }
      } else {
        // Fallback to classic AutocompleteService
        
        const service = new google.maps.places.AutocompleteService();
        
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
        
        const request: google.maps.places.AutocompletionRequest = {
          input,
          sessionToken: sessionTokenRef.current,
          ...(options.componentRestrictions && { componentRestrictions: options.componentRestrictions }),
          ...(options.types && { types: options.types }),
        };
        
        // Use promise wrapper for callback-based API
        const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
          service.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          });
        });
        
        
        // Transform predictions to our format
        formattedSuggestions = predictions.map(prediction => ({
          placePrediction: prediction,
          suggestion: {
            mainText: prediction.structured_formatting?.main_text || prediction.description || '',
            secondaryText: prediction.structured_formatting?.secondary_text || '',
            placeId: prediction.place_id || '',
          },
        }));
      }

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

  // Store the fetchSuggestions function in ref to avoid circular dependencies
  useEffect(() => {
    fetchSuggestionsRef.current = fetchSuggestions;
  }, [fetchSuggestions]);

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
        // Use the ref version to avoid circular dependency
        if (fetchSuggestionsRef.current) {
          fetchSuggestionsRef.current(input);
        }
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
  }, [inputRef]); // Remove fetchSuggestions from dependencies

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const selectPlace = useCallback(async (suggestion: PlaceSuggestion): Promise<google.maps.places.PlaceResult> => {
    try {
      let placeResult: google.maps.places.PlaceResult | undefined;
      
      // Try new API first if available
      if (suggestion.placePrediction && typeof suggestion.placePrediction.toPlace === 'function') {
        try {
          // Convert prediction to place
          // @ts-ignore - TypeScript types may not be updated yet
          const place = suggestion.placePrediction.toPlace();
          
          // Fetch place details with correct field names for new API
          await place.fetchFields({
            fields: options.fields || ['placeId', 'location', 'displayName', 'formattedAddress'],
          });

          // Debug: Log the actual place object structure if needed

          // Convert to PlaceResult format for compatibility with better error handling
          placeResult = {
            place_id: place.placeId || undefined,
            geometry: place.location ? {
              location: place.location,  
              viewport: place.viewport || undefined,
            } : undefined,
            name: place.displayName || place.name || undefined,
            formatted_address: place.formattedAddress || place.formatted_address || undefined,
          };

        } catch (newApiError) {
          console.warn('New API failed, falling back to classic API:', newApiError);
          // Fall through to classic API
        }
      }
      
      // Use classic API if new API failed or isn't available
      if (!placeResult) {
        // Classic API - use PlacesService to get details
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        
        placeResult = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
          service.getDetails(
            {
              placeId: suggestion.suggestion.placeId,
              fields: options.fields || ['place_id', 'geometry', 'name', 'formatted_address'],
            },
            (place, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                resolve(place);
              } else {
                reject(new Error(`Failed to get place details: ${status}`));
              }
            },
          );
        });
      }

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