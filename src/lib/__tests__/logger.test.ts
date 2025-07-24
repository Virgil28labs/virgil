import { logger, logError, logInfo, logDebug } from '../logger';

// Mock console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

describe('Logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock Date for consistent timestamps
    dateNowSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:00.000Z');
    
    // Reset import.meta.env
    Object.defineProperty(import.meta.env, 'DEV', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(import.meta.env, 'MODE', {
      value: 'development',
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    dateNowSpy.mockRestore();
  });

  afterAll(() => {
    // Restore console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      Object.defineProperty(import.meta.env, 'DEV', { value: true });
      Object.defineProperty(import.meta.env, 'MODE', { value: 'development' });
    });

    describe('debug', () => {
      it('logs debug messages with proper format', () => {
        logger.debug('Debug message');
        
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [DEBUG] Debug message',
          ''
        );
      });

      it('logs debug with context', () => {
        logger.debug('Debug message', {
          component: 'TestComponent',
          action: 'testAction',
          metadata: { key: 'value' },
        });
        
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [DEBUG] [TestComponent:testAction] Debug message',
          { key: 'value' }
        );
      });

      it('logs debug with component only', () => {
        logger.debug('Debug message', { component: 'TestComponent' });
        
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [DEBUG] [TestComponent] Debug message',
          ''
        );
      });
    });

    describe('info', () => {
      it('logs info messages', () => {
        logger.info('Info message');
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [INFO] Info message',
          ''
        );
      });

      it('logs info with metadata', () => {
        logger.info('Info message', {
          metadata: { count: 42, status: 'active' },
        });
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [INFO] Info message',
          { count: 42, status: 'active' }
        );
      });
    });

    describe('warn', () => {
      it('logs warning messages', () => {
        logger.warn('Warning message');
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [WARN] Warning message',
          ''
        );
      });

      it('logs warning with full context', () => {
        logger.warn('Warning message', {
          component: 'ApiService',
          action: 'fetchData',
          metadata: { retries: 3 },
        });
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [WARN] [ApiService:fetchData] Warning message',
          { retries: 3 }
        );
      });
    });

    describe('error', () => {
      it('logs error messages without Error object', () => {
        logger.error('Error message');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] Error message',
          ''
        );
      });

      it('logs error with Error object', () => {
        const error = new Error('Test error');
        logger.error('Error occurred', error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] Error occurred',
          error
        );
      });

      it('logs error with Error object and context', () => {
        const error = new Error('Test error');
        logger.error('Error occurred', error, {
          component: 'Database',
          action: 'connect',
          metadata: { attempts: 5 },
        });
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] [Database:connect] Error occurred',
          error
        );
      });

      it('prefers error object over metadata when both provided', () => {
        const error = new Error('Test error');
        logger.error('Error occurred', error, {
          metadata: { ignored: true },
        });
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] Error occurred',
          error
        );
      });
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      Object.defineProperty(import.meta.env, 'DEV', { value: false });
      Object.defineProperty(import.meta.env, 'MODE', { value: 'production' });
      // Need to create a new logger instance to pick up the env changes
      jest.resetModules();
    });

    it('does not log debug messages in production', () => {
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('does not log info messages in production', () => {
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('logs warn messages in production', () => {
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('logs error messages in production', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Test Mode', () => {
    beforeEach(() => {
      Object.defineProperty(import.meta.env, 'MODE', { value: 'test' });
      jest.resetModules();
    });

    it('does not log any messages in test mode', () => {
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      Object.defineProperty(import.meta.env, 'DEV', { value: true });
      Object.defineProperty(import.meta.env, 'MODE', { value: 'development' });
    });

    describe('logError', () => {
      it('logs error with structured format', () => {
        const error = new Error('Test error');
        logError('UserService', 'login', error, { userId: '123' });
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] [UserService:login] login failed',
          error
        );
      });

      it('works without additional info', () => {
        const error = new Error('Test error');
        logError('UserService', 'login', error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [ERROR] [UserService:login] login failed',
          error
        );
      });
    });

    describe('logInfo', () => {
      it('logs info with structured format', () => {
        logInfo('PaymentService', 'processPayment', { amount: 100, currency: 'USD' });
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [INFO] [PaymentService:processPayment] processPayment completed',
          { amount: 100, currency: 'USD' }
        );
      });

      it('works without metadata', () => {
        logInfo('PaymentService', 'processPayment');
        
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [INFO] [PaymentService:processPayment] processPayment completed',
          undefined
        );
      });
    });

    describe('logDebug', () => {
      it('logs debug with structured format', () => {
        logDebug('CacheService', 'checkCache', { key: 'user:123', hit: true });
        
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          '[2024-01-15T10:30:00.000Z] [DEBUG] [CacheService:checkCache] checkCache initiated',
          { key: 'user:123', hit: true }
        );
      });
    });
  });

  describe('Message Formatting', () => {
    it('handles empty context gracefully', () => {
      logger.info('Message', {});
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] [INFO] [App] Message',
        ''
      );
    });

    it('uses App as default component', () => {
      logger.info('Message', { action: 'test' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] [INFO] [App:test] Message',
        ''
      );
    });

    it('handles undefined metadata', () => {
      logger.info('Message', { component: 'Test', metadata: undefined });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[2024-01-15T10:30:00.000Z] [INFO] [Test] Message',
        ''
      );
    });
  });
});