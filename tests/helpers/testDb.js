/**
 * Folder: tests/helpers/
 * Description: Test helper utilities for mock data generation and JWT authorization token creation.
 *
 * File: tests/helpers/testDb.js
 * Implementation details:
 * - Provides mock data generators for unit/integration testing.
 * - Generates signed JWT test tokens for admin and analyst roles.
 */

import jwt from 'jsonwebtoken';

export function createMockLog(overrides = {}) {
  return {
    source_ip: '192.168.1.1',
    endpoint: '/login',
    method: 'POST',
    status_code: 200,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

export function createMockLogs(count = 5, overrides = {}) {
  return Array.from({ length: count }, (_, i) =>
    createMockLog({
      source_ip: `192.168.1.${i + 1}`,
      ...overrides
    })
  );
}

/**
 * Generates a valid signed JWT bearer token for testing RBAC permissions.
 * @param {string} role - User role ('admin' or 'analyst')
 * @returns {string} Signed JWT token string
 */
export function generateTestToken(role = 'admin') {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_development';
  return jwt.sign(
    { userId: role === 'admin' ? 1 : 2, username: role, role },
    secret,
    { expiresIn: '1h' }
  );
}
