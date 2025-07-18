// Simple logger utility for server
const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  log(message, ...args) {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }

  warn(message, ...args) {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  }

  error(message, ...args) {
    // Always log errors
    console.error(message, ...args);
  }

  info(message, ...args) {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }
}

module.exports = new Logger();