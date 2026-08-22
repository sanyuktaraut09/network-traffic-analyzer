/**
 * Folder: tests/unit/services/
 * Description: Unit test suite for trafficService business logic.
 *
 * File: tests/unit/services/trafficService.test.js
 * Implementation details:
 * - Decoupled from database layer using jest.unstable_mockModule on logRepository.
 * - Tests dashboard calculations, error rate percentage precision, and edge cases (0 total requests).
 * - Tests pagination math, parameter default value assignment, and boundary clamping (max limit 100).
 */

import { jest } from '@jest/globals';

// Mock repository functions before importing service
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

const trafficService = await import('../../../src/services/trafficService.js');
const logRepo = await import('../../../src/repositories/logRepository.js');

describe('trafficService — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    test('should calculate error_rate percentage rounded to 2 decimals', async () => {
      logRepo.getDashboardRaw.mockResolvedValue({
        total_requests: 200,
        unique_ips: 45,
        unique_endpoints: 8,
        error_requests: 42,
        failed_login_attempts: 15,
        server_errors: 14
      });

      const result = await trafficService.getDashboardMetrics();

      expect(result.total_requests).toBe(200);
      expect(result.error_requests).toBe(42);
      expect(result.error_rate).toBe(21.0);
    });

    test('should return 0 error_rate when total_requests is zero', async () => {
      logRepo.getDashboardRaw.mockResolvedValue({
        total_requests: 0,
        unique_ips: 0,
        unique_endpoints: 0,
        error_requests: 0,
        failed_login_attempts: 0,
        server_errors: 0
      });

      const result = await trafficService.getDashboardMetrics();

      expect(result.error_rate).toBe(0);
      expect(result.total_requests).toBe(0);
    });

    test('should handle null/missing aggregate output gracefully', async () => {
      logRepo.getDashboardRaw.mockResolvedValue(null);

      const result = await trafficService.getDashboardMetrics();

      expect(result.total_requests).toBe(0);
      expect(result.error_rate).toBe(0);
    });
  });

  describe('getFilteredLogs — Pagination & Validation', () => {
    test('should default invalid page/limit to page=1 and limit=20', async () => {
      logRepo.getLogs.mockResolvedValue({ data: [], total: 50 });

      const result = await trafficService.getFilteredLogs({
        page: 'invalid',
        limit: 'abc'
      });

      expect(logRepo.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 })
      );
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    test('should clamp limit to maximum 100 entries per page', async () => {
      logRepo.getLogs.mockResolvedValue({ data: [], total: 500 });

      const result = await trafficService.getFilteredLogs({
        page: '1',
        limit: '999'
      });

      expect(logRepo.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 100 })
      );
      expect(result.limit).toBe(100);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('Simple Repository Pass-Through Methods', () => {
    test('should pass parameters to getTopIPs', async () => {
      logRepo.getTopIPs.mockResolvedValue([{ source_ip: '192.168.1.1', request_count: 50 }]);

      const result = await trafficService.getTopIPs(10);

      expect(logRepo.getTopIPs).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    test('should pass parameters to getMostAccessedEndpoints', async () => {
      logRepo.getMostAccessedEndpoints.mockResolvedValue([{ endpoint: '/login', total_hits: 100 }]);

      const result = await trafficService.getMostAccessedEndpoints(5);

      expect(logRepo.getMostAccessedEndpoints).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    test('should invoke getTrafficByHour', async () => {
      logRepo.getTrafficByHour.mockResolvedValue([{ hour: 12, request_count: 30 }]);

      const result = await trafficService.getTrafficByHour();

      expect(logRepo.getTrafficByHour).toHaveBeenCalledTimes(1);
      expect(result[0].hour).toBe(12);
    });
  });
});
