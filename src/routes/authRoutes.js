/**
 * Folder: src/routes/
 * Description: Express router for user authentication endpoints.
 *
 * File: src/routes/authRoutes.js
 * Implementation details:
 * - Mounts POST /api/auth/login endpoint.
 * - Validates presence of username and password parameters in request body.
 * - Invokes authService.login and sends signed JWT token payload.
 */

import { Router } from 'express';
import { login } from '../services/authService.js';

const router = Router();

/**
 * POST /api/auth/login
 * User login endpoint issuing JWT bearer token on valid credentials.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: {
          message: 'username and password are required fields',
          status: 400,
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
