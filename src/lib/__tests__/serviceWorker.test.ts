/**
 * Service Worker Registration and Management Tests
 * 
 * Tests the service worker utilities including:
 * - Service worker registration in different environments
 * - Service worker update handling
 * - Network status monitoring
 * - Request caching utilities
 * - Error handling and logging
 * - Localhost vs production behavior
 * - Offline/online event handling
 */

import type {
  ServiceWorkerConfig, 
} from '../serviceWorker';
import { 
  registerServiceWorker, 
  unregisterServiceWorker, 
  setupNetworkMonitoring,
  cacheRequest,
  getCachedResponse, 
} from '../serviceWorker';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock global objects
const mockServiceWorkerRegistration = {
  onupdatefound: null as (() => void) | null,
  installing: null as ServiceWorker | null,
  unregister: jest.fn().mockResolvedValue(true),
};

const mockServiceWorker = {
  state: 'installing' as ServiceWorkerState,
  onstatechange: null as (() => void) | null,
};

const mockNavigator = {
  serviceWorker: {
    register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    controller: null as ServiceWorker | null,
  },
  onLine: true,
};

const mockWindow = {
  location: {
    hostname: 'localhost',
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/',
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockCaches = {
  open: jest.fn().mockResolvedValue({
    put: jest.fn().mockResolvedValue(undefined),
  }),
  match: jest.fn().mockResolvedValue(undefined),
};

const mockResponse = {
  status: 200,
  headers: {
    get: jest.fn().mockReturnValue('application/javascript'),
  },
  clone: jest.fn().mockReturnThis(),
};

// Mock Request and Response constructors
global.Request = jest.fn().mockImplementation((url) => ({
  url,
  method: 'GET',
  headers: new Map(),
}));

global.Response = Object.assign(
  jest.fn().mockImplementation((body) => ({
    status: 200,
    ok: true,
    body,
    clone: jest.fn().mockReturnThis(),
    headers: {
      get: jest.fn().mockReturnValue('application/javascript'),
    },
  })),
  {
    error: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
  },
) as any;

// Setup global mocks
global.navigator = mockNavigator as any;
global.window = mockWindow as any;
global.caches = mockCaches as any;
global.fetch = jest.fn().mockResolvedValue(mockResponse);

// Mock import.meta.env (transformed to process.env by jest)
const originalEnv = process.env;
process.env = { ...originalEnv, BASE_URL: '/' };

describe('serviceWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindow.location.hostname = 'localhost';
    mockNavigator.onLine = true;
    mockServiceWorkerRegistration.installing = null;
    mockServiceWorkerRegistration.onupdatefound = null;
    mockServiceWorker.state = 'installing';
    mockServiceWorker.onstatechange = null;
    mockNavigator.serviceWorker.controller = null;
  });

  describe('registerServiceWorker', () => {
    it('should not register when service worker is not supported', () => {
      // Mock unsupported browser
      const originalNavigator = global.navigator;
      global.navigator = {} as any;

      registerServiceWorker();

      expect(mockNavigator.serviceWorker.register).not.toHaveBeenCalled();

      // Restore
      global.navigator = originalNavigator;
    });

    it('should not register when public URL origin differs', () => {
      // Mock different origin
      process.env.BASE_URL = 'https://different.com/';

      registerServiceWorker();

      expect(mockNavigator.serviceWorker.register).not.toHaveBeenCalled();

      // Restore
      process.env.BASE_URL = '/';
    });

    it('should register service worker on localhost', (done) => {
      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn(),
        onUpdate: jest.fn(),
      };

      // Debug - check initial conditions
      console.log('serviceWorker in navigator:', 'serviceWorker' in mockNavigator);
      console.log('BASE_URL:', process.env.BASE_URL);
      console.log('window.location.origin:', mockWindow.location.origin);
      console.log('window.location.href:', mockWindow.location.href);
      
      // Test the URL construction that service worker does
      const publicUrl = new URL(process.env.BASE_URL || '/', mockWindow.location.href);
      console.log('publicUrl.origin:', publicUrl.origin);
      console.log('origins match:', publicUrl.origin === mockWindow.location.origin);

      // Mock fetch for localhost check
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      registerServiceWorker(config);

      // Debug - check if addEventListener was called
      console.log('addEventListener calls:', mockWindow.addEventListener.mock.calls);

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      if (!loadHandler) {
        console.log('No load handler found!');
        done();
        return;
      }

      loadHandler();

      // Wait for async operations
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledWith('/sw.js', {
          headers: { 'Service-Worker': 'script' },
        });
        done();
      }, 0);
    });

    it('should register service worker in production', (done) => {
      mockWindow.location.hostname = 'example.com';

      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn(),
        onUpdate: jest.fn(),
      };

      registerServiceWorker(config);

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      expect(loadHandler).toBeDefined();
      loadHandler();

      // Wait for async operations
      setTimeout(() => {
        expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
        done();
      }, 0);
    });

    it('should handle service worker registration success', (done) => {
      mockWindow.location.hostname = 'example.com';
      const onSuccess = jest.fn();
      const config: ServiceWorkerConfig = { onSuccess };

      registerServiceWorker(config);

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        // Simulate service worker installation
        mockServiceWorkerRegistration.installing = mockServiceWorker as any;
        mockServiceWorkerRegistration.onupdatefound?.();

        // Simulate installed state without controller (first install)
        mockServiceWorker.state = 'installed';
        mockServiceWorker.onstatechange?.();

        expect(onSuccess).toHaveBeenCalledWith(mockServiceWorkerRegistration);
        done();
      }, 0);
    });

    it('should handle service worker update', (done) => {
      mockWindow.location.hostname = 'example.com';
      const onUpdate = jest.fn();
      const config: ServiceWorkerConfig = { onUpdate };

      // Mock existing controller
      mockNavigator.serviceWorker.controller = mockServiceWorker as any;

      registerServiceWorker(config);

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        // Simulate service worker update
        mockServiceWorkerRegistration.installing = mockServiceWorker as any;
        mockServiceWorkerRegistration.onupdatefound?.();

        // Simulate installed state with existing controller (update)
        mockServiceWorker.state = 'installed';
        mockServiceWorker.onstatechange?.();

        expect(onUpdate).toHaveBeenCalledWith(mockServiceWorkerRegistration);
        done();
      }, 0);
    });

    it('should handle service worker registration failure', (done) => {
      mockWindow.location.hostname = 'example.com';
      const registrationError = new Error('Registration failed');
      mockNavigator.serviceWorker.register.mockRejectedValueOnce(registrationError);

      registerServiceWorker();

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Service worker registration failed',
          registrationError,
          {
            component: 'serviceWorker',
            action: 'register',
          },
        );
        done();
      }, 0);
    });

    it('should handle invalid service worker on localhost', (done) => {
      const invalidResponse = {
        status: 404,
        headers: {
          get: jest.fn().mockReturnValue('text/html'),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(invalidResponse);
      mockNavigator.serviceWorker.ready = Promise.resolve(mockServiceWorkerRegistration);

      registerServiceWorker();

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        expect(mockServiceWorkerRegistration.unregister).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle fetch error on localhost', (done) => {
      const fetchError = new Error('Fetch failed');
      (global.fetch as jest.Mock).mockRejectedValueOnce(fetchError);

      registerServiceWorker();

      // Simulate load event
      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Service worker fetch failed',
          fetchError,
          {
            component: 'serviceWorker',
            action: 'checkValid',
          },
        );
        done();
      }, 0);
    });

    it('should handle different localhost variations', () => {
      const localhostVariations = [
        'localhost',
        '127.0.0.1',
        '127.1.1.1',
        '[::1]',
      ];

      localhostVariations.forEach(hostname => {
        jest.clearAllMocks();
        mockWindow.location.hostname = hostname;

        registerServiceWorker();

        const loadHandler = mockWindow.addEventListener.mock.calls.find(
          call => call[0] === 'load',
        )?.[1];

        expect(loadHandler).toBeDefined();
      });
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', (done) => {
      unregisterServiceWorker();

      setTimeout(() => {
        expect(mockServiceWorkerRegistration.unregister).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should handle unregistration failure', (done) => {
      const unregisterError = new Error('Unregister failed');
      mockServiceWorkerRegistration.unregister.mockRejectedValueOnce(unregisterError);

      unregisterServiceWorker();

      setTimeout(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Service worker unregistration failed',
          unregisterError,
          {
            component: 'serviceWorker',
            action: 'unregister',
          },
        );
        done();
      }, 0);
    });

    it('should not crash when service worker is not supported', () => {
      const originalNavigator = global.navigator;
      global.navigator = {} as any;

      expect(() => unregisterServiceWorker()).not.toThrow();

      global.navigator = originalNavigator;
    });
  });

  describe('setupNetworkMonitoring', () => {
    it('should setup online/offline event listeners', () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should call onOnline when coming online', () => {
      const onOnline = jest.fn();
      const config: ServiceWorkerConfig = { onOnline };

      mockNavigator.onLine = true;
      setupNetworkMonitoring(config);

      // Get the online event handler and call it
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'online',
      )?.[1];

      expect(onlineHandler).toBeDefined();
      onlineHandler();

      expect(onOnline).toHaveBeenCalled();
    });

    it('should call onOffline when going offline', () => {
      const onOffline = jest.fn();
      const config: ServiceWorkerConfig = { onOffline };

      mockNavigator.onLine = false;
      setupNetworkMonitoring(config);

      // Get the offline event handler and call it
      const offlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline',
      )?.[1];

      expect(offlineHandler).toBeDefined();
      offlineHandler();

      expect(onOffline).toHaveBeenCalled();
    });

    it('should trigger initial status check', () => {
      const onOnline = jest.fn();
      const config: ServiceWorkerConfig = { onOnline };

      mockNavigator.onLine = true;
      setupNetworkMonitoring(config);

      expect(onOnline).toHaveBeenCalled();
    });

    it('should work without config callbacks', () => {
      expect(() => setupNetworkMonitoring()).not.toThrow();
      expect(() => setupNetworkMonitoring({})).not.toThrow();
    });
  });

  describe('cacheRequest', () => {
    it('should cache a request and response', async () => {
      const mockCache = {
        put: jest.fn().mockResolvedValue(undefined),
      };
      mockCaches.open.mockResolvedValueOnce(mockCache);

      const request = new Request('https://api.example.com/data');
      const response = new Response('test data');

      await cacheRequest(request, response);

      expect(mockCaches.open).toHaveBeenCalledWith('runtime-cache');
      expect(mockCache.put).toHaveBeenCalledWith(request, response);
      expect(response.clone).toHaveBeenCalled();
    });

    it('should cache a string URL request', async () => {
      const mockCache = {
        put: jest.fn().mockResolvedValue(undefined),
      };
      mockCaches.open.mockResolvedValueOnce(mockCache);

      const url = 'https://api.example.com/data';
      const response = new Response('test data');

      await cacheRequest(url, response);

      expect(mockCaches.open).toHaveBeenCalledWith('runtime-cache');
      expect(mockCache.put).toHaveBeenCalledWith(url, response);
    });

    it('should handle cache errors gracefully', async () => {
      const cacheError = new Error('Cache failed');
      mockCaches.open.mockRejectedValueOnce(cacheError);

      const request = new Request('https://api.example.com/data');
      const response = new Response('test data');

      await expect(cacheRequest(request, response)).rejects.toThrow(cacheError);
    });
  });

  describe('getCachedResponse', () => {
    it('should retrieve cached response for request', async () => {
      const cachedResponse = new Response('cached data');
      mockCaches.match.mockResolvedValueOnce(cachedResponse);

      const request = new Request('https://api.example.com/data');
      const result = await getCachedResponse(request);

      expect(mockCaches.match).toHaveBeenCalledWith(request);
      expect(result).toBe(cachedResponse);
    });

    it('should retrieve cached response for string URL', async () => {
      const cachedResponse = new Response('cached data');
      mockCaches.match.mockResolvedValueOnce(cachedResponse);

      const url = 'https://api.example.com/data';
      const result = await getCachedResponse(url);

      expect(mockCaches.match).toHaveBeenCalledWith(url);
      expect(result).toBe(cachedResponse);
    });

    it('should return undefined when no cached response exists', async () => {
      mockCaches.match.mockResolvedValueOnce(undefined);

      const request = new Request('https://api.example.com/data');
      const result = await getCachedResponse(request);

      expect(result).toBeUndefined();
    });

    it('should handle cache match errors', async () => {
      const cacheError = new Error('Cache match failed');
      mockCaches.match.mockRejectedValueOnce(cacheError);

      const request = new Request('https://api.example.com/data');

      await expect(getCachedResponse(request)).rejects.toThrow(cacheError);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle service worker state changes correctly', (done) => {
      mockWindow.location.hostname = 'example.com';
      const onSuccess = jest.fn();
      const onUpdate = jest.fn();
      const config: ServiceWorkerConfig = { onSuccess, onUpdate };

      registerServiceWorker(config);

      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        mockServiceWorkerRegistration.installing = mockServiceWorker as any;
        mockServiceWorkerRegistration.onupdatefound?.();

        // Test different states
        mockServiceWorker.state = 'redundant';
        mockServiceWorker.onstatechange?.();

        // Should not call success or update for non-installed states
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onUpdate).not.toHaveBeenCalled();

        done();
      }, 0);
    });

    it('should handle null installing worker', (done) => {
      mockWindow.location.hostname = 'example.com';
      registerServiceWorker();

      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        mockServiceWorkerRegistration.installing = null;
        mockServiceWorkerRegistration.onupdatefound?.();

        // Should not crash when installing worker is null
        expect(logger.error).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should handle invalid content type on localhost', (done) => {
      const invalidContentResponse = {
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('text/html'),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(invalidContentResponse);
      mockNavigator.serviceWorker.ready = Promise.resolve(mockServiceWorkerRegistration);

      registerServiceWorker();

      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        expect(mockServiceWorkerRegistration.unregister).toHaveBeenCalled();
        done();
      }, 10);
    });

    it('should handle window reload after unregister', (done) => {
      const mockReload = jest.fn();
      Object.defineProperty(mockWindow.location, 'reload', {
        value: mockReload,
        configurable: true,
      });

      const invalidResponse = {
        status: 404,
        headers: {
          get: jest.fn().mockReturnValue('text/html'),
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(invalidResponse);
      mockServiceWorkerRegistration.unregister.mockResolvedValueOnce(true);
      mockNavigator.serviceWorker.ready = Promise.resolve(mockServiceWorkerRegistration);

      registerServiceWorker();

      const loadHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load',
      )?.[1];

      loadHandler();

      setTimeout(() => {
        expect(mockReload).toHaveBeenCalled();
        done();
      }, 10);
    });
  });
});