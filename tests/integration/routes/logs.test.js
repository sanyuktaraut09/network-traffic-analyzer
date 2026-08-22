/**
 * Folder: tests/integration/routes/
 * Description: Integration test suite for network traffic log HTTP endpoints.
 *
 * File: tests/integration/routes/logs.test.js
 * Implementation details:
 * - Uses supertest to send HTTP requests to Express application instance without binding network port.
 * - Mocks repository layer queries using jest.unstable_mockModule.
 * - Enforces JWT Bearer token authentication headers.
 * - Verifies 401 Unauthenticated on missing token and 400 Bad Request on invalid query parameters.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { generateTestToken } from '../../helpers/testDb.js';

// Mock database repository functions before importing app
jest.unstable_mockModule('../../../src/repositories/logRepository.js', () => ({
  getAllLogs: jest.fn(),
  getTopIPs: jest.fn(),
  getMostAccessedEndpoints: jest.fn(),
  getFailedLogins: jest.fn(),
  getServerErrors: jest.fn(),
  getMethodsUsage: jest.fn(),
  getStatusSummary: jest.fn(),
  getTopErrorIPs: jest.fn(),
  getTrafficByHour: jest.fn(),
  getLogs: jest.fn(),
  getDashboardRaw: jest.fn(),
  getQueryPlan: jest.fn()
}));

const app = (await import('../../../src/app.js')).default;
const logRepo = await import('../../../src/repositories/logRepository.js');

describe('/api/logs Endpoints — Integration Tests', () => {
  const token = generateTestToken('analyst');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Enforcement', () => {
    test('should return 401 Unauthorized without Authorization header', async () => {
      const res = await request(app).get('/api/logs/top-ips');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Authorization');
    });
  });

  describe('GET /api/logs/all-logs', () => {
    test('should return 200 OK with all logs array when authenticated', async () => {
      logRepo.getAllLogs.mockResolvedValue([
        { source_ip: '192.168.1.1', endpoint: '/login', method: 'POST', status_code: 200 }
      ]);

      const res = await request(app)
        .get('/api/logs/all-logs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].endpoint).toBe('/login');
    });
  });

  describe('GET /api/logs/top-ips', () => {
    test('should return 200 OK with top IPs list when authenticated', async () => {
      logRepo.getTopIPs.mockResolvedValue([
        { source_ip: '192.168.1.1', request_count: 50, hit_count: 50 }
      ]);

      const res = await request(app)
        .get('/api/logs/top-ips')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].source_ip).toBe('192.168.1.1');
    });

    test('should return 500 Internal Server Error when repository throws exception', async () => {
      logRepo.getTopIPs.mockRejectedValue(new Error('PostgreSQL Connection Failed'));

      const res = await request(app)
        .get('/api/logs/top-ips')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toBe('PostgreSQL Connection Failed');
    });
  });

  describe('GET /api/logs', () => {
    test('should return 200 OK with paginated logs and metadata for valid parameters', async () => {
      logRepo.getLogs.mockResolvedValue({
        data: [
          {
            source_ip: '192.168.1.1',
            endpoint: '/login',
            method: 'POST',
            status_code: 200,
            timestamp: new Date().toISOString()
          }
        ],
        total: 100
      });

      const res = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: '200', page: '1', limit: '10' });

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.total).toBe(100);
      expect(res.body.totalPages).toBe(10);
      expect(res.body.data).toHaveLength(1);
    });

    test('should return 400 Bad Request with validation error details when status parameter is invalid string', async () => {
      const res = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.details).toBeDefined();
    });
  });

  describe('GET /api/logs/dashboard', () => {
    test('should return 200 OK with aggregated metrics and error rate', async () => {
      logRepo.getDashboardRaw.mockResolvedValue({
        total_requests: 100,
        unique_ips: 20,
        unique_endpoints: 5,
        error_requests: 10,
        failed_login_attempts: 4,
        server_errors: 2
      });

      const res = await request(app)
        .get('/api/logs/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total_requests).toBe(100);
      expect(res.body.error_rate).toBe(10.0);
    });
  });

  describe('GET /api/logs/endpoints', () => {
    test('should return 200 OK with most accessed endpoints', async () => {
      logRepo.getMostAccessedEndpoints.mockResolvedValue([
        { endpoint: '/login', total_hits: 120 }
      ]);

      const res = await request(app)
        .get('/api/logs/endpoints')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].endpoint).toBe('/login');
    });
  });

  describe('GET /api/logs/failed-logins', () => {
    test('should return 200 OK with failed login counts', async () => {
      logRepo.getFailedLogins.mockResolvedValue([
        { source_ip: '192.168.1.99', failed_attempts: 5 }
      ]);

      const res = await request(app)
        .get('/api/logs/failed-logins')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].source_ip).toBe('192.168.1.99');
    });
  });

  describe('GET /api/logs/server-errors', () => {
    test('should return 200 OK with 500 error summary', async () => {
      logRepo.getServerErrors.mockResolvedValue([
        { endpoint: '/checkout', errors: 8 }
      ]);

      const res = await request(app)
        .get('/api/logs/server-errors')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].errors).toBe(8);
    });
  });

  describe('GET /api/logs/methods-usage', () => {
    test('should return 200 OK with method usage stats', async () => {
      logRepo.getMethodsUsage.mockResolvedValue([
        { method: 'GET', usage_count: 150 }
      ]);

      const res = await request(app)
        .get('/api/logs/methods-usage')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].method).toBe('GET');
    });
  });

  describe('GET /api/logs/status-summary', () => {
    test('should return 200 OK with status summary', async () => {
      logRepo.getStatusSummary.mockResolvedValue([
        { status_code: 200, total_requests: 300 }
      ]);

      const res = await request(app)
        .get('/api/logs/status-summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].status_code).toBe(200);
    });
  });

  describe('GET /api/logs/top-error-ips', () => {
    test('should return 200 OK with top error IPs', async () => {
      logRepo.getTopErrorIPs.mockResolvedValue([
        { source_ip: '192.168.1.88', error_count: 12 }
      ]);

      const res = await request(app)
        .get('/api/logs/top-error-ips')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].source_ip).toBe('192.168.1.88');
    });
  });

  describe('GET /api/logs/traffic-by-hour', () => {
    test('should return 200 OK with hourly request breakdown', async () => {
      logRepo.getTrafficByHour.mockResolvedValue([
        { hour: 14, request_count: 45 }
      ]);

      const res = await request(app)
        .get('/api/logs/traffic-by-hour')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body[0].hour).toBe(14);
    });
  });

  describe('GET /api/logs/query-plan', () => {
    test('should return 200 OK with query execution plan', async () => {
      logRepo.getQueryPlan.mockResolvedValue([
        { 'QUERY PLAN': 'Index Only Scan using idx_source_ip on network_logs' }
      ]);

      const res = await request(app)
        .get('/api/logs/query-plan')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body[0]['QUERY PLAN']).toContain('Index Only Scan');
    });
  });
});
