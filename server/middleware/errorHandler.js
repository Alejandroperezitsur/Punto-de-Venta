/**
 * Global Error Handler Middleware
 * Centralizes error handling for the entire application
 */

function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.error(`  Message: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(`  Stack: ${err.stack}`);
  }

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Prepare response
  const response = {
    error: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR',
  };

  // Include validation errors if present
  if (err.errors) {
    response.details = err.errors;
  }

  // Include stack in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Not Found Handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Recurso no encontrado',
    code: 'NOT_FOUND',
    path: req.path
  });
}

/**
 * Async handler wrapper to catch async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, notFoundHandler, asyncHandler };
