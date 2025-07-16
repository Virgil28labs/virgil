import { mapsService } from './mapsService'

// Mock DOM elements
const mockScript = {
  src: '',
  async: false,
  defer: false,
  onerror: null as any,
  remove: jest.fn()
}

const mockDiv = document.createElement('div')

// Mock Google Maps API
const mockMap = {
  setCenter: jest.fn(),
  setZoom: jest.fn()
}

const mockMarker = {
  setMap: jest.fn(),
  setPosition: jest.fn()
}

const mockGeocodeResult = {
  geometry: {
    location: {
      lat: () => 37.7749,
      lng: () => -122.4194
    }
  },
  formatted_address: '123 Main St, San Francisco, CA 94105',
  place_id: 'ChIJgUbEo8cfqokR5lP9_Wh_DaM',
  address_components: [
    { long_name: '123', short_name: '123', types: ['street_number'] },
    { long_name: 'Main Street', short_name: 'Main St', types: ['route'] }
  ]
}

const mockPlaceResult = {
  name: 'Test Restaurant',
  place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  rating: 4.5,
  types: ['restaurant', 'food'],
  vicinity: '123 Test St',
  geometry: {
    location: {
      lat: () => 37.7749,
      lng: () => -122.4194
    }
  },
  photos: [{
    getUrl: jest.fn(({ maxWidth }) => `https://example.com/photo_${maxWidth}.jpg`)
  }]
}

const mockDirectionsResult = {
  routes: [{
    legs: [{
      distance: { text: '5.2 mi', value: 8368 },
      duration: { text: '15 mins', value: 900 }
    }]
  }]
}

const mockGoogle = {
  maps: {
    Map: jest.fn(() => mockMap),
    Marker: jest.fn(() => mockMarker),
    Geocoder: jest.fn(() => ({
      geocode: jest.fn((request, callback) => {
        if (request.address === 'invalid address') {
          callback([], 'ZERO_RESULTS')
        } else if (request.address === 'error address') {
          callback([], 'ERROR')
        } else {
          callback([mockGeocodeResult], 'OK')
        }
      })
    })),
    LatLng: jest.fn((lat, lng) => ({ lat, lng })),
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      TRANSIT: 'TRANSIT'
    },
    places: {
      PlacesService: jest.fn(() => ({
        nearbySearch: jest.fn((request, callback) => {
          if (request.type === 'error') {
            callback([], 'ERROR')
          } else {
            callback([mockPlaceResult], mockGoogle.maps.places.PlacesServiceStatus.OK)
          }
        })
      })),
      PlacesServiceStatus: {
        OK: 'OK',
        ERROR: 'ERROR'
      }
    },
    DirectionsService: jest.fn(() => ({
      route: jest.fn((request, callback) => {
        if (request.destination === 'error destination') {
          callback(null, 'NOT_FOUND')
        } else {
          callback(mockDirectionsResult, 'OK')
        }
      })
    }))
  }
}

describe('MapsService', () => {
  let originalCreateElement: any
  let originalHead: any
  let originalEnv: any

  beforeEach(() => {
    // Clear window.google
    delete (window as any).google
    delete (window as any).initGoogleMaps

    // Mock document methods
    originalCreateElement = document.createElement
    originalHead = document.head.appendChild
    
    document.createElement = jest.fn((tag: string) => {
      if (tag === 'script') {
        return mockScript as any
      }
      return mockDiv
    })
    
    document.head.appendChild = jest.fn()

    // Mock environment variable
    originalEnv = import.meta.env
    import.meta.env = {
      ...originalEnv,
      VITE_GOOGLE_MAPS_API_KEY: 'test-api-key'
    }

    // Reset mapsService state by creating new instance
    // Since it's a singleton, we need to reset its internal state
    ;(mapsService as any).isLoaded = false
    ;(mapsService as any).loadPromise = null

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.createElement = originalCreateElement
    document.head.appendChild = originalHead
    import.meta.env = originalEnv
  })

  describe('loadGoogleMaps', () => {
    it('should load Google Maps API successfully', async () => {
      const loadPromise = mapsService.loadGoogleMaps()

      // Simulate script load
      ;(window as any).google = mockGoogle
      ;(window as any).initGoogleMaps()

      const result = await loadPromise

      expect(result).toBe(mockGoogle)
      expect(document.createElement).toHaveBeenCalledWith('script')
      expect(document.head.appendChild).toHaveBeenCalled()
      expect(mockScript.src).toBe('https://maps.googleapis.com/maps/api/js?key=test-api-key&libraries=places&callback=initGoogleMaps')
      expect(mockScript.async).toBe(true)
      expect(mockScript.defer).toBe(true)
    })

    it('should return cached Google Maps if already loaded', async () => {
      // First load
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true

      const result = await mapsService.loadGoogleMaps()

      expect(result).toBe(mockGoogle)
      expect(document.createElement).not.toHaveBeenCalled()
    })

    it('should return existing promise if loading in progress', async () => {
      // Ensure clean state
      ;(mapsService as any).isLoaded = false
      ;(mapsService as any).loadPromise = null
      
      const firstPromise = mapsService.loadGoogleMaps()
      const secondPromise = mapsService.loadGoogleMaps()

      expect(firstPromise).toBe(secondPromise)

      // Complete the load
      ;(window as any).google = mockGoogle
      ;(window as any).initGoogleMaps()

      await firstPromise
    })

    it('should throw error if API key is missing', async () => {
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY = ''

      await expect(mapsService.loadGoogleMaps()).rejects.toThrow(
        'Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.'
      )
    })

    it('should handle script loading error', async () => {
      const loadPromise = mapsService.loadGoogleMaps()

      // Simulate script error
      mockScript.onerror!()

      await expect(loadPromise).rejects.toThrow('Failed to load Google Maps API')
    })

    it('should return existing google maps if already on window', async () => {
      ;(window as any).google = mockGoogle

      const result = await mapsService.loadGoogleMaps()

      expect(result).toBe(mockGoogle)
      expect(document.createElement).not.toHaveBeenCalled()
    })
  })

  describe('createMap', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should create a map with default options', async () => {
      const container = document.createElement('div')
      
      const map = await mapsService.createMap(container)

      expect(map).toBe(mockMap)
      expect(mockGoogle.maps.Map).toHaveBeenCalledWith(container, {
        zoom: 13,
        center: { lat: 37.7749, lng: -122.4194 },
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      })
    })

    it('should create a map with custom options', async () => {
      const container = document.createElement('div')
      const customOptions = {
        zoom: 15,
        center: { lat: 40.7128, lng: -74.0060 },
        mapTypeControl: false
      }
      
      const map = await mapsService.createMap(container, customOptions)

      expect(map).toBe(mockMap)
      expect(mockGoogle.maps.Map).toHaveBeenCalledWith(container, {
        zoom: 15,
        center: { lat: 40.7128, lng: -74.0060 },
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true
      })
    })
  })

  describe('addMarker', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should add a marker to the map', async () => {
      const position = { lat: 37.7749, lng: -122.4194 }
      
      const marker = await mapsService.addMarker(mockMap, position)

      expect(marker).toBe(mockMarker)
      expect(mockGoogle.maps.Marker).toHaveBeenCalledWith({
        position,
        map: mockMap
      })
    })

    it('should add a marker with custom options', async () => {
      const position = { lat: 37.7749, lng: -122.4194 }
      const options = {
        title: 'Test Marker',
        draggable: true
      }
      
      const marker = await mapsService.addMarker(mockMap, position, options)

      expect(marker).toBe(mockMarker)
      expect(mockGoogle.maps.Marker).toHaveBeenCalledWith({
        position,
        map: mockMap,
        title: 'Test Marker',
        draggable: true
      })
    })
  })

  describe('geocodeAddress', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should geocode an address successfully', async () => {
      const address = '123 Main St, San Francisco, CA'
      
      const result = await mapsService.geocodeAddress(address)

      expect(result).toEqual({
        coordinates: {
          lat: 37.7749,
          lng: -122.4194
        },
        formatted_address: '123 Main St, San Francisco, CA 94105',
        place_id: 'ChIJgUbEo8cfqokR5lP9_Wh_DaM'
      })
    })

    it('should handle geocoding failure with ZERO_RESULTS', async () => {
      await expect(mapsService.geocodeAddress('invalid address')).rejects.toThrow(
        'Geocoding failed: ZERO_RESULTS'
      )
    })

    it('should handle geocoding failure with ERROR', async () => {
      await expect(mapsService.geocodeAddress('error address')).rejects.toThrow(
        'Geocoding failed: ERROR'
      )
    })
  })

  describe('reverseGeocode', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should reverse geocode coordinates successfully', async () => {
      const geocoder = {
        geocode: jest.fn((request, callback) => {
          callback([mockGeocodeResult], 'OK')
        })
      }
      mockGoogle.maps.Geocoder.mockReturnValueOnce(geocoder)

      const result = await mapsService.reverseGeocode(37.7749, -122.4194)

      expect(result).toEqual({
        formatted_address: '123 Main St, San Francisco, CA 94105',
        place_id: 'ChIJgUbEo8cfqokR5lP9_Wh_DaM',
        address_components: mockGeocodeResult.address_components
      })

      expect(geocoder.geocode).toHaveBeenCalledWith(
        { location: { lat: 37.7749, lng: -122.4194 } },
        expect.any(Function)
      )
    })

    it('should handle reverse geocoding failure', async () => {
      const geocoder = {
        geocode: jest.fn((request, callback) => {
          callback([], 'ZERO_RESULTS')
        })
      }
      mockGoogle.maps.Geocoder.mockReturnValueOnce(geocoder)

      await expect(mapsService.reverseGeocode(37.7749, -122.4194)).rejects.toThrow(
        'Reverse geocoding failed: ZERO_RESULTS'
      )
    })
  })

  describe('searchNearbyPlaces', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should search nearby places successfully', async () => {
      const location = { lat: 37.7749, lng: -122.4194 }
      
      const places = await mapsService.searchNearbyPlaces(location)

      expect(places).toEqual([{
        name: 'Test Restaurant',
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        rating: 4.5,
        types: ['restaurant', 'food'],
        vicinity: '123 Test St',
        coordinates: {
          lat: 37.7749,
          lng: -122.4194
        },
        photo_url: 'https://example.com/photo_200.jpg'
      }])
    })

    it('should search with custom radius and type', async () => {
      const location = { lat: 37.7749, lng: -122.4194 }
      const service = {
        nearbySearch: jest.fn((request, callback) => {
          expect(request.radius).toBe(1000)
          expect(request.type).toBe('cafe')
          callback([mockPlaceResult], mockGoogle.maps.places.PlacesServiceStatus.OK)
        })
      }
      mockGoogle.maps.places.PlacesService.mockReturnValueOnce(service)
      
      await mapsService.searchNearbyPlaces(location, 1000, 'cafe')

      expect(service.nearbySearch).toHaveBeenCalled()
    })

    it('should handle places without photos', async () => {
      const placeWithoutPhoto = { ...mockPlaceResult, photos: null }
      const service = {
        nearbySearch: jest.fn((request, callback) => {
          callback([placeWithoutPhoto], mockGoogle.maps.places.PlacesServiceStatus.OK)
        })
      }
      mockGoogle.maps.places.PlacesService.mockReturnValueOnce(service)

      const location = { lat: 37.7749, lng: -122.4194 }
      const places = await mapsService.searchNearbyPlaces(location)

      expect(places[0].photo_url).toBeNull()
    })

    it('should handle search failure', async () => {
      const location = { lat: 37.7749, lng: -122.4194 }
      
      await expect(mapsService.searchNearbyPlaces(location, 5000, 'error')).rejects.toThrow(
        'Places search failed: ERROR'
      )
    })
  })

  describe('getDirections', () => {
    beforeEach(async () => {
      ;(window as any).google = mockGoogle
      ;(mapsService as any).isLoaded = true
    })

    it('should get directions with string locations', async () => {
      const origin = '123 Main St'
      const destination = '456 Oak Ave'
      
      const result = await mapsService.getDirections(origin, destination)

      expect(result).toBe(mockDirectionsResult)
    })

    it('should get directions with LatLng locations', async () => {
      const origin = { lat: 37.7749, lng: -122.4194 }
      const destination = { lat: 37.7751, lng: -122.4196 }
      
      const result = await mapsService.getDirections(origin, destination)

      expect(result).toBe(mockDirectionsResult)
    })

    it('should get directions with custom travel mode', async () => {
      const service = {
        route: jest.fn((request, callback) => {
          expect(request.travelMode).toBe('WALKING')
          callback(mockDirectionsResult, 'OK')
        })
      }
      mockGoogle.maps.DirectionsService.mockReturnValueOnce(service)

      await mapsService.getDirections('A', 'B', 'WALKING')

      expect(service.route).toHaveBeenCalled()
    })

    it('should handle directions request failure', async () => {
      await expect(
        mapsService.getDirections('origin', 'error destination')
      ).rejects.toThrow('Directions request failed: NOT_FOUND')
    })
  })

  describe('edge cases', () => {
    it('should handle multiple simultaneous load requests', async () => {
      const promises = Array(5).fill(null).map(() => mapsService.loadGoogleMaps())
      
      // All promises should be the same
      expect(new Set(promises).size).toBe(1)

      // Complete the load
      ;(window as any).google = mockGoogle
      ;(window as any).initGoogleMaps()

      await Promise.all(promises)
    })

    it('should handle API loading after error', async () => {
      // First attempt fails
      let loadPromise = mapsService.loadGoogleMaps()
      mockScript.onerror!()
      await expect(loadPromise).rejects.toThrow()

      // Reset state
      ;(mapsService as any).loadPromise = null

      // Second attempt succeeds
      loadPromise = mapsService.loadGoogleMaps()
      ;(window as any).google = mockGoogle
      ;(window as any).initGoogleMaps()
      
      const result = await loadPromise
      expect(result).toBe(mockGoogle)
    })
  })
})