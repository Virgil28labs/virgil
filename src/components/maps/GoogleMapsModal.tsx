import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Modal } from '../common/Modal'
import { 
  loadGoogleMaps, 
  createLocationMarker, 
  createInfoWindow,
  checkStreetViewAvailability,
  getGoogleMapsApiKey 
} from '../../utils/googleMaps'
import { 
  GoogleMapsModalProps, 
  ViewMode,
  VIRGIL_MAP_STYLES,
  Place 
} from '../../types/maps.types'
import { SearchBar } from './SearchBar'
import { InfoPanel } from './InfoPanel'
import { MapToolbar } from './MapToolbar'
import { DistanceOverlay } from './DistanceOverlay'
import './GoogleMapsModal.css'

export const GoogleMapsModal: React.FC<GoogleMapsModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  address
}) => {
  // DOM refs
  const mapRef = useRef<HTMLDivElement>(null)
  const streetViewRef = useRef<HTMLDivElement>(null)
  
  // Map instance refs (to avoid stale closures)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const streetViewInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const markerInstanceRef = useRef<google.maps.Marker | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const searchMarkersRef = useRef<google.maps.Marker[]>([])
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  
  // Distance measurement refs
  const measurePolylineRef = useRef<google.maps.Polyline | null>(null)
  const measureMarkersRef = useRef<google.maps.Marker[]>([])
  
  // State
  const [currentView, setCurrentView] = useState<ViewMode>('map')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streetViewAvailable, setStreetViewAvailable] = useState(true)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  
  // Search state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [showTraffic, setShowTraffic] = useState(false)
  const [currentMapLayer, setCurrentMapLayer] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap')
  
  // Distance measurement state
  const [measureMode, setMeasureMode] = useState(false)
  const [measurePoints, setMeasurePoints] = useState<google.maps.LatLng[]>([])
  const [distanceInfo, setDistanceInfo] = useState<{
    distance: number
    walkingTime?: number
    drivingTime?: number
    transitTime?: number
  } | null>(null)

  // Cleanup function
  const cleanupMaps = useCallback(() => {
    console.log('Cleaning up map instances...')
    
    // Clear search markers
    searchMarkersRef.current.forEach(marker => {
      marker.setMap(null)
    })
    searchMarkersRef.current = []
    
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setMap(null)
      markerInstanceRef.current = null
    }
    
    if (mapInstanceRef.current) {
      google.maps.event.clearInstanceListeners(mapInstanceRef.current)
      mapInstanceRef.current = null
    }
    
    if (streetViewInstanceRef.current) {
      google.maps.event.clearInstanceListeners(streetViewInstanceRef.current)
      streetViewInstanceRef.current = null
    }
    
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null)
      trafficLayerRef.current = null
    }
    
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
      directionsRendererRef.current = null
    }
    
    // Clear distance measurement
    if (measurePolylineRef.current) {
      measurePolylineRef.current.setMap(null)
      measurePolylineRef.current = null
    }
    
    measureMarkersRef.current.forEach(marker => {
      marker.setMap(null)
    })
    measureMarkersRef.current = []
    
    placesServiceRef.current = null
    directionsServiceRef.current = null
  }, [])

  // Trigger resize on map instances
  const triggerResize = useCallback(() => {
    if (mapInstanceRef.current && currentView === 'map') {
      console.log('Triggering map resize')
      google.maps.event.trigger(mapInstanceRef.current, 'resize')
      
      // Re-center the map
      if (coordinates) {
        mapInstanceRef.current.setCenter({
          lat: coordinates.latitude,
          lng: coordinates.longitude
        })
      }
    }
    
    if (streetViewInstanceRef.current && currentView === 'streetview') {
      console.log('Triggering street view resize')
      google.maps.event.trigger(streetViewInstanceRef.current, 'resize')
    }
  }, [currentView, coordinates])


  // Handle get directions
  const handleGetDirections = useCallback((place: Place) => {
    if (!coordinates) return
    
    const origin = `${coordinates.latitude},${coordinates.longitude}`
    const destination = `${place.location.lat},${place.location.lng}`
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`
    
    window.open(url, '_blank')
  }, [coordinates])


  // Close place details
  const handleClosePlaceDetails = useCallback(() => {
    setSelectedPlace(null)
  }, [])

  // Handle traffic toggle
  const handleToggleTraffic = useCallback((show: boolean) => {
    if (!mapInstanceRef.current) return

    if (show) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer()
      }
      trafficLayerRef.current.setMap(mapInstanceRef.current)
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null)
      }
    }
    
    setShowTraffic(show)
  }, [])

  // Handle layer change
  const handleLayerChange = useCallback((layer: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    if (!mapInstanceRef.current) return
    
    mapInstanceRef.current.setMapTypeId(layer)
    setCurrentMapLayer(layer)
  }, [])

  // Handle measure toggle
  const handleToggleMeasure = useCallback((active: boolean) => {
    setMeasureMode(active)
    
    if (!active) {
      // Clear measurement
      if (measurePolylineRef.current) {
        measurePolylineRef.current.setMap(null)
        measurePolylineRef.current = null
      }
      
      measureMarkersRef.current.forEach(marker => {
        marker.setMap(null)
      })
      measureMarkersRef.current = []
      
      setMeasurePoints([])
      setDistanceInfo(null)
    }
  }, [])

  // Calculate travel times using Directions API
  const calculateTravelTimes = useCallback(async (origin: google.maps.LatLng, destination: google.maps.LatLng) => {
    if (!directionsServiceRef.current) return

    const modes: google.maps.TravelMode[] = [
      google.maps.TravelMode.WALKING,
      google.maps.TravelMode.DRIVING,
      google.maps.TravelMode.TRANSIT
    ]

    const times: { walking?: number; driving?: number; transit?: number } = {}

    for (const mode of modes) {
      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsServiceRef.current!.route({
            origin,
            destination,
            travelMode: mode,
            unitSystem: google.maps.UnitSystem.METRIC
          }, (result, status) => {
            if (status === 'OK' && result) {
              resolve(result)
            } else {
              reject(new Error(status))
            }
          })
        })

        const duration = result.routes[0]?.legs[0]?.duration?.value
        if (duration) {
          const minutes = Math.round(duration / 60)
          if (mode === google.maps.TravelMode.WALKING) times.walking = minutes
          if (mode === google.maps.TravelMode.DRIVING) times.driving = minutes
          if (mode === google.maps.TravelMode.TRANSIT) times.transit = minutes
        }
      } catch (error) {
        // Some modes might not be available
        console.log(`${mode} directions not available`)
      }
    }

    return times
  }, [])

  // Handle map click for distance measurement
  const handleMapClick = useCallback(async (event: google.maps.MapMouseEvent) => {
    if (!measureMode || !event.latLng || !mapInstanceRef.current) return

    const newPoint = event.latLng
    const newPoints = [...measurePoints, newPoint]
    setMeasurePoints(newPoints)

    // Add marker
    const marker = new google.maps.Marker({
      position: newPoint,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#6c3baa',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    })
    measureMarkersRef.current.push(marker)

    // Update polyline
    if (measurePolylineRef.current) {
      measurePolylineRef.current.setPath(newPoints)
    } else {
      measurePolylineRef.current = new google.maps.Polyline({
        path: newPoints,
        geodesic: true,
        strokeColor: '#6c3baa',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: mapInstanceRef.current
      })
    }

    // Calculate distance and times if we have 2 points
    if (newPoints.length === 2) {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        newPoints[0],
        newPoints[1]
      )

      const times = await calculateTravelTimes(newPoints[0], newPoints[1])
      
      setDistanceInfo({
        distance,
        ...times
      })
    } else if (newPoints.length > 2) {
      // Reset for new measurement
      setMeasurePoints([newPoint])
      
      // Clear old markers except the last one
      measureMarkersRef.current.slice(0, -1).forEach(marker => {
        marker.setMap(null)
      })
      measureMarkersRef.current = [measureMarkersRef.current[measureMarkersRef.current.length - 1]]
      
      if (measurePolylineRef.current) {
        measurePolylineRef.current.setPath([newPoint])
      }
      
      setDistanceInfo(null)
    }
  }, [measureMode, measurePoints, calculateTravelTimes])

  // Handle search from SearchBar
  const handleSearch = useCallback((query: string) => {
    if (!mapInstanceRef.current || !placesServiceRef.current) return

    const request: google.maps.places.TextSearchRequest = {
      query,
      location: mapInstanceRef.current.getCenter(),
      radius: 5000
    }

    placesServiceRef.current.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        // Clear existing search markers
        searchMarkersRef.current.forEach(marker => {
          marker.setMap(null)
        })
        searchMarkersRef.current = []

        const bounds = new google.maps.LatLngBounds()
        
        results.slice(0, 10).forEach(place => {
          if (!place.geometry?.location) return

          const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: mapInstanceRef.current!,
            title: place.name,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }
          })

          marker.addListener('click', () => {
            const placeData: Place = {
              id: place.place_id || '',
              placeId: place.place_id || '',
              name: place.name || '',
              address: place.formatted_address || '',
              location: {
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng()
              },
              rating: place.rating,
              priceLevel: place.price_level,
              types: place.types
            }
            setSelectedPlace(placeData)
          })

          searchMarkersRef.current.push(marker)
          bounds.extend(place.geometry.location)
        })

        if (results.length > 0) {
          mapInstanceRef.current!.fitBounds(bounds)
        }
      }
    })
  }, [])

  // Handle place selection from SearchBar autocomplete
  const handlePlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location || !mapInstanceRef.current) return

    mapInstanceRef.current.setCenter(place.geometry.location)
    mapInstanceRef.current.setZoom(17)

    const placeData: Place = {
      id: place.place_id || '',
      placeId: place.place_id || '',
      name: place.name || '',
      address: place.formatted_address || '',
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      },
      types: place.types
    }
    
    setSelectedPlace(placeData)
  }, [])

  // Initialize Google Maps
  useEffect(() => {
    if (!isOpen || !coordinates) {
      console.log('Modal not open or no coordinates, skipping initialization')
      return
    }

    let mounted = true
    let initTimer: NodeJS.Timeout

    const initializeMaps = async () => {
      try {
        console.log('Starting Google Maps initialization...')
        setIsLoading(true)
        setError(null)
        
        const apiKey = getGoogleMapsApiKey()
        if (!apiKey) {
          throw new Error('Google Maps API key not found. Please check your .env file.')
        }

        // Load Google Maps if not already loaded
        if (!window.google?.maps) {
          console.log('Loading Google Maps script...')
          await loadGoogleMaps({ 
            apiKey,
            libraries: ['places', 'geometry', 'visualization']
          })
          console.log('Google Maps script loaded successfully')
        }

        if (!mounted) return

        // Wait for container to have dimensions
        const mapContainer = mapRef.current
        if (!mapContainer) {
          throw new Error('Map container not found')
        }

        // Check if container has dimensions
        const rect = mapContainer.getBoundingClientRect()
        console.log('Map container dimensions:', rect.width, 'x', rect.height)
        
        if (rect.width === 0 || rect.height === 0) {
          console.log('Container has no dimensions, waiting...')
          // Retry after a delay
          initTimer = setTimeout(() => {
            if (mounted) initializeMaps()
          }, 300)
          return
        }

        const position = {
          lat: coordinates.latitude,
          lng: coordinates.longitude
        }
        console.log('Initializing map at position:', position)

        // Check Street View availability
        const hasStreetView = await checkStreetViewAvailability(position)
        setStreetViewAvailable(hasStreetView)
        console.log('Street View available:', hasStreetView)

        // Initialize Map
        if (mapContainer && mounted) {
          console.log('Creating map instance...')
          const map = new google.maps.Map(mapContainer, {
            center: position,
            zoom: 16,
            styles: VIRGIL_MAP_STYLES,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false, // Using our custom layer control
            streetViewControl: true,
            fullscreenControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM
            },
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM
            }
          })

          mapInstanceRef.current = map
          console.log('Map instance created successfully')

          // Initialize PlacesService
          placesServiceRef.current = new google.maps.places.PlacesService(map)
          console.log('PlacesService created successfully')
          
          // Initialize DirectionsService
          directionsServiceRef.current = new google.maps.DirectionsService()
          console.log('DirectionsService created successfully')
          
          // Add click listener for distance measurement
          map.addListener('click', handleMapClick)

          // Trigger resize after a brief delay to ensure proper rendering
          setTimeout(() => {
            if (mounted && mapInstanceRef.current) {
              google.maps.event.trigger(mapInstanceRef.current, 'resize')
              mapInstanceRef.current.setCenter(position)
              console.log('Initial resize triggered')
            }
          }, 100)

          // Create marker
          const marker = createLocationMarker(position, map)
          markerInstanceRef.current = marker
          
          // Create info window
          const addressText = address?.street || address?.formatted || 'Your Location'
          const infoContent = `
            <div class="map-info-window">
              <h3>${addressText}</h3>
              <p>Lat: ${coordinates.latitude.toFixed(6)}</p>
              <p>Lng: ${coordinates.longitude.toFixed(6)}</p>
            </div>
          `
          createInfoWindow(infoContent, marker, map)
          console.log('Marker and info window created')
        }

        // Initialize Street View
        if (streetViewRef.current && hasStreetView && mounted) {
          console.log('Creating Street View instance...')
          const streetView = new google.maps.StreetViewPanorama(streetViewRef.current, {
            position,
            pov: {
              heading: 0,
              pitch: 0
            },
            zoom: 1,
            addressControl: true,
            linksControl: true,
            panControl: true,
            enableCloseButton: false,
            fullscreenControl: true,
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP
            }
          })

          streetViewInstanceRef.current = streetView
          console.log('Street View instance created successfully')
        }

        if (mounted) {
          setMapsLoaded(true)
          setIsLoading(false)
          console.log('Maps initialization completed')
        }
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error)
        if (mounted) {
          setIsLoading(false)
          setError(error instanceof Error ? error.message : 'Failed to load maps. Please check your internet connection and try again.')
        }
      }
    }

    // Initialize with delay to ensure modal is fully rendered
    initTimer = setTimeout(() => {
      initializeMaps()
    }, 500) // Increased delay to ensure container dimensions

    // Cleanup
    return () => {
      mounted = false
      clearTimeout(initTimer)
      cleanupMaps()
    }
  }, [isOpen, coordinates, address, cleanupMaps, handleMapClick])

  // Trigger resize when view changes
  useEffect(() => {
    if (!mapsLoaded) return
    
    // Small delay to ensure CSS transitions complete
    const timer = setTimeout(() => {
      triggerResize()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [currentView, mapsLoaded, triggerResize])

  // Toggle between Map and Street View
  const toggleView = useCallback(() => {
    const newView = currentView === 'map' ? 'streetview' : 'map'
    console.log('Toggling view to:', newView)
    setCurrentView(newView)
  }, [currentView])

  // Get display address
  const displayAddress = address?.street || 
    (address?.formatted ? address.formatted.split(',')[0] : '') ||
    'Current Location'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="maps-modal-header">
          <span className="maps-modal-title">{displayAddress}</span>
          {streetViewAvailable && mapsLoaded && !isLoading && (
            <button 
              className="view-toggle-btn"
              onClick={toggleView}
              title={`Switch to ${currentView === 'map' ? 'Street View' : 'Map'}`}
            >
              {currentView === 'map' ? '🚶 Street View' : '🗺️ Map View'}
            </button>
          )}
        </div>
      }
      className="google-maps-modal"
      size="large"
    >
      <div className="maps-container">
        {isLoading && (
          <div className="maps-loading">
            <div className="maps-spinner"></div>
            <p>Loading maps...</p>
          </div>
        )}
        
        {error && (
          <div className="maps-error">
            <p>⚠️ {error}</p>
            <button 
              className="retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        <div 
          ref={mapRef}
          className={`map-view ${currentView === 'map' && mapsLoaded ? 'active' : ''}`}
        />
        
        {streetViewAvailable && (
          <div 
            ref={streetViewRef}
            className={`street-view ${currentView === 'streetview' && mapsLoaded ? 'active' : ''}`}
          />
        )}

        {!streetViewAvailable && currentView === 'streetview' && mapsLoaded && (
          <div className="street-view-unavailable">
            <p>Street View is not available for this location</p>
            <button onClick={() => setCurrentView('map')}>
              Back to Map
            </button>
          </div>
        )}

        {/* Search and controls - only show in map view when loaded */}
        {currentView === 'map' && mapsLoaded && !isLoading && (
          <>
            <SearchBar 
              onSearch={handleSearch}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search places..."
            />
            
            <MapToolbar 
              onToggleTraffic={handleToggleTraffic}
              onToggleMeasure={handleToggleMeasure}
              onLayerChange={handleLayerChange}
              initialTrafficState={showTraffic}
              measureActive={measureMode}
              currentLayer={currentMapLayer}
            />
            
            {distanceInfo && (
              <DistanceOverlay 
                distance={distanceInfo.distance}
                walkingTime={distanceInfo.walkingTime}
                drivingTime={distanceInfo.drivingTime}
                transitTime={distanceInfo.transitTime}
                onClose={() => setDistanceInfo(null)}
              />
            )}
            
            <InfoPanel 
              place={selectedPlace}
              onClose={handleClosePlaceDetails}
              onGetDirections={handleGetDirections}
              userLocation={coordinates ? { 
                lat: coordinates.latitude, 
                lng: coordinates.longitude 
              } : null}
            />
          </>
        )}
      </div>
    </Modal>
  )
}