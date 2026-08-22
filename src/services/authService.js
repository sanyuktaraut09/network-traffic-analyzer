/**
 * Folder: src/services/
 * Description: Authentication and RBAC token generation service layer.
 *
 * File: src/services/authService.js
 * Implementation details:
 * - Implements password verification using bcryptjs comparison.
 * - Signs stateless JSON Web Tokens (JWT) embedded with user ID, username, and role.
 * - Decoupled from HTTP req/res objects for pure business logic testing.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/userRepository.js';

const EXPIRES_IN = '8h';

/**
 * Authenticates user credentials and issues a signed JWT token.
 * @param {string} username - Account username
 * @param {string} password - Raw plaintext password
 * @returns {Promise<Object>} Object containing signed JWT token, role, and expiration duration
 * @throws {Error} 401 Unauthorized Error if credentials are invalid
 */
export async function login(username, password) {
  // Retrieve user record from user repository
  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  // Compare plaintext password against stored bcrypt hash
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';

  // Sign JWT containing identity claims and role for RBAC
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    secret,
    { expiresIn: EXPIRES_IN }
  );

  return {
    token,
    role: user.role,
    expiresIn: EXPIRES_IN
  };
}
