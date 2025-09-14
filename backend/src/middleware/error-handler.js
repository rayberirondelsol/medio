const logger = require('../utils/logger');

// Sanitize error messages to prevent information leakage
const sanitizeErrorMessage = (error, isDevelopment) => {
  // Database errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  if (error.code === '23505') { // PostgreSQL unique violation
    return 'This record already exists.';
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return 'Related record not found.';
  }
  
  if (error.code === '22P02') { // PostgreSQL invalid input syntax
    return 'Invalid input format.';
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return 'Invalid authentication token.';
  }
  
  if (error.name === 'TokenExpiredError') {
    return 'Authentication token has expired.';
  }
  
  // Validation errors (from express-validator)
  if (error.type === 'validation') {
    return error.message; // These are already sanitized
  }
  
  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return 'File size exceeds the maximum allowed limit.';
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Unexpected file field in upload.';
  }
  
  // Network errors
  if (error.code === 'ETIMEDOUT') {
    return 'Request timeout. Please try again.';
  }
  
  // Permission errors
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return 'Permission denied.';
  }
  
  // In development, return the actual error message for debugging
  if (isDevelopment) {
    return error.message || 'An unexpected error occurred.';
  }
  
  // In production, return generic message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  // Default to 500 server error
  let status = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError' || err.type === 'validation') {
    status = 400;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
  } else if (err.name === 'ForbiddenError') {
    status = 403;
  } else if (err.name === 'NotFoundError') {
    status = 404;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
  } else if (err.code === 'EBADCSRFTOKEN') {
    status = 403;
  }
  
  // Prepare error response
  const errorResponse = {
    error: {
      message: sanitizeErrorMessage(err, isDevelopment),
      status: status,
      timestamp: new Date().toISOString()
    }
  };
  
  // Add additional debug info in development
  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.code = err.code;
    errorResponse.error.type = err.type || err.name;
  }
  
  // Add request ID if available
  if (req.id) {
    errorResponse.error.requestId = req.id;
  }
  
  // Send response
  res.status(status).json(errorResponse);
};

// Not found handler (404)
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: 'The requested resource was not found.',
      status: 404,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
};

// Async error wrapper to catch promise rejections
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.type = 'validation';
    this.status = 400;
    this.errors = errors;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  sanitizeErrorMessage,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError
};