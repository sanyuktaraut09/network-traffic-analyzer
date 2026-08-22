/**
 * Folder: tests/unit/services/
 * Description: Unit test suite for authService authentication logic.
 *
 * File: tests/unit/services/authService.test.js
 * Implementation details:
 * - Decouples user repo and bcrypt with mocks.
 * - Tests valid login issuing token and 401 error on invalid credentials.
 */

import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

jest.unstable_mockModule('../../../src/repositories/userRepository.js', () => ({
  findByUsername: jest.fn(),
  createUser: jest.fn()
}));

const authService = await import('../../../src/services/authService.js');
const userRepo = await import('../../../src/repositories/userRepository.js');

describe('authService — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('should authenticate valid credentials and return JWT token', async () => {
      const mockHash = await bcrypt.hash('admin123', 10);
      userRepo.findByUsername.mockResolvedValue({
        id: 1,
        username: 'admin',
        password_hash: mockHash,
        role: 'admin'
      });

      const result = await authService.login('admin', 'admin123');

      expect(userRepo.findByUsername).toHaveBeenCalledWith('admin');
      expect(result.token).toBeDefined();
      expect(result.role).toBe('admin');
      expect(result.expiresIn).toBe('8h');
    });

    test('should throw 401 Unauthorized error when user is not found', async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      await expect(authService.login('nonexistent', 'pass')).rejects.toMatchObject({
        message: 'Invalid credentials',
        status: 401
      });
    });

    test('should throw 401 Unauthorized error when password does not match hash', async () => {
      const mockHash = await bcrypt.hash('admin123', 10);
      userRepo.findByUsername.mockResolvedValue({
        id: 1,
        username: 'admin',
        password_hash: mockHash,
        role: 'admin'
      });

      await expect(authService.login('admin', 'wrongpass')).rejects.toMatchObject({
        message: 'Invalid credentials',
        status: 401
      });
    });
  });
});
