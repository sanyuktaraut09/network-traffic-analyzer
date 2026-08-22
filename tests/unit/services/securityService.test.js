/**
 * Folder: tests/unit/services/
 * Description: Unit test suite for securityService business logic.
 *
 * File: tests/unit/services/securityService.test.js
 * Implementation details:
 * - Decoupled from database layer using jest.unstable_mockModule on logRepository.
 * - Tests threat risk level classification heuristics (HIGH, MEDIUM, LOW).
 * - Verifies correct formatting and counts for suspicious IP reporting.
 */

import { jest } from '@jest/globals';

// Mock data access layer repository module before ESM dynamic import
jest.unstable_mockModule('../../../src/repositories/logRepository.js', () => ({
  getSuspiciousIPRaw: jest.fn()
}));

const { getSuspiciousIPs, classifyRisk } = await import(
  '../../../src/services/securityService.js'
);
const logRepo = await import('../../../src/repositories/logRepository.js');

describe('securityService — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyRisk', () => {
    test('should classify risk as HIGH when failed logins > 5', () => {
      const risk = classifyRisk({
        failed_logins: 6,
        client_errors: 1,
        server_errors: 0,
        total_requests: 10
      });
      expect(risk).toBe('HIGH');
    });

    test('should classify risk as HIGH when client errors ratio > 50%', () => {
      const risk = classifyRisk({
        failed_logins: 1,
        client_errors: 6,
        server_errors: 0,
        total_requests: 10
      });
      expect(risk).toBe('HIGH');
    });

    test('should classify risk as MEDIUM when failed logins >= 2', () => {
      const risk = classifyRisk({
        failed_logins: 3,
        client_errors: 1,
        server_errors: 0,
        total_requests: 5
      });
      expect(risk).toBe('MEDIUM');
    });

    test('should classify risk as LOW when traffic parameters are normal', () => {
      const risk = classifyRisk({
        failed_logins: 0,
        client_errors: 1,
        server_errors: 0,
        total_requests: 5
      });
      expect(risk).toBe('LOW');
    });
  });

  describe('getSuspiciousIPs', () => {
    test('should retrieve raw records from repository and enrich with risk levels', async () => {
      logRepo.getSuspiciousIPRaw.mockResolvedValue([
        {
          source_ip: '192.168.1.50',
          total_requests: 35,
          failed_logins: 7,
          client_errors: 12,
          server_errors: 6
        },
        {
          source_ip: '192.168.1.10',
          total_requests: 12,
          failed_logins: 3,
          client_errors: 4,
          server_errors: 1
        }
      ]);

      const result = await getSuspiciousIPs();

      expect(logRepo.getSuspiciousIPRaw).toHaveBeenCalledTimes(1);
      expect(result.suspicious_ips).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].risk_level).toBe('HIGH');
      expect(result.data[1].risk_level).toBe('MEDIUM');
    });

    test('should handle empty suspicious IP list cleanly', async () => {
      logRepo.getSuspiciousIPRaw.mockResolvedValue([]);

      const result = await getSuspiciousIPs();

      expect(result.suspicious_ips).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
