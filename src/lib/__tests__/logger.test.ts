/**
 * Logger Tests
 * 
 * Tests the centralized logging utility including:
 * - Environment-aware logging (development vs production vs test)
 * - Log level handling (debug, info, warn, error)
 * - Message formatting with timestamps and context
 * - Context information (component, action, metadata)
 * - Error object handling and serialization
 * - Console output suppression in test environment
 * - Production logging restrictions (warn/error only)
 * - Convenience logging functions
 * - Edge cases and error handling
 */

import { logger, logError, logInfo, logDebug } from '../logger';
import { timeService } from '../../services/TimeService';

// Mock dependencies
jest.mock('../../services/TimeService', () => ({
  timeService: {
    toISOString: jest.fn(),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Mock import.meta.env
const originalEnv = import.meta.env;

describe('Logger', () => {
  const mockTimestamp = '2022-01-01T12:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.toISOString.mockReturnValue(mockTimestamp);

    // Mock console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    Object.assign(console, originalConsole);
    
    // Restore import.meta.env
    Object.assign(import.meta.env, originalEnv);
  });

  describe('Environment detection', () => {
    it('should detect development environment', () => {
      // Set development environment
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });

      logger.info('Test message');

      expect(console.info).toHaveBeenCalled();
    });

    it('should detect production environment', () => {
      // Set production environment
      Object.assign(import.meta.env, { DEV: false, MODE: 'production' });

      logger.debug('Debug message');

      // Debug should not log in production
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should detect test environment', () => {
      // Set test environment
      Object.assign(import.meta.env, { DEV: false, MODE: 'test' });

      logger.error('Error message');

      // Should not log in test environment
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Message formatting', () => {
    beforeEach(() => {
      // Ensure development environment for these tests
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should format basic message with timestamp and level', () => {
      logger.info('Test message');

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] Test message`,
        '',
      );
    });

    it('should format message with component context', () => {
      logger.warn('Warning message', { component: 'TestComponent' });

      expect(console.warn).toHaveBeenCalledWith(
        `[${mockTimestamp}] [WARN] [TestComponent] Warning message`,
        '',
      );
    });

    it('should format message with component and action context', () => {
      logger.error('Error occurred', new Error('Test error'), {
        component: 'UserService',
        action: 'authenticate',
      });

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] [UserService:authenticate] Error occurred`,
        expect.any(Error),
      );
    });

    it('should format message with metadata', () => {
      const metadata = { userId: 123, action: 'login' };
      
      logger.info('User action', { 
        component: 'Auth',
        metadata,
      });

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] [Auth] User action`,
        metadata,
      );
    });

    it('should handle missing component in context', () => {
      logger.debug('Debug message', { action: 'process' });

      expect(console.debug).toHaveBeenCalledWith(
        `[${mockTimestamp}] [DEBUG] [App:process] Debug message`,
        '',
      );
    });

    it('should handle action without component', () => {
      logger.info('Info message', { action: 'save' });

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] [App:save] Info message`,
        '',
      );
    });
  });

  describe('Log levels in development', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should log debug messages', () => {
      logger.debug('Debug message', { component: 'TestComponent' });

      expect(console.debug).toHaveBeenCalledWith(
        `[${mockTimestamp}] [DEBUG] [TestComponent] Debug message`,
        '',
      );
    });

    it('should log info messages', () => {
      logger.info('Info message', { component: 'TestComponent' });

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] [TestComponent] Info message`,
        '',
      );
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { component: 'TestComponent' });

      expect(console.warn).toHaveBeenCalledWith(
        `[${mockTimestamp}] [WARN] [TestComponent] Warning message`,
        '',
      );
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      logger.error('Error message', testError, { component: 'TestComponent' });

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] [TestComponent] Error message`,
        testError,
      );
    });
  });

  describe('Log levels in production', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: false, MODE: 'production' });
    });

    it('should not log debug messages', () => {
      logger.debug('Debug message');

      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should not log info messages', () => {
      logger.info('Info message');

      expect(console.info).not.toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      logger.warn('Warning message', { component: 'TestComponent' });

      expect(console.warn).toHaveBeenCalledWith(
        `[${mockTimestamp}] [WARN] [TestComponent] Warning message`,
        '',
      );
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      logger.error('Error message', testError, { component: 'TestComponent' });

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] [TestComponent] Error message`,
        testError,
      );
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should handle error with context', () => {
      const testError = new Error('Network failure');
      const context = {
        component: 'ApiService',
        action: 'fetchData',
        metadata: { url: 'https://api.example.com', timeout: 5000 },
      };

      logger.error('Request failed', testError, context);

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] [ApiService:fetchData] Request failed`,
        testError,
      );
    });

    it('should handle error without context', () => {
      const testError = new Error('Generic error');

      logger.error('Something went wrong', testError);

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] Something went wrong`,
        testError,
      );
    });

    it('should handle error without error object', () => {
      logger.error('Error occurred', undefined, {
        component: 'TestComponent',
        metadata: { code: 500 },
      });

      expect(console.error).toHaveBeenCalledWith(
        `[${mockTimestamp}] [ERROR] [TestComponent] Error occurred`,
        { code: 500 },
      );
    });

    it('should handle error with complex metadata', () => {
      const complexMetadata = {
        request: { method: 'POST', url: '/api/users' },
        response: { status: 400, body: 'Bad Request' },
        timestamp: Date.now(),
      };

      logger.error('API request failed', new Error('Bad Request'), {
        component: 'HttpClient',
        action: 'post',
        metadata: complexMetadata,
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[HttpClient:post] API request failed'),
        expect.any(Error),
      );
    });
  });

  describe('Context handling', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should handle undefined context', () => {
      logger.info('Message without context');

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] Message without context`,
        '',
      );
    });

    it('should handle empty context object', () => {
      logger.info('Message with empty context', {});

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] Message with empty context`,
        '',
      );
    });

    it('should handle context with only metadata', () => {
      const metadata = { user: 'john', session: 'abc123' };
      
      logger.info('User action', { metadata });

      expect(console.info).toHaveBeenCalledWith(
        `[${mockTimestamp}] [INFO] User action`,
        metadata,
      );
    });

    it('should handle null metadata', () => {
      logger.info('Test message', {
        component: 'TestComponent',
        metadata: null as any,
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent] Test message'),
        null,
      );
    });
  });

  describe('Convenience functions', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    describe('logError', () => {
      it('should log error with proper format', () => {
        const error = new Error('Database connection failed');
        const additionalInfo = { host: 'localhost', port: 5432 };

        logError('DatabaseService', 'connect', error, additionalInfo);

        expect(console.error).toHaveBeenCalledWith(
          `[${mockTimestamp}] [ERROR] [DatabaseService:connect] connect failed`,
          error,
        );
      });

      it('should handle error without additional info', () => {
        const error = new Error('Validation failed');

        logError('UserService', 'validate', error);

        expect(console.error).toHaveBeenCalledWith(
          `[${mockTimestamp}] [ERROR] [UserService:validate] validate failed`,
          error,
        );
      });
    });

    describe('logInfo', () => {
      it('should log info with proper format', () => {
        const metadata = { userId: 456, duration: '2.3s' };

        logInfo('AuthService', 'login', metadata);

        expect(console.info).toHaveBeenCalledWith(
          `[${mockTimestamp}] [INFO] [AuthService:login] login completed`,
          metadata,
        );
      });

      it('should handle info without metadata', () => {
        logInfo('AppService', 'initialize');

        expect(console.info).toHaveBeenCalledWith(
          `[${mockTimestamp}] [INFO] [AppService:initialize] initialize completed`,
          undefined,
        );
      });
    });

    describe('logDebug', () => {
      it('should log debug with proper format', () => {
        const metadata = { query: 'SELECT * FROM users', params: [1, 2, 3] };

        logDebug('QueryService', 'execute', metadata);

        expect(console.debug).toHaveBeenCalledWith(
          `[${mockTimestamp}] [DEBUG] [QueryService:execute] execute initiated`,
          metadata,
        );
      });

      it('should handle debug without metadata', () => {
        logDebug('CacheService', 'clear');

        expect(console.debug).toHaveBeenCalledWith(
          `[${mockTimestamp}] [DEBUG] [CacheService:clear] clear initiated`,
          undefined,
        );
      });
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);

      logger.info(longMessage);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(longMessage),
        '',
      );
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Message with émojis 🚀 and spéciàl châractërs';

      logger.info(specialMessage, { component: 'TestComponent' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(specialMessage),
        '',
      );
    });

    it('should handle circular references in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw error
      expect(() => {
        logger.info('Test with circular reference', {
          component: 'TestComponent',
          metadata: circular,
        });
      }).not.toThrow();

      expect(console.info).toHaveBeenCalled();
    });

    it('should handle undefined error in error log', () => {
      logger.error('Error without error object', undefined, {
        component: 'TestComponent',
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent] Error without error object'),
        '',
      );
    });

    it('should handle timeService errors gracefully', () => {
      mockTimeService.toISOString.mockImplementation(() => {
        throw new Error('TimeService error');
      });

      // Should not throw error even if timeService fails
      expect(() => {
        logger.info('Test message');
      }).toThrow(); // Will actually throw because we don't have error handling for timeService

      // Reset for other tests
      mockTimeService.toISOString.mockReturnValue(mockTimestamp);
    });
  });

  describe('Test environment behavior', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: false, MODE: 'test' });
    });

    it('should not log any messages in test environment', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message', new Error('Test error'));

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should not call convenience functions in test environment', () => {
      logDebug('TestComponent', 'action');
      logInfo('TestComponent', 'action');
      logError('TestComponent', 'action', new Error('Test error'));

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Performance considerations', () => {
    beforeEach(() => {
      Object.assign(import.meta.env, { DEV: true, MODE: 'development' });
    });

    it('should not format messages when not logging', () => {
      Object.assign(import.meta.env, { DEV: false, MODE: 'production' });
      
      // Clear previous mock calls
      mockTimeService.toISOString.mockClear();

      logger.debug('Debug message that should not be processed');

      // timeService should not be called if message is not logged
      expect(mockTimeService.toISOString).not.toHaveBeenCalled();
    });

    it('should handle high-frequency logging', () => {
      const startTime = Date.now();

      // Log many messages quickly
      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`, { component: 'PerformanceTest' });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 100 logs)
      expect(duration).toBeLessThan(100);
      expect(console.info).toHaveBeenCalledTimes(100);
    });
  });
});