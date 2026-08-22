/**
 * Folder: tests/integration/routes/
 * Description: Integration test suite for log ingestion endpoints (/api/ingest).
 *
 * File: tests/integration/routes/ingest.test.js
 * Implementation details:
 * - Tests POST /api/ingest accepts valid array of log entries and returns 202 Accepted with jobId.
 * - Tests POST /api/ingest with missing/invalid fields returns 400 Bad Request with Zod details.
 * - Tests GET /api/ingest/:jobId returns job processing status state.
 * - Enforces admin RBAC authorization token.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import { generateTestToken } from '../../helpers/testDb.js';

jest.unstable_mockModule('../../../src/repositories/logRepository.js', () => ({
  bulkInsertLogs: jest.fn()
}));

const app = (await import('../../../src/app.js')).default;
const logRepo = await import('../../../src/repositories/logRepository.js');

describe('/api/ingest Endpoints — Integration Tests', () => {
  const adminToken = generateTestToken('admin');
  const analystToken = generateTestToken('analyst');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ingest', () => {
    test('should return 202 Accepted with jobId for valid log payload when authorized as admin', async () => {
      logRepo.bulkInsertLogs.mockResolvedValue();

      const validPayload = {
        logs: [
          {
            source_ip: '192.168.1.100',
            endpoint: '/api/v1/resource',
            method: 'POST',
            status_code: 201,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await request(app)
        .post('/api/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(202);
      expect(res.body.message).toBeDefined();
      expect(res.body.jobId).toBeDefined();
      expect(res.body.count).toBe(1);
    });

    test('should return 400 Bad Request when log entry missing required fields (invalid Zod payload)', async () => {
      const invalidPayload = {
        logs: [
          {
            source_ip: 'invalid-ip-string',
            endpoint: 'missing-leading-slash',
            method: 'INVALID_METHOD',
            status_code: 999
          }
        ]
      };

      const res = await request(app)
        .post('/api/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.details).toBeDefined();
    });

    test('should return 403 Forbidden when analyst role attempts batch ingestion', async () => {
      const res = await request(app)
        .post('/api/ingest')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ logs: [] });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/ingest/:jobId', () => {
    test('should return 200 OK with job state details', async () => {
      const res = await request(app)
        .get('/api/ingest/direct-insert')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe('direct-insert');
      expect(res.body.state).toBe('completed');
    });
  });
});
