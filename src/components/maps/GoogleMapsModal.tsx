import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { 
  loadGoogleMaps, 
  createLocationMarker, 
  getGoogleMapsApiKey, 
} from '../../utils/googleMaps';
import type { 
  GoogleMapsModalProps,
  SavedPlace,
} from '../../types/maps.types';
import { 
  VIRGIL_MAP_STYLES,
} from '../../types/maps.types';
import { RouteInputBar } from './RouteInputBar';
import { RouteInfoBar } from './RouteInfoBar';
import { TrafficIndicator } from './TrafficIndicator';
import './GoogleMapsModal.css';
import { logger } from '../../lib/logger';

export const GoogleMapsModal: React.FC<GoogleMapsModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  address,
}) => {
  // DOM refs
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Map instance refs
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const alternativeRenderersRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  
  // Route state
  const [currentRoute, setCurrentRoute] = useState<google.maps.DirectionsRoute | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<google.maps.DirectionsRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  
  // Saved places state
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [currentDestinationPlace, setCurrentDestinationPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // Traffic state
  const [showTraffic, setShowTraffic] = useState(true);
  const [hasActiveRoute, setHasActiveRoute] = useState(false);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [routeInfoVisible, setRouteInfoVisible] = useState(true);
  const [departureTime, setDepartureTime] = useState<Date | 'now'>('now');

  // Cleanup function
  const cleanupMaps = useCallback(() => {
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setMap(null);
      markerInstanceRef.current = null;
    }
    
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    
    // Clean up alternative renderers
    alternativeRenderersRef.current.forEach(renderer => {
      renderer.setMap(null);
    });
    alternativeRenderersRef.current = [];
    
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    
    if (mapInstanceRef.current) {
      google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      mapInstanceRef.current = null;
    }
    
    directionsServiceRef.current = null;
    geocoderRef.current = null;
    
    // Clear auto-collapse timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, []);

  // Get address for current location
  const geocodeLocation = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    if (!geocoderRef.current) return '';
    
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(status));
          }
        });
      });
      
      return result[0]?.formatted_address || '';
    } catch (error) {
      logger.error('Geocoding error', error as Error, {
        component: 'GoogleMapsModal',
        action: 'geocodeLocation',
        metadata: { location },
      });
      return '';
    }
  }, []);

  // Handle route request
  const handleRouteRequest = useCallback(async (origin: string, destination: string, customDepartureTime?: Date | 'now') => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;
    
    // Use custom departure time if provided, otherwise use state
    const depTime = customDepartureTime !== undefined ? customDepartureTime : departureTime;
    
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true,
      drivingOptions: {
        departureTime: depTime === 'now' ? new Date() : depTime,
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      },
    };
    
    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(status));
          }
        });
      });
      
      if (result.routes.length > 0) {
        setCurrentRoute(result.routes[0]);
        setAlternativeRoutes(result.routes.slice(1));
        setSelectedRouteIndex(0);
        setHasActiveRoute(true);
        setShowRouteOptions(true);
        setRouteInfoVisible(true);
        
        // Clear previous alternative renderers
        alternativeRenderersRef.current.forEach(renderer => {
          renderer.setMap(null);
        });
        alternativeRenderersRef.current = [];
        
        // Display main route
        directionsRendererRef.current.setDirections(result);
        directionsRendererRef.current.setRouteIndex(0);
        directionsRendererRef.current.setOptions({
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 6,
            zIndex: 1000,
          },
        });
        
        // Display alternative routes with different styling
        result.routes.slice(1).forEach((_route, index) => {
          const renderer = new google.maps.DirectionsRenderer({
            map: mapInstanceRef.current,
            directions: result,
            routeIndex: index + 1,
            suppressMarkers: true,
            suppressInfoWindows: true,
            preserveViewport: true,
            hideRouteList: true,
            polylineOptions: {
              strokeColor: '#808080',
              strokeOpacity: 0.6,
              strokeWeight: 5,
              zIndex: 100,
            },
          });
          alternativeRenderersRef.current.push(renderer);
        });
        
        // Fit map to route bounds
        const bounds = result.routes[0].bounds;
        if (bounds && mapInstanceRef.current) {
          mapInstanceRef.current.fitBounds(bounds, {
            top: 100,
            right: 50,
            bottom: 150,
            left: 50,
          });
        }
      }
    } catch (error) {
      logger.error('Directions error', error as Error, {
        component: 'GoogleMapsModal',
        action: 'calculateRoute',
        metadata: { origin, destination },
      });
      setError('Unable to calculate route. Please try again.');
    }
  }, [departureTime]);

  // Handle route selection
  const handleRouteSelect = useCallback((index: number) => {
    if (!directionsRendererRef.current || !currentRoute) return;
    
    setSelectedRouteIndex(index);
    
    // Clear any existing timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
    }
    
    // Auto-collapse after 800ms
    autoCollapseTimerRef.current = setTimeout(() => {
      setShowRouteOptions(false);
    }, 800);
    
    // Update main route to show selected route
    directionsRendererRef.current.setRouteIndex(index);
    directionsRendererRef.current.setOptions({
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeOpacity: 0.8,
        strokeWeight: 6,
        zIndex: 1000,
      },
    });
    
    // Update alternative routes styling
    alternativeRenderersRef.current.forEach((renderer, i) => {
      const routeIndex = i + 1;
      if (routeIndex === index) {
        // This is now the selected route, hide it as it's shown by main renderer
        renderer.setMap(null);
      } else {
        // Show as alternative
        renderer.setMap(mapInstanceRef.current);
        renderer.setOptions({
          polylineOptions: {
            strokeColor: '#808080',
            strokeOpacity: 0.6,
            strokeWeight: 5,
            zIndex: 100,
          },
        });
      }
    });
    
    // If selecting an alternative route, we need to update the display
    if (index > 0) {
      // Show the previously selected route as an alternative
      const prevRenderer = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        directions: directionsRendererRef.current.getDirections(),
        routeIndex: 0,
        suppressMarkers: true,
        suppressInfoWindows: true,
        preserveViewport: true,
        hideRouteList: true,
        polylineOptions: {
          strokeColor: '#808080',
          strokeOpacity: 0.6,
          strokeWeight: 5,
          zIndex: 100,
        },
      });
      // Store it temporarily
      alternativeRenderersRef.current[index - 1] = prevRenderer;
    }
    
    // Get all routes and select the correct one
    const allRoutes = [currentRoute, ...alternativeRoutes];
    if (index < allRoutes.length) {
      const selectedRoute = allRoutes[index];
      
      // Fit map to the selected route bounds with smooth animation
      const bounds = selectedRoute.bounds;
      if (bounds && mapInstanceRef.current) {
        const padding = {
          top: 100, 
          right: 50, 
          bottom: 150, 
          left: 50,
        };
        mapInstanceRef.current.panToBounds(bounds, padding);
        
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(bounds, padding);
          }
        }, 300);
      }
    }
  }, [currentRoute, alternativeRoutes]);

  // Handle clear route
  const handleClearRoute = useCallback(() => {
    // Clear route displays
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current.setMap(mapInstanceRef.current);
      directionsRendererRef.current.setDirections({ routes: [] } as any);
    }
    
    // Clear alternative renderers
    alternativeRenderersRef.current.forEach(renderer => {
      renderer.setMap(null);
    });
    alternativeRenderersRef.current = [];
    
    // Clear state
    setCurrentRoute(null);
    setAlternativeRoutes([]);
    setSelectedRouteIndex(0);
    setHasActiveRoute(false);
    setShowRouteOptions(false);
    setRouteInfoVisible(true);
    
    // Clear any auto-collapse timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
    
    // Reset map view to current location
    if (mapInstanceRef.current && coordinates) {
      mapInstanceRef.current.setCenter({
        lat: coordinates.latitude,
        lng: coordinates.longitude,
      });
      mapInstanceRef.current.setZoom(14);
    }
  }, [coordinates]);

  // Handle toggle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setShowRouteOptions(prev => !prev);
    
    // Clear auto-collapse timer if user manually toggles
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, []);

  // Handle close route info
  const handleCloseRouteInfo = useCallback(() => {
    setRouteInfoVisible(false);
    
    // Clear auto-collapse timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, []);

  // Handle traffic toggle
  const handleToggleTraffic = useCallback(() => {
    setShowTraffic(prev => {
      const newState = !prev;
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(newState ? mapInstanceRef.current : null);
      }
      return newState;
    });
  }, []);

  // Handle departure time change
  const handleDepartureTimeChange = useCallback((newTime: Date | 'now') => {
    setDepartureTime(newTime);
    
    // If we have a route, recalculate with new departure time
    if (hasActiveRoute && currentDestinationPlace) {
      const origin = currentAddress || 'Current Location';
      const destination = currentDestinationPlace.formatted_address || currentDestinationPlace.name || '';
      handleRouteRequest(origin, destination, newTime);
    }
  }, [hasActiveRoute, currentDestinationPlace, currentAddress, handleRouteRequest]);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapRef.current || !coordinates) return;
    
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setError('Google Maps API key is not configured');
      setIsLoading(false);
      return;
    }
    
    let mounted = true;
    
    const initializeMap = async () => {
      try {
        // Load Google Maps if not already loaded
        if (!window.google?.maps) {
          await loadGoogleMaps({ apiKey });
        }
        
        if (!mounted || !mapRef.current) return;
        
        // Create map instance
        const map = new google.maps.Map(mapRef.current, {
          center: {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          },
          zoom: 14,
          styles: VIRGIL_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          rotateControl: false,
          scaleControl: false,
          clickableIcons: false,
        });
        
        mapInstanceRef.current = map;
        
        // Initialize services
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          suppressInfoWindows: true,
          preserveViewport: true,
          hideRouteList: true, // Hide the default route list
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 6,
          },
        });
        geocoderRef.current = new google.maps.Geocoder();
        
        // Add traffic layer (ON by default)
        trafficLayerRef.current = new google.maps.TrafficLayer();
        trafficLayerRef.current.setMap(map);
        
        // Add current location marker
        markerInstanceRef.current = createLocationMarker({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        }, map);
        
        // Get address for current location
        const addr = await geocodeLocation({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        });
        setCurrentAddress(addr);
        
        setMapsLoaded(true);
        setIsLoading(false);
        setError(null);
        
      } catch (err) {
        logger.error('Error initializing map', err as Error, {
          component: 'GoogleMapsModal',
          action: 'initializeMap',
        });
        if (mounted) {
          setError('Failed to load Google Maps. Please try again.');
          setIsLoading(false);
        }
      }
    };
    
    initializeMap();
    
    return () => {
      mounted = false;
      cleanupMaps();
    };
  }, [isOpen, coordinates, cleanupMaps, geocodeLocation]);

  // Load saved places from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('virgil_saved_places');
    if (stored) {
      try {
        const places = JSON.parse(stored) as SavedPlace[];
        setSavedPlaces(places);
      } catch (error) {
        logger.error('Error loading saved places', error as Error, {
          component: 'GoogleMapsModal',
          action: 'loadSavedPlaces',
        });
      }
    }
  }, []);

  // Save place handler
  const handleSavePlace = useCallback((place: google.maps.places.PlaceResult, isHome?: boolean) => {
    if (!place.name && !place.formatted_address) return;
    
    const newPlace: SavedPlace = {
      id: Date.now().toString(),
      name: place.name || place.formatted_address || 'Saved Place',
      address: place.formatted_address || '',
      placeId: place.place_id,
      isHome,
      timestamp: Date.now(),
    };
    
    setSavedPlaces(prev => {
      // Remove existing home if setting new home
      let updated = isHome ? prev.filter(p => !p.isHome) : prev;
      
      // Check if place already exists
      const existingIndex = updated.findIndex(p => p.placeId === place.place_id);
      if (existingIndex >= 0) {
        updated = updated.filter((_, i) => i !== existingIndex);
      }
      
      // Add new place
      updated = [newPlace, ...updated];
      
      // Limit to 10 saved places (excluding home)
      const nonHomePlaces = updated.filter(p => !p.isHome);
      const homePlaces = updated.filter(p => p.isHome);
      if (nonHomePlaces.length > 10) {
        updated = [...homePlaces, ...nonHomePlaces.slice(0, 10)];
      }
      
      // Save to localStorage
      localStorage.setItem('virgil_saved_places', JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  // Remove saved place handler
  const handleRemoveSavedPlace = useCallback((placeId?: string) => {
    if (!placeId) return;
    
    setSavedPlaces(prev => {
      const updated = prev.filter(p => p.placeId !== placeId);
      localStorage.setItem('virgil_saved_places', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check Traffic"
      className="google-maps-modal"
      size="extra-large"
    >
      <div className={`maps-container ${routeInfoVisible && currentRoute ? 'has-route-info' : ''}`}>
        {isLoading && (
          <div className="maps-loading">
            <div className="maps-spinner" />
            <p>Loading map...</p>
          </div>
        )}
        
        {error && (
          <div className="maps-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        )}
        
        <div 
          ref={mapRef} 
          className={`map-view ${!isLoading && mapsLoaded ? 'active' : ''}`}
        />
        
        {/* Map controls */}
        {mapsLoaded && !isLoading && (
          <>
            <RouteInputBar
              currentLocation={coordinates ? {
                lat: coordinates.latitude,
                lng: coordinates.longitude,
              } : null}
              currentAddress={currentAddress || address?.formatted || 'Current Location'}
              onRouteRequest={handleRouteRequest}
              onDestinationSelect={setCurrentDestinationPlace}
              savedPlaces={savedPlaces}
              currentDestinationPlace={currentDestinationPlace}
              onSavePlace={handleSavePlace}
              onRemoveSavedPlace={handleRemoveSavedPlace}
              hasRoute={hasActiveRoute}
              onClearRoute={handleClearRoute}
            />
            
            <TrafficIndicator
              map={mapInstanceRef.current}
              isTrafficEnabled={showTraffic}
              onToggleTraffic={handleToggleTraffic}
            />
            
            {routeInfoVisible && currentRoute && (
              <RouteInfoBar
                route={currentRoute}
                alternativeRoutes={alternativeRoutes}
                onRouteSelect={handleRouteSelect}
                selectedRouteIndex={selectedRouteIndex}
                isExpanded={showRouteOptions}
                onToggleExpand={handleToggleExpand}
                onClose={handleCloseRouteInfo}
                departureTime={departureTime}
                onDepartureTimeChange={handleDepartureTimeChange}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};