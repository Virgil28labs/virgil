// Set up process.env for compatibility
process.env.NODE_ENV = 'test';

// Mock import.meta for Vite environment variables before any imports
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-key',
        VITE_LLM_API_URL: 'http://localhost:5002/api/v1',
        VITE_DOG_API_URL: 'https://dog.ceo/api/breeds/image/random',
        VITE_DOG_DOCS_URL: 'https://dog.ceo/dog-api/',
        VITE_GOOGLE_MAPS_API_KEY: 'test-google-maps-key',
        BASE_URL: '/',
        PROD: false,
      },
    },
  },
  writable: true,
  configurable: true,
});

// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [0];
  
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock as Storage;

// Mock navigator.geolocation
const geolocationMock = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: geolocationMock,
  writable: true,
});

// Mock crypto.getRandomValues (needed for Supabase)
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {}, // Mock subtle crypto API if needed
  },
});

// Mock TextEncoder/TextDecoder for streaming tests
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(input: string): Uint8Array {
      const encoded = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        encoded[i] = input.charCodeAt(i);
      }
      return encoded;
    }
  } as typeof TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(input: Uint8Array): string {
      return String.fromCharCode(...Array.from(input));
    }
  } as typeof TextDecoder;
}

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clear all mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Suppress specific React 18 warnings in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('ReactDOM.createRoot')) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});