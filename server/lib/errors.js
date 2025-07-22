// Unified error handling for server

class AppError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

class NetworkError extends AppError {
  constructor(message, details = null) {
    super(message, 'NETWORK_ERROR', 503, details);
    this.name = 'NetworkError';
  }
}

class AuthError extends AppError {
  constructor(message, details = null) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

class NotFoundError extends AppError {
  constructor(message, details = null) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends AppError {
  constructor(message, details = null) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
function errorHandler(err, req, res) {
  let error = err;

  // Convert non-AppError instances
  if (!(error instanceof AppError)) {
    const message = error.message || 'Internal server error';
    error = new AppError(message, 'INTERNAL_ERROR', 500);
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error({
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      details: error.details,
    });
  }

  // Send error response
  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    },
  });
}

// Async handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  NetworkError,
  AuthError,
  NotFoundError,
  RateLimitError,
  errorHandler,
  asyncHandler,
};
