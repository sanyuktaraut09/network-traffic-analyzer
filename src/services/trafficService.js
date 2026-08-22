/**
 * Folder: src/services/
 * Description: Business logic layer. Performs calculations, data transformations, and rules.
 *
 * File: src/services/trafficService.js
 * Implementation details:
 * - Completely decoupled from HTTP frameworks (no req, res references).
 * - Invokes logRepository methods to retrieve data.
 * - Computes derived metrics (e.g. error_rate percentage calculation).
 * - Performs pagination validation and mathematical page/limit parsing.
 */

import * as logRepo from '../repositories/logRepository.js';

/**
 * Retrieves all logs chronologically via repository.
 * @returns {Promise<Array>} Log records
 */
export async function getAllLogs() {
  return logRepo.getAllLogs();
}

/**
 * Retrieves top IPs by volume via repository.
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} Top IP records
 */
export async function getTopIPs(limit = 5) {
  return logRepo.getTopIPs(limit);
}

/**
 * Retrieves top API endpoints via repository.
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} Most accessed endpoints
 */
export async function getMostAccessedEndpoints(limit = 5) {
  return logRepo.getMostAccessedEndpoints(limit);
}

/**
 * Retrieves failed login attempt metrics via repository.
 * @param {number} threshold - Minimum failed login threshold
 * @returns {Promise<Array>} Failed login records
 */
export async function getFailedLogins(threshold = 2) {
  return logRepo.getFailedLogins(threshold);
}

/**
 * Retrieves 500 Server Error occurrences via repository.
 * @returns {Promise<Array>} Endpoints with server errors
 */
export async function getServerErrors() {
  return logRepo.getServerErrors();
}

/**
 * Retrieves HTTP method distribution via repository.
 * @returns {Promise<Array>} Method counts
 */
export async function getMethodsUsage() {
  return logRepo.getMethodsUsage();
}

/**
 * Retrieves status code summary via repository.
 * @returns {Promise<Array>} Status code counts
 */
export async function getStatusSummary() {
  return logRepo.getStatusSummary();
}

/**
 * Retrieves top error-generating IPs via repository.
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} Top error IPs
 */
export async function getTopErrorIPs(limit = 5) {
  return logRepo.getTopErrorIPs(limit);
}

/**
 * Retrieves hourly traffic distribution via repository.
 * @returns {Promise<Array>} Hourly traffic records
 */
export async function getTrafficByHour() {
  return logRepo.getTrafficByHour();
}

/**
 * Applies pagination math and filter processing for log listings.
 * @param {Object} filters - Query parameters from controller (ip, status, method, endpoint, page, limit)
 * @returns {Promise<Object>} Formatted pagination result containing totalPages and data array
 */
export async function getFilteredLogs(filters = {}) {
  const rawPage = parseInt(filters.page, 10);
  const rawLimit = parseInt(filters.limit, 10);

  // Default page to 1 if invalid or missing
  const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;
  // Default limit to 20, clamp between 1 and 100
  let limit = !isNaN(rawLimit) && rawLimit >= 1 ? rawLimit : 20;

  if (limit > 100) {
    limit = 100;
  }

  const result = await logRepo.getLogs({ ...filters, page, limit });

  return {
    page,
    limit,
    total: result.total,
    totalPages: Math.ceil(result.total / limit) || 0,
    data: result.data
  };
}

/**
 * Calculates high-level dashboard metrics and computes error_rate percentage.
 * @returns {Promise<Object>} Formatted dashboard metrics
 */
export async function getDashboardMetrics() {
  const raw = await logRepo.getDashboardRaw();
  const totalRequests = raw ? raw.total_requests || 0 : 0;
  const errorRequests = raw ? raw.error_requests || 0 : 0;

  // Compute error_rate as a clean numeric percentage rounded to 2 decimal places
  const errorRate =
    totalRequests > 0 ? Number(((errorRequests / totalRequests) * 100).toFixed(2)) : 0;

  return {
    total_requests: totalRequests,
    unique_ips: raw ? raw.unique_ips || 0 : 0,
    unique_endpoints: raw ? raw.unique_endpoints || 0 : 0,
    error_requests: errorRequests,
    error_rate: errorRate,
    failed_login_attempts: raw ? raw.failed_login_attempts || 0 : 0,
    server_errors: raw ? raw.server_errors || 0 : 0
  };
}

/**
 * Retrieves EXPLAIN QUERY PLAN analysis via repository.
 * @returns {Promise<Array>} Query plan steps
 */
export async function getQueryPlan() {
  return logRepo.getQueryPlan();
}
