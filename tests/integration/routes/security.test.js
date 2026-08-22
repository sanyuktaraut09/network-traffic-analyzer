/**
 * Folder: tests/integration/routes/
 * Description: Integration test suite for security HTTP endpoints (/api/security).
 *
 * File: tests/integration/routes/security.test.js
 * Implementation details:
 * - Uses supertest to test /api/security/suspicious-ips route end-to-end.
 * - Mocks repository calls and verifies service risk evaluation integration.
 * - Verifies RBAC: 401 without token, 403 for analyst role, 200 for admin role.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { generateTestToken } from '../../helpers/testDb.js';

// Mock repository function before importing app
jest.unstable_mockModule('../../../src/repositories/logRepository.js', () => ({
  getSuspiciousIPRaw: jest.fn()
}));

const app = (await import('../../../src/app.js')).default;
const logRepo = await import('../../../src/repositories/logRepository.js');

describe('/api/security Endpoints — Integration Tests', () => {
  const adminToken = generateTestToken('admin');
  const analystToken = generateTestToken('analyst');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/security/suspicious-ips — RBAC & Authentication', () => {
    test('should return 401 Unauthorized when request lacks Authorization header', async () => {
      const res = await request(app).get('/api/security/suspicious-ips');
      expect(res.status).toBe(401);
    });

    test('should return 403 Forbidden when analyst role attempts access', async () => {
      const res = await request(app)
        .get('/api/security/suspicious-ips')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    test('should return 200 OK with enriched suspicious IPs when admin role accesses endpoint', async () => {
      logRepo.getSuspiciousIPRaw.mockResolvedValue([
        {
          source_ip: '10.0.0.15',
          total_requests: 40,
          failed_logins: 8,
          client_errors: 15,
          server_errors: 3
        }
      ]);

      const res = await request(app)
        .get('/api/security/suspicious-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suspicious_ips).toBe(1);
      expect(res.body.data[0].source_ip).toBe('10.0.0.15');
      expect(res.body.data[0].risk_level).toBe('HIGH');
    });

    test('should return 200 OK with 0 suspicious_ips when repository yields no matches', async () => {
      logRepo.getSuspiciousIPRaw.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/security/suspicious-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suspicious_ips).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    test('should return 500 Internal Server Error when repository encounters error', async () => {
      logRepo.getSuspiciousIPRaw.mockRejectedValue(new Error('Database query failure'));

      const res = await request(app)
        .get('/api/security/suspicious-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toBe('Database query failure');
    });
  });
});
