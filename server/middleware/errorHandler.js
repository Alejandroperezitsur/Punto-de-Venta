const { logger } = require('../logger');

/**
 * Global Error Handler Middleware
 * Centralizes error handling for the entire application
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const isServerErr = statusCode >= 500;

  // Utilize the request logger if available for context
  const log = req.log || logger;

  if (isServerErr) {
    log.error({
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code
      },
      url: req.originalUrl
    }, 'Server Error');
  } else {
    log.warn({
      err: { message: err.message, code: err.code },
      url: req.originalUrl
    }, 'Client Error');
  }

  // Response structure
  const response = {
    error: isServerErr ? 'Error interno del servidor' : err.message,
    code: err.code || (isServerErr ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
  };

  // Include validation errors if present
  if (err.errors) {
    response.details = err.errors;
  }

  // Debug info in dev
  if (process.env.NODE_ENV !== 'production' && isServerErr) {
    response.debug_message = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Recurso no encontrado',
    code: 'NOT_FOUND',
    path: req.path
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
