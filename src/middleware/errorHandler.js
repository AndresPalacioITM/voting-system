/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers and returns a structured JSON response.
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // SQLite UNIQUE constraint violation
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'A record with that value already exists.',
    });
  }

  // SQLite FOREIGN KEY violation
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced record does not exist.',
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: err.message || 'An unexpected error occurred.',
  });
}

module.exports = errorHandler;
