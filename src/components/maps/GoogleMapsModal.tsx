import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { timeService } from '../../services/TimeService';
import { 
  loadGoogleMaps, 
  createLocationMarker, 
  getGoogleMapsApiKey, 
} from '../../utils/googleMaps';
import type { 
  GoogleMapsModalProps,
} from '../../types/maps.types';
import { RouteInputBar } from './RouteInputBar';
import { RouteInfoBar } from './RouteInfoBar';
import { TrafficIndicator } from './TrafficIndicator';
import { useRouteState } from '../../hooks/useRouteState';
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
  const markerInstanceRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
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
  const [currentAddress, setCurrentAddress] = useState<string>('Current Location');
  
  // Consolidated route state
  const {
    currentRoute,
    alternativeRoutes,
    selectedRouteIndex,
    hasActiveRoute,
    showRouteOptions,
    routeInfoVisible,
    setSelectedRouteIndex,
    setShowRouteOptions,
    setRouteInfoVisible,
    clearRoute: clearRouteState,
    setRouteData,
  } = useRouteState();
  
  // Other state
  const [currentDestinationPlace, setCurrentDestinationPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const [departureTime, setDepartureTime] = useState<Date | 'now'>('now');

  // Memoized values to prevent unnecessary re-renders
  const currentLocation = useMemo(() => 
    coordinates ? {
      lat: coordinates.latitude,
      lng: coordinates.longitude,
    } : null,
  [coordinates],
  );

  const currentAddressDisplay = useMemo(() => 
    currentAddress || address?.formatted || 'Current Location',
  [currentAddress, address?.formatted],
  );

  // Cleanup function
  const cleanupMaps = useCallback(() => {
    if (markerInstanceRef.current) {
      // Cleanup AdvancedMarkerElement
      markerInstanceRef.current.map = null;
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

  // Get address for current location with timeout for performance
  const geocodeLocation = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    if (!geocoderRef.current) return '';
    
    try {
      const result = await Promise.race([
        new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          if (!geocoderRef.current) {
            reject(new Error('Geocoder not initialized'));
            return;
          }
          geocoderRef.current.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(status));
            }
          });
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 3000),
        ),
      ]);
      
      return result[0]?.formatted_address || '';
    } catch (error) {
      // Don't log timeout errors as they're expected for performance
      if (!(error as Error).message.includes('timeout')) {
        logger.error('Geocoding error', error as Error, {
          component: 'GoogleMapsModal',
          action: 'geocodeLocation',
          metadata: { location: latLng },
        });
      }
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
        departureTime: depTime === 'now' ? timeService.getCurrentDateTime() : depTime,
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      },
    };
    
    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        if (!directionsServiceRef.current) {
          reject(new Error('DirectionsService not initialized'));
          return;
        }
        directionsServiceRef.current.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            reject(new Error(status));
          }
        });
      });
      
      if (result.routes.length > 0) {
        // Use consolidated route state setter for better performance
        setRouteData(result.routes);
        
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
  }, [departureTime, setRouteData]);

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
  }, [currentRoute, alternativeRoutes, setSelectedRouteIndex, setShowRouteOptions]);

  // Handle clear route
  const handleClearRoute = useCallback(() => {
    // Clear route displays
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current.setMap(mapInstanceRef.current);
      directionsRendererRef.current.setDirections({ routes: [] } as google.maps.DirectionsResult);
    }
    
    // Clear alternative renderers
    alternativeRenderersRef.current.forEach(renderer => {
      renderer.setMap(null);
    });
    alternativeRenderersRef.current = [];
    
    // Clear consolidated route state
    clearRouteState();
    
    // Clear any auto-collapse timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
    
    // Reset map view to current location
    if (mapInstanceRef.current && currentLocation) {
      mapInstanceRef.current.setCenter(currentLocation);
      mapInstanceRef.current.setZoom(14);
    }
  }, [currentLocation, clearRouteState]);

  // Handle toggle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setShowRouteOptions((prev) => !prev);
    
    // Clear auto-collapse timer if user manually toggles
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, [setShowRouteOptions]);

  // Handle close route info
  const handleCloseRouteInfo = useCallback(() => {
    setRouteInfoVisible(false);
    
    // Clear auto-collapse timer
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  }, [setRouteInfoVisible]);

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
        
        // Wait for Google Maps to be fully initialized
        if (!window.google?.maps?.ControlPosition) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!mounted || !mapRef.current || !window.google?.maps?.ControlPosition) {
          console.error('Google Maps not properly initialized');
          return;
        }
        
        // Create map instance with optimized configuration
        const map = new google.maps.Map(mapRef.current, {
          center: {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          },
          zoom: 14,
          mapId: 'VIRGIL_TRAFFIC_MAP',
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition?.RIGHT_CENTER || 6, // 6 is RIGHT_CENTER fallback
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
        markerInstanceRef.current = await createLocationMarker({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        }, map);
        
        // Set map as loaded immediately for fast UI response
        setMapsLoaded(true);
        setIsLoading(false);
        setError(null);
        
        // Get address for current location asynchronously (non-blocking)
        geocodeLocation({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
        }).then(addr => {
          if (mounted) {
            setCurrentAddress(addr);
          }
        }).catch(error => {
          // Address loading failed, but don't break the map
          logger.warn('Address geocoding failed', {
            component: 'GoogleMapsModal',
            action: 'geocodeLocation',
            metadata: { error },
          });
          if (mounted) {
            setCurrentAddress('Current Location'); // Fallback
          }
        });
        
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
              currentLocation={currentLocation}
              currentAddress={currentAddressDisplay}
              onRouteRequest={handleRouteRequest}
              onDestinationSelect={setCurrentDestinationPlace}
              currentDestinationPlace={currentDestinationPlace}
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