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
  VIRGIL_MAP_STYLES 
} from '../../types/maps.types'
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
  
  // State
  const [currentView, setCurrentView] = useState<ViewMode>('map')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streetViewAvailable, setStreetViewAvailable] = useState(true)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  // Cleanup function
  const cleanupMaps = useCallback(() => {
    console.log('Cleaning up map instances...')
    
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
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            mapTypeControlOptions: {
              mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
              style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
              position: google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
            },
            fullscreenControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP
            }
          })

          mapInstanceRef.current = map
          console.log('Map instance created successfully')

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
  }, [isOpen, coordinates, address, cleanupMaps])

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
      </div>
    </Modal>
  )
}