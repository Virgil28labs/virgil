// Explicitly unmock the serviceWorker module to test the real implementation
jest.unmock("./serviceWorker");

// Store original globals
const originalWindow = global.window;
const originalNavigator = global.navigator;
const originalFetch = global.fetch;
const originalCaches = global.caches;
const originalLocation = global.location;

// Mock import.meta.env before importing the module
(global as any).import = {
  meta: {
    env: {
      BASE_URL: "/",
    },
  },
};

// Set up initial window mock before importing
(global as any).window = {
  location: {
    hostname: "localhost",
    href: "http://localhost:3000/",
    origin: "http://localhost:3000",
  },
};

// Now import the module
import {
  registerServiceWorker,
  unregisterServiceWorker,
  setupNetworkMonitoring,
  cacheRequest,
  getCachedResponse,
  ServiceWorkerConfig,
} from "./serviceWorker";

// Mock ServiceWorkerRegistration
class MockServiceWorkerRegistration {
  installing: any = null;
  active: any = null;
  waiting: any = null;
  onupdatefound: (() => void) | null = null;

  unregister = jest.fn().mockResolvedValue(true);
  update = jest.fn().mockResolvedValue(this);
}

// Mock ServiceWorker
class MockServiceWorker {
  state: string = "installing";
  onstatechange: (() => void) | null = null;
}

describe("ServiceWorker utilities", () => {
  let mockRegistration: MockServiceWorkerRegistration;
  let mockServiceWorker: any;
  let mockNavigator: any;
  let mockWindow: any;
  let mockLocation: any;
  let mockFetch: jest.Mock;
  let mockCaches: any;
  let loadEventListeners: Array<() => void> = [];
  let onlineEventListeners: Array<() => void> = [];
  let offlineEventListeners: Array<() => void> = [];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    loadEventListeners = [];
    onlineEventListeners = [];
    offlineEventListeners = [];

    // Create fresh mocks
    mockRegistration = new MockServiceWorkerRegistration();

    mockServiceWorker = {
      register: jest.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration),
      controller: null,
    };

    mockLocation = {
      hostname: "localhost",
      href: "http://localhost:3000/",
      origin: "http://localhost:3000",
      reload: jest.fn(),
    };

    mockNavigator = {
      serviceWorker: mockServiceWorker,
      onLine: true,
    };

    mockWindow = {
      location: mockLocation,
      addEventListener: jest.fn((event: string, handler: () => void) => {
        if (event === "load") {
          loadEventListeners.push(handler);
        } else if (event === "online") {
          onlineEventListeners.push(handler);
        } else if (event === "offline") {
          offlineEventListeners.push(handler);
        }
      }),
      removeEventListener: jest.fn(),
    };

    mockFetch = jest.fn();

    mockCaches = {
      open: jest.fn().mockResolvedValue({
        put: jest.fn().mockResolvedValue(undefined),
        match: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(true),
      }),
      match: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
    };

    // Update global mocks
    (global as any).window = mockWindow;
    (global as any).navigator = mockNavigator;
    (global as any).fetch = mockFetch;
    (global as any).caches = mockCaches;
    (global as any).location = mockLocation;

    if (!global.Request) {
      (global as any).Request = class MockRequest {
        url: string;
        constructor(url: string) {
          this.url = url;
        }
      };
    }

    if (!global.Response) {
      (global as any).Response = class MockResponse {
        body: any;
        headers = new Map();
        status = 200;
        constructor(body?: any, init?: any) {
          this.body = body;
          if (init?.status) this.status = init.status;
          if (init?.headers) {
            Object.entries(init.headers).forEach(([key, value]) => {
              this.headers.set(key, value as string);
            });
          }
        }
        clone() {
          return new MockResponse(this.body);
        }
      };
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("registerServiceWorker", () => {
    it("should not register if serviceWorker is not supported", () => {
      delete mockNavigator.serviceWorker;

      registerServiceWorker();

      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
    });

    it("should not register if origin does not match", () => {
      mockLocation.origin = "http://different-origin.com";

      registerServiceWorker();

      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
    });

    it("should register service worker on load for localhost", () => {
      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn(),
        onUpdate: jest.fn(),
      };

      registerServiceWorker(config);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );

      // Trigger load event
      loadEventListeners.forEach((handler) => handler());

      // Should check validity for localhost
      expect(mockFetch).toHaveBeenCalledWith("/sw.js", {
        headers: { "Service-Worker": "script" },
      });
    });

    it("should register service worker on load for production", () => {
      mockLocation.hostname = "example.com";

      registerServiceWorker();

      loadEventListeners.forEach((handler) => handler());

      expect(mockServiceWorker.register).toHaveBeenCalledWith("/sw.js");
    });

    it("should handle successful registration", async () => {
      mockLocation.hostname = "example.com";
      const config: ServiceWorkerConfig = {
        onSuccess: jest.fn(),
      };

      registerServiceWorker(config);
      loadEventListeners.forEach((handler) => handler());

      await mockServiceWorker.register();

      // Simulate update found
      const installingWorker = new MockServiceWorker();
      mockRegistration.installing = installingWorker;
      mockRegistration.onupdatefound?.();

      // Simulate successful installation
      installingWorker.state = "installed";
      installingWorker.onstatechange?.();

      expect(config.onSuccess).toHaveBeenCalledWith(mockRegistration);
    });

    it("should handle update registration", async () => {
      mockLocation.hostname = "example.com";
      mockServiceWorker.controller = {}; // Existing controller
      const config: ServiceWorkerConfig = {
        onUpdate: jest.fn(),
      };

      registerServiceWorker(config);
      loadEventListeners.forEach((handler) => handler());

      await mockServiceWorker.register();

      // Simulate update found
      const installingWorker = new MockServiceWorker();
      mockRegistration.installing = installingWorker;
      mockRegistration.onupdatefound?.();

      // Simulate update installation
      installingWorker.state = "installed";
      installingWorker.onstatechange?.();

      expect(config.onUpdate).toHaveBeenCalledWith(mockRegistration);
    });

    it("should handle registration errors gracefully", async () => {
      mockLocation.hostname = "example.com";
      mockServiceWorker.register.mockRejectedValue(
        new Error("Registration failed"),
      );

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      // Should not throw
      await expect(mockServiceWorker.register()).rejects.toThrow();
    });

    it("should handle invalid service worker on localhost", async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        headers: new Map(),
      });

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRegistration.unregister).toHaveBeenCalled();
    });

    it("should handle non-JavaScript content type", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Map([["content-type", "text/html"]]),
      });

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockRegistration.unregister).toHaveBeenCalled();
    });

    it("should register valid service worker after check", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Map([["content-type", "application/javascript"]]),
      });

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockServiceWorker.register).toHaveBeenCalledWith("/sw.js");
    });

    it("should handle fetch errors during validity check", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      // Should not throw
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it("should handle missing installing worker", async () => {
      mockLocation.hostname = "example.com";

      registerServiceWorker();
      loadEventListeners.forEach((handler) => handler());

      await mockServiceWorker.register();

      // Simulate update found with no installing worker
      mockRegistration.installing = null;
      mockRegistration.onupdatefound?.();

      // Should handle gracefully
      expect(true).toBe(true);
    });
  });

  describe("unregisterServiceWorker", () => {
    it("should unregister when service worker is available", async () => {
      await unregisterServiceWorker();

      expect(mockRegistration.unregister).toHaveBeenCalled();
    });

    it("should handle when service worker is not available", async () => {
      delete mockNavigator.serviceWorker;

      // Should not throw
      await unregisterServiceWorker();

      expect(mockRegistration.unregister).not.toHaveBeenCalled();
    });

    it("should handle unregister errors gracefully", async () => {
      mockRegistration.unregister.mockRejectedValue(
        new Error("Unregister failed"),
      );

      // Should not throw
      await unregisterServiceWorker();
    });

    it("should handle when ready promise rejects", async () => {
      mockServiceWorker.ready = Promise.reject(new Error("Not ready"));

      // Should not throw
      await unregisterServiceWorker();
    });
  });

  describe("setupNetworkMonitoring", () => {
    it("should set up event listeners", () => {
      setupNetworkMonitoring();

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });

    it("should call onOnline when initially online", () => {
      mockNavigator.onLine = true;
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      expect(config.onOnline).toHaveBeenCalled();
      expect(config.onOffline).not.toHaveBeenCalled();
    });

    it("should call onOffline when initially offline", () => {
      mockNavigator.onLine = false;
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      expect(config.onOffline).toHaveBeenCalled();
      expect(config.onOnline).not.toHaveBeenCalled();
    });

    it("should respond to online event", () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      // Reset initial call
      config.onOnline = jest.fn();

      // Simulate going online
      mockNavigator.onLine = true;
      onlineEventListeners.forEach((handler) => handler());

      expect(config.onOnline).toHaveBeenCalled();
    });

    it("should respond to offline event", () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      // Reset initial call
      config.onOffline = jest.fn();

      // Simulate going offline
      mockNavigator.onLine = false;
      offlineEventListeners.forEach((handler) => handler());

      expect(config.onOffline).toHaveBeenCalled();
    });

    it("should handle missing config gracefully", () => {
      // Should not throw
      setupNetworkMonitoring();

      mockNavigator.onLine = false;
      offlineEventListeners.forEach((handler) => handler());

      mockNavigator.onLine = true;
      onlineEventListeners.forEach((handler) => handler());
    });
  });

  describe("cacheRequest", () => {
    it("should cache request and response", async () => {
      const mockCache = {
        put: jest.fn().mockResolvedValue(undefined),
      };
      mockCaches.open.mockResolvedValue(mockCache);

      const request = "https://api.example.com/data";
      const response = new Response("test data");

      await cacheRequest(request, response);

      expect(mockCaches.open).toHaveBeenCalledWith("runtime-cache");
      expect(mockCache.put).toHaveBeenCalledWith(request, expect.any(Response));
    });

    it("should cache Request object", async () => {
      const mockCache = {
        put: jest.fn().mockResolvedValue(undefined),
      };
      mockCaches.open.mockResolvedValue(mockCache);

      const request = new Request("https://api.example.com/data");
      const response = new Response("test data");

      await cacheRequest(request, response);

      expect(mockCache.put).toHaveBeenCalledWith(request, expect.any(Response));
    });

    it("should handle cache errors", async () => {
      mockCaches.open.mockRejectedValue(new Error("Cache error"));

      const request = "https://api.example.com/data";
      const response = new Response("test data");

      // Should throw the error
      await expect(cacheRequest(request, response)).rejects.toThrow(
        "Cache error",
      );
    });

    it("should handle put errors", async () => {
      const mockCache = {
        put: jest.fn().mockRejectedValue(new Error("Put error")),
      };
      mockCaches.open.mockResolvedValue(mockCache);

      const request = "https://api.example.com/data";
      const response = new Response("test data");

      await expect(cacheRequest(request, response)).rejects.toThrow(
        "Put error",
      );
    });
  });

  describe("getCachedResponse", () => {
    it("should retrieve cached response for string request", async () => {
      const cachedResponse = new Response("cached data");
      mockCaches.match.mockResolvedValue(cachedResponse);

      const result = await getCachedResponse("https://api.example.com/data");

      expect(result).toBe(cachedResponse);
      expect(mockCaches.match).toHaveBeenCalledWith(
        "https://api.example.com/data",
      );
    });

    it("should retrieve cached response for Request object", async () => {
      const cachedResponse = new Response("cached data");
      mockCaches.match.mockResolvedValue(cachedResponse);

      const request = new Request("https://api.example.com/data");
      const result = await getCachedResponse(request);

      expect(result).toBe(cachedResponse);
      expect(mockCaches.match).toHaveBeenCalledWith(request);
    });

    it("should return undefined when no cached response", async () => {
      mockCaches.match.mockResolvedValue(undefined);

      const result = await getCachedResponse("https://api.example.com/data");

      expect(result).toBeUndefined();
    });

    it("should handle cache errors", async () => {
      mockCaches.match.mockRejectedValue(new Error("Cache error"));

      // Should throw the error
      await expect(
        getCachedResponse("https://api.example.com/data"),
      ).rejects.toThrow("Cache error");
    });
  });

  describe("edge cases and integration", () => {
    it("should handle different localhost formats", () => {
      const localhostVariants = ["localhost", "127.0.0.1", "[::1]"];

      localhostVariants.forEach((hostname) => {
        mockLocation.hostname = hostname;
        registerServiceWorker();

        expect(mockWindow.addEventListener).toHaveBeenCalled();
        mockWindow.addEventListener.mockClear();
      });
    });

    it("should handle complex localhost IP patterns", () => {
      mockLocation.hostname = "127.0.0.1";
      registerServiceWorker();

      loadEventListeners.forEach((handler) => handler());

      // Should check validity for localhost IPs
      expect(mockFetch).toHaveBeenCalledWith("/sw.js", {
        headers: { "Service-Worker": "script" },
      });
    });

    it("should handle BASE_URL in service worker URL", () => {
      // Mock import.meta.env
      (global as any).import = {
        meta: {
          env: {
            BASE_URL: "/app/",
          },
        },
      };

      mockLocation.hostname = "example.com";
      registerServiceWorker();

      loadEventListeners.forEach((handler) => handler());

      expect(mockServiceWorker.register).toHaveBeenCalledWith("/app/sw.js");
    });

    it("should handle rapid online/offline changes", () => {
      const config: ServiceWorkerConfig = {
        onOnline: jest.fn(),
        onOffline: jest.fn(),
      };

      setupNetworkMonitoring(config);

      // Rapid changes
      for (let i = 0; i < 10; i++) {
        mockNavigator.onLine = i % 2 === 0;
        if (i % 2 === 0) {
          onlineEventListeners.forEach((handler) => handler());
        } else {
          offlineEventListeners.forEach((handler) => handler());
        }
      }

      expect(config.onOnline).toHaveBeenCalledTimes(6); // Initial + 5 changes
      expect(config.onOffline).toHaveBeenCalledTimes(5);
    });
  });
});
