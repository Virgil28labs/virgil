/**
 * Centralized logging utility for Virgil
 * Provides consistent logging across the application with environment awareness
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isTest = import.meta.env.MODE === 'test';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context.component || 'App'}${context.action ? `:${context.action}` : ''}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    // Don't log in test environment unless explicitly needed
    if (this.isTest) return;

    const formattedMessage = this.formatMessage(level, message, context);

    // In development, use console methods
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, context?.metadata || '');
          break;
        case 'info':
          console.info(formattedMessage, context?.metadata || '');
          break;
        case 'warn':
          console.warn(formattedMessage, context?.metadata || '');
          break;
        case 'error':
          console.error(formattedMessage, error || context?.metadata || '');
          break;
      }
    } else {
      // In production, you could send to a logging service
      // For now, only log warnings and errors
      if (level === 'warn' || level === 'error') {
        console[level](formattedMessage, error || context?.metadata || '');
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();

// Convenience exports for common logging patterns
export const logError = (component: string, action: string, error: Error, additionalInfo?: Record<string, any>) => {
  logger.error(`${action} failed`, error, {
    component,
    action,
    metadata: additionalInfo
  });
};

export const logInfo = (component: string, action: string, metadata?: Record<string, any>) => {
  logger.info(`${action} completed`, {
    component,
    action,
    metadata
  });
};

export const logDebug = (component: string, action: string, metadata?: Record<string, any>) => {
  logger.debug(`${action} initiated`, {
    component,
    action,
    metadata
  });
};