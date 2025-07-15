// Set test environment
process.env.NODE_ENV = 'test';

// Set test environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.PORT = '5003'; // Different port for tests to avoid conflicts

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    // Filter out expected errors from tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error:') || args[0].includes('Warning:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    // Filter out expected warnings
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
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
});

// Increase timeout for API tests
jest.setTimeout(10000);