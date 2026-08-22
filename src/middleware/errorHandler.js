/**
 * Folder: src/middleware/
 * Description: Express middleware functions for error handling, auth, and validation.
 *
 * File: src/middleware/errorHandler.js
 * Implementation details:
 * - Centralized Express error-handling middleware (4 parameters: err, req, res, next).
 * - Catches any unhandled errors passed via next(err) from controllers.
 * - Formats a standardized JSON error response body across all API endpoints.
 */

export function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
}
