/**
 * Folder: tests/integration/routes/
 * Description: Integration test suite for POST /api/auth/login endpoint.
 *
 * File: tests/integration/routes/auth.test.js
 * Implementation details:
 * - Tests POST /api/auth/login returns JWT token on valid credentials.
 * - Tests 400 Bad Request on missing username/password fields.
 * - Tests 401 Unauthorized on incorrect password.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';

jest.unstable_mockModule('../../../src/repositories/userRepository.js', () => ({
  findByUsername: jest.fn(),
  createUser: jest.fn()
}));

const app = (await import('../../../src/app.js')).default;
const userRepo = await import('../../../src/repositories/userRepository.js');

describe('/api/auth Endpoints — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('should return 200 OK with JWT token on valid credentials', async () => {
      const mockHash = await bcrypt.hash('admin123', 10);
      userRepo.findByUsername.mockResolvedValue({
        id: 1,
        username: 'admin',
        password_hash: mockHash,
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe('admin');
    });

    test('should return 400 Bad Request when username or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('username and password');
    });

    test('should return 401 Unauthorized when password is invalid', async () => {
      const mockHash = await bcrypt.hash('admin123', 10);
      userRepo.findByUsername.mockResolvedValue({
        id: 1,
        username: 'admin',
        password_hash: mockHash,
        role: 'admin'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid credentials');
    });
  });
});
