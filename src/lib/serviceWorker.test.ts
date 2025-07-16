import { registerServiceWorker, unregisterServiceWorker, setupNetworkMonitoring, cacheRequest, getCachedResponse } from './serviceWorker'
import type { ServiceWorkerConfig } from './serviceWorker'

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    unregister: jest.fn()
  }),
  controller: null
}

const mockRegistration = {
  installing: null as any,
  onupdatefound: null as any,
  unregister: jest.fn()
}

// Mock window properties
const mockLocation = {
  hostname: 'localhost',
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000/',
  reload: jest.fn()
}

// Mock caches API
const mockCache = {
  put: jest.fn(),
  match: jest.fn()
}

const mockCaches = {
  open: jest.fn(() => Promise.resolve(mockCache)),
  match: jest.fn()
}

// Mock import.meta globally
const mockImportMeta = {
  env: {
    BASE_URL: '/'
  }
};

(global as any).import = {
  meta: mockImportMeta
};

describe('ServiceWorker', () => {
  const originalNavigator = global.navigator
  const originalWindow = global.window
  const originalCaches = global.caches
  const originalFetch = global.fetch
  const originalConsole = { log: console.log, error: console.error }
  
  // Store original location values to restore later
  const originalLocationValues = {
    hostname: window.location.hostname,
    origin: window.location.origin,
    href: window.location.href
  }

  beforeEach(() => {
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: mockServiceWorker,
        onLine: true
      },
      writable: true,
      configurable: true
    })

    // Mock window location properties directly
    Object.defineProperty(window.location, 'hostname', {
      value: mockLocation.hostname,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window.location, 'origin', {
      value: mockLocation.origin,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window.location, 'href', {
      value: mockLocation.href,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window.location, 'reload', {
      value: mockLocation.reload,
      writable: true,
      configurable: true
    })

    // Mock console
    console.log = jest.fn()
    console.error = jest.fn()

    // Mock caches
    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true,
      configurable: true
    })

    // Mock fetch
    global.fetch = jest.fn()

    // Reset import.meta.env
    mockImportMeta.env.BASE_URL = '/'

    // Reset mocks
    jest.clearAllMocks()
    mockRegistration.installing = null
    mockRegistration.onupdatefound = null
    mockServiceWorker.controller = null
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true
    })
    // Restore original location properties
    Object.defineProperty(window.location, 'hostname', {
      value: originalLocationValues.hostname,
      configurable: true
    })
    Object.defineProperty(window.location, 'origin', {
      value: originalLocationValues.origin,
      configurable: true
    })
    Object.defineProperty(window.location, 'href', {
      value: originalLocationValues.href,
      configurable: true
    })
    Object.defineProperty(global, 'caches', {
      value: originalCaches,
      configurable: true
    })
    global.fetch = originalFetch
    console.log = originalConsole.log
    console.error = originalConsole.error
  })

  describe('registerServiceWorker', () => {
    it('should not register if serviceWorker is not supported', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })

      registerServiceWorker()

      expect(mockServiceWorker.register).not.toHaveBeenCalled()
    })

    it('should not register if origins do not match', () => {
      mockImportMeta.env.BASE_URL = 'https://other-domain.com/'
      
      registerServiceWorker()

      expect(mockServiceWorker.register).not.toHaveBeenCalled()
    })

    it('should register service worker on localhost', (done) => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration)

      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn()
      }

      registerServiceWorker(config)

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      // Use setTimeout to allow async operations to complete
      setTimeout(() => {
        expect(console.log).toHaveBeenCalledWith('Service worker registered in development mode')
        done()
      }, 100)
    })

    it('should register service worker in production', (done) => {
      Object.defineProperty(window.location, 'hostname', {
        value: 'example.com',
        writable: true,
        configurable: true
      })
      mockServiceWorker.register.mockResolvedValue(mockRegistration)

      registerServiceWorker()

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')
        done()
      }, 10)
    })

    it('should handle successful installation', (done) => {
      Object.defineProperty(window.location, 'hostname', {
        value: 'example.com',
        writable: true,
        configurable: true
      })
      mockServiceWorker.register.mockResolvedValue(mockRegistration)

      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn()
      }

      registerServiceWorker(config)

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        // Simulate update found
        const mockInstallingWorker = {
          state: 'installing',
          onstatechange: null as any
        }
        mockRegistration.installing = mockInstallingWorker
        mockRegistration.onupdatefound()

        // Simulate installed state
        mockInstallingWorker.state = 'installed'
        mockInstallingWorker.onstatechange()

        expect(console.log).toHaveBeenCalledWith('Content is cached for offline use.')
        expect(config.onSuccess).toHaveBeenCalledWith(mockRegistration)
        done()
      }, 10)
    })

    it('should handle updates when controller exists', (done) => {
      Object.defineProperty(window.location, 'hostname', {
        value: 'example.com',
        writable: true,
        configurable: true
      })
      mockServiceWorker.register.mockResolvedValue(mockRegistration)
      mockServiceWorker.controller = {} // Simulate existing controller

      const config: ServiceWorkerConfig = {
        onUpdate: jest.fn()
      }

      registerServiceWorker(config)

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        // Simulate update found
        const mockInstallingWorker = {
          state: 'installing',
          onstatechange: null as any
        }
        mockRegistration.installing = mockInstallingWorker
        mockRegistration.onupdatefound()

        // Simulate installed state
        mockInstallingWorker.state = 'installed'
        mockInstallingWorker.onstatechange()

        expect(console.log).toHaveBeenCalledWith('New content is available; please refresh.')
        expect(config.onUpdate).toHaveBeenCalledWith(mockRegistration)
        done()
      }, 10)
    })

    it('should handle registration errors', (done) => {
      Object.defineProperty(window.location, 'hostname', {
        value: 'example.com',
        writable: true,
        configurable: true
      })
      mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'))

      registerServiceWorker()

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith('Error during service worker registration:', expect.any(Error))
        done()
      }, 10)
    })

    it('should check valid service worker in localhost', (done) => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        status: 200,
        headers: {
          get: jest.fn(() => 'application/javascript')
        }
      } as any)

      mockServiceWorker.register.mockResolvedValue(mockRegistration)

      registerServiceWorker()

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        expect(mockFetch).toHaveBeenCalledWith('/sw.js', {
          headers: { 'Service-Worker': 'script' }
        })
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js')
        done()
      }, 10)
    })

    it('should unregister invalid service worker', (done) => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        status: 404,
        headers: {
          get: jest.fn(() => 'text/html')
        }
      } as any)

      const mockReady = {
        unregister: jest.fn().mockResolvedValue(undefined)
      }
      mockServiceWorker.ready = Promise.resolve(mockReady)

      registerServiceWorker()

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        expect(mockReady.unregister).toHaveBeenCalled()
        expect(mockLocation.reload).toHaveBeenCalled()
        done()
      }, 100)
    })

    it('should handle offline mode', (done) => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValue(new Error('Network error'))

      registerServiceWorker()

      // Trigger load event
      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        expect(console.log).toHaveBeenCalledWith('No internet connection found. App is running in offline mode.')
        done()
      }, 10)
    })
  })

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker', async () => {
      const mockReady = {
        unregister: jest.fn().mockResolvedValue(undefined)
      }
      mockServiceWorker.ready = Promise.resolve(mockReady)

      await unregisterServiceWorker()

      expect(mockReady.unregister).toHaveBeenCalled()
    })

    it('should handle unregister errors', async () => {
      const mockReady = {
        unregister: jest.fn().mockRejectedValue(new Error('Unregister failed'))
      }
      mockServiceWorker.ready = Promise.resolve(mockReady)

      await unregisterServiceWorker()

      expect(console.error).toHaveBeenCalledWith('Unregister failed')
    })

    it('should not unregister if serviceWorker is not supported', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })

      unregisterServiceWorker()

      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('setupNetworkMonitoring', () => {
    it('should detect online status', () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn()
      }

      setupNetworkMonitoring(config)

      expect(console.log).toHaveBeenCalledWith('App is online')
      expect(config.onOnline).toHaveBeenCalled()
    })

    it('should detect offline status', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true
      })

      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn()
      }

      setupNetworkMonitoring(config)

      expect(console.log).toHaveBeenCalledWith('App is offline')
      expect(config.onOffline).toHaveBeenCalled()
    })

    it('should handle online event', () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn()
      }

      setupNetworkMonitoring(config)

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      expect(config.onOnline).toHaveBeenCalledTimes(2) // Initial + event
    })

    it('should handle offline event', () => {
      const config: ServiceWorkerConfig = {
        onOffline: jest.fn()
      }

      setupNetworkMonitoring(config)

      // Simulate going offline
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        configurable: true
      })

      // Trigger offline event
      window.dispatchEvent(new Event('offline'))

      expect(config.onOffline).toHaveBeenCalledTimes(1)
    })

    it('should work without config', () => {
      setupNetworkMonitoring()

      expect(console.log).toHaveBeenCalledWith('App is online')
    })
  })

  describe('cacheRequest', () => {
    it('should cache a request and response', async () => {
      const request = new Request('https://api.example.com/data')
      const response = new Response('{"data": "test"}', {
        headers: { 'Content-Type': 'application/json' }
      })
      const clonedResponse = response.clone()

      jest.spyOn(response, 'clone').mockReturnValue(clonedResponse)

      await cacheRequest(request, response)

      expect(mockCaches.open).toHaveBeenCalledWith('runtime-cache')
      expect(mockCache.put).toHaveBeenCalledWith(request, clonedResponse)
    })

    it('should cache with string URL', async () => {
      const url = 'https://api.example.com/data'
      const response = new Response('{"data": "test"}')
      const clonedResponse = response.clone()

      jest.spyOn(response, 'clone').mockReturnValue(clonedResponse)

      await cacheRequest(url, response)

      expect(mockCache.put).toHaveBeenCalledWith(url, clonedResponse)
    })

    it('should handle cache errors', async () => {
      mockCaches.open.mockRejectedValueOnce(new Error('Cache error'))

      const request = new Request('https://api.example.com/data')
      const response = new Response('test')

      await expect(cacheRequest(request, response)).rejects.toThrow('Cache error')
    })
  })

  describe('getCachedResponse', () => {
    it('should get cached response for request', async () => {
      const request = new Request('https://api.example.com/data')
      const cachedResponse = new Response('cached data')

      mockCaches.match.mockResolvedValue(cachedResponse)

      const result = await getCachedResponse(request)

      expect(result).toBe(cachedResponse)
      expect(mockCaches.match).toHaveBeenCalledWith(request)
    })

    it('should get cached response for URL string', async () => {
      const url = 'https://api.example.com/data'
      const cachedResponse = new Response('cached data')

      mockCaches.match.mockResolvedValue(cachedResponse)

      const result = await getCachedResponse(url)

      expect(result).toBe(cachedResponse)
      expect(mockCaches.match).toHaveBeenCalledWith(url)
    })

    it('should return undefined if not cached', async () => {
      mockCaches.match.mockResolvedValue(undefined)

      const result = await getCachedResponse('https://api.example.com/data')

      expect(result).toBeUndefined()
    })

    it('should handle cache errors', async () => {
      mockCaches.match.mockRejectedValue(new Error('Cache error'))

      await expect(getCachedResponse('https://api.example.com/data')).rejects.toThrow('Cache error')
    })
  })

  describe('edge cases', () => {
    it('should handle IPv6 localhost', () => {
      Object.defineProperty(window.location, 'hostname', {
        value: '[::1]',
        writable: true,
        configurable: true
      })
      
      registerServiceWorker()

      // Should still be considered localhost
      window.dispatchEvent(new Event('load'))

      // checkValidServiceWorker should be called for localhost
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle 127.x.x.x addresses', () => {
      Object.defineProperty(window.location, 'hostname', {
        value: '127.0.0.1',
        writable: true,
        configurable: true
      })
      
      registerServiceWorker()

      window.dispatchEvent(new Event('load'))

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle missing installing worker', (done) => {
      mockLocation.hostname = 'example.com'
      mockServiceWorker.register.mockResolvedValue(mockRegistration)

      registerServiceWorker()

      window.dispatchEvent(new Event('load'))

      setTimeout(() => {
        // Simulate update found with null installing worker
        mockRegistration.installing = null
        mockRegistration.onupdatefound()

        // Should not throw error
        expect(console.error).not.toHaveBeenCalled()
        done()
      }, 10)
    })
  })
})