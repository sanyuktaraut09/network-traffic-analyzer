/**
 * Folder: src/services/
 * Description: Business logic layer for security metrics and risk evaluation.
 *
 * File: src/services/securityService.js
 * Implementation details:
 * - Decoupled from Express HTTP objects (no req, res).
 * - Implements security risk classification logic (classifyRisk).
 * - Evaluates traffic metrics for IPs and categorizes risk into HIGH, MEDIUM, or LOW.
 */

import * as logRepo from '../repositories/logRepository.js';

/**
 * Classifies an IP's threat level based on security heuristics.
 * Risk Rules:
 * - HIGH: failed_logins > 5 OR client_errors > 10 OR server_errors > 5 OR total_requests > 30 OR client error ratio > 50%
 * - MEDIUM: failed_logins > 2 OR client_errors > 5 OR server_errors > 2 OR total_requests > 10
 * - LOW: baseline normal traffic pattern
 *
 * @param {Object} row - IP aggregate metrics object
 * @returns {string} 'HIGH' | 'MEDIUM' | 'LOW'
 */
export function classifyRisk(row) {
  const failedLogins = row.failed_logins || 0;
  const clientErrors = row.client_errors || 0;
  const serverErrors = row.server_errors || 0;
  const totalRequests = row.total_requests || 0;

  if (
    failedLogins > 5 ||
    clientErrors > 10 ||
    serverErrors > 5 ||
    totalRequests > 30 ||
    (totalRequests > 0 && clientErrors / totalRequests > 0.5)
  ) {
    return 'HIGH';
  }

  if (
    failedLogins > 2 ||
    clientErrors > 5 ||
    serverErrors > 2 ||
    totalRequests > 10
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Retrieves suspicious IPs from repository and enriches each record with calculated risk levels.
 * @returns {Promise<Object>} Object containing suspicious_ips count and enriched data array
 */
export async function getSuspiciousIPs() {
  const rows = await logRepo.getSuspiciousIPRaw();
  const enriched = rows.map((row) => ({
    source_ip: row.source_ip,
    total_requests: row.total_requests,
    failed_logins: row.failed_logins,
    client_errors: row.client_errors,
    server_errors: row.server_errors,
    risk_level: classifyRisk(row)
  }));

  return {
    suspicious_ips: enriched.length,
    data: enriched
  };
}
