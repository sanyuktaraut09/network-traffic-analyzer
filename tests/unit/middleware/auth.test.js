/**
 * Folder: tests/unit/middleware/
 * Description: Unit test suite for auth middleware functions (requireAuth, requireRole).
 *
 * File: tests/unit/middleware/auth.test.js
 * Implementation details:
 * - Tests requireAuth verifies Bearer JWT token or returns 401.
 * - Tests requireRole enforces role checks ('admin' vs 'analyst') or returns 403.
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../../../src/middleware/auth.js';

describe('auth Middleware — Unit Tests', () => {
  let req;
  let res;
  let next;
  const secret = 'fallback_secret_for_development';

  beforeEach(() => {
    req = { headers: {}, path: '/api/test' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('requireAuth', () => {
    test('should return 401 when Authorization header is missing', () => {
      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Missing or invalid Authorization header' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token is invalid', () => {
      req.headers.authorization = 'Bearer invalid_token_string';

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Token invalid or expired' })
        })
      );
    });

    test('should attach decoded payload to req.user and call next() on valid token', () => {
      const token = jwt.sign({ userId: 1, role: 'admin' }, secret);
      req.headers.authorization = `Bearer ${token}`;

      requireAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireRole', () => {
    test('should call next() when req.user role matches permitted role', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return 403 Forbidden when req.user role does not match permitted role', () => {
      req.user = { role: 'analyst' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: expect.stringContaining('Forbidden') })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
