/**
 * Folder: src/middleware/
 * Description: Authentication and Role-Based Access Control (RBAC) authorization middleware.
 *
 * File: src/middleware/auth.js
 * Implementation details:
 * - requireAuth extracts Bearer JWT token from Authorization header and verifies signature.
 * - Attaches decoded user payload ({ userId, username, role }) to request object (req.user).
 * - requireRole enforces role checks ('admin', 'analyst') and returns 403 Forbidden on authorization failures.
 */

import jwt from 'jsonwebtoken';

/**
 * Middleware enforcing valid JWT Bearer token authentication on protected routes.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid Authorization header',
        status: 401,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';

    // Verify token validity and attach payload to req.user
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        message: 'Token invalid or expired',
        status: 401,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Middleware factory enforcing Role-Based Access Control (RBAC).
 * @param {...string} allowedRoles - Array or spread list of permitted roles (e.g. 'admin', 'analyst')
 * @returns {Function} Express middleware function
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `Forbidden: Requires ${allowedRoles.join(' or ')} role access`,
          status: 403,
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  };
}
