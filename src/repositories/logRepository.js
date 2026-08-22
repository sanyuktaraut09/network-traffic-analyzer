/**
 * Folder: src/repositories/
 * Description: Data access layer (DAL). Responsible EXCLUSIVELY for interacting with the database.
 *
 * File: src/repositories/logRepository.js
 * Implementation details:
 * - Contains ALL raw SQL queries for the application. No SQL strings exist outside this file.
 * - Free of HTTP concerns (req, res) and business logic calculations.
 * - Uses parameterized SQL queries to prevent SQL injection vulnerabilities.
 * - Returns raw data rows or aggregate records wrapped in Promises.
 */

import { queryAll, queryGet } from '../config/db.js';

/**
 * Fetches all network traffic logs sorted chronologically from oldest to newest.
 * @returns {Promise<Array>} List of log records
 */
export async function getAllLogs() {
  const sql = `
    SELECT
      source_ip,
      endpoint,
      method,
      status_code,
      timestamp
    FROM network_logs
    ORDER BY timestamp ASC
  `;
  return queryAll(sql);
}

/**
 * Fetches the top source IP addresses by total request count.
 * @param {number} limit - Maximum number of top IPs to return (default: 5)
 * @returns {Promise<Array>} List of IP addresses with request counts
 */
export async function getTopIPs(limit = 5) {
  const sql = `
    SELECT
      source_ip,
      COUNT(*) AS request_count,
      COUNT(*) AS hit_count
    FROM network_logs
    GROUP BY source_ip
    ORDER BY request_count DESC
    LIMIT ?
  `;
  return queryAll(sql, [limit]);
}

/**
 * Fetches the most accessed API endpoints.
 * @param {number} limit - Maximum number of endpoints to return (default: 5)
 * @returns {Promise<Array>} List of endpoints with total hit counts
 */
export async function getMostAccessedEndpoints(limit = 5) {
  const sql = `
    SELECT
      endpoint,
      COUNT(*) AS total_hits
    FROM network_logs
    GROUP BY endpoint
    ORDER BY total_hits DESC
    LIMIT ?
  `;
  return queryAll(sql, [limit]);
}

/**
 * Identifies source IPs exceeding a threshold of 401 Unauthorized attempts.
 * @param {number} threshold - Minimum failed login attempts to filter by (default: 2)
 * @returns {Promise<Array>} List of source IPs with failed login counts
 */
export async function getFailedLogins(threshold = 2) {
  const sql = `
    SELECT
      source_ip,
      COUNT(*) AS failed_attempts
    FROM network_logs
    WHERE status_code = 401
    GROUP BY source_ip
    HAVING COUNT(*) > ?
    ORDER BY failed_attempts DESC
  `;
  return queryAll(sql, [threshold]);
}

/**
 * Retrieves endpoints encountering HTTP 500 Internal Server Errors.
 * @returns {Promise<Array>} Endpoints sorted by error frequency
 */
export async function getServerErrors() {
  const sql = `
    SELECT
      endpoint,
      COUNT(*) AS errors
    FROM network_logs
    WHERE status_code = 500
    GROUP BY endpoint
    ORDER BY errors DESC
  `;
  return queryAll(sql);
}

/**
 * Counts total request volume broken down by HTTP method (GET, POST, PUT, etc.).
 * @returns {Promise<Array>} HTTP method usage summary
 */
export async function getMethodsUsage() {
  const sql = `
    SELECT
      method,
      COUNT(*) AS usage_count
    FROM network_logs
    GROUP BY method
    ORDER BY usage_count DESC
  `;
  return queryAll(sql);
}

/**
 * Summarizes total requests grouped by HTTP status code (200, 401, 404, 500, etc.).
 * @returns {Promise<Array>} Status code distribution summary
 */
export async function getStatusSummary() {
  const sql = `
    SELECT
      status_code,
      COUNT(*) AS total_requests
    FROM network_logs
    GROUP BY status_code
    ORDER BY total_requests DESC
  `;
  return queryAll(sql);
}

/**
 * Finds top source IPs generating client or server errors (status_code >= 400).
 * @param {number} limit - Maximum number of IPs to return (default: 5)
 * @returns {Promise<Array>} List of top error-generating IPs
 */
export async function getTopErrorIPs(limit = 5) {
  const sql = `
    SELECT
      source_ip,
      COUNT(*) AS error_count
    FROM network_logs
    WHERE status_code >= 400
    GROUP BY source_ip
    ORDER BY error_count DESC
    LIMIT ?
  `;
  return queryAll(sql, [limit]);
}

/**
 * Groups request counts by hour of the day (00-23) based on log timestamps.
 * @returns {Promise<Array>} Hourly traffic distribution
 */
export async function getTrafficByHour() {
  const sql = `
    SELECT
      strftime('%H', timestamp) AS hour,
      COUNT(*) AS request_count
    FROM network_logs
    GROUP BY hour
    ORDER BY hour ASC
  `;
  return queryAll(sql);
}

/**
 * Queries network logs dynamically with parameterized filtering and offset-based pagination.
 * @param {Object} filters - Filter criteria (ip, status, method, endpoint, page, limit)
 * @returns {Promise<Object>} Object containing matching log records and total matching count
 */
export async function getLogs({ ip, status, method, endpoint, page = 1, limit = 20 }) {
  let whereClause = 'WHERE 1 = 1';
  const params = [];

  // Parameterized filters to prevent SQL injection
  if (ip) {
    whereClause += ' AND source_ip = ?';
    params.push(ip);
  }

  if (status) {
    whereClause += ' AND status_code = ?';
    params.push(status);
  }

  if (method) {
    whereClause += ' AND method = ?';
    params.push(method.toUpperCase());
  }

  if (endpoint) {
    whereClause += ' AND endpoint = ?';
    params.push(endpoint);
  }

  // Query 1: Count total matching logs for pagination metadata
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM network_logs
    ${whereClause}
  `;

  const countRow = await queryGet(countQuery, params);
  const total = countRow ? countRow.total : 0;

  // Query 2: Retrieve paginated log entries
  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT
      source_ip,
      endpoint,
      method,
      status_code,
      timestamp
    FROM network_logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const rows = await queryAll(dataQuery, dataParams);

  return { data: rows, total: parseInt(total, 10) };
}

/**
 * Aggregates high-level metrics across all network traffic using conditional SUM/CASE statements.
 * @returns {Promise<Object>} Raw aggregate counts for dashboard calculation
 */
export async function getDashboardRaw() {
  const sql = `
    SELECT
      COUNT(*) AS total_requests,
      COUNT(DISTINCT source_ip) AS unique_ips,
      COUNT(DISTINCT endpoint) AS unique_endpoints,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_requests,
      SUM(CASE WHEN status_code = 401 THEN 1 ELSE 0 END) AS failed_login_attempts,
      SUM(CASE WHEN status_code = 500 THEN 1 ELSE 0 END) AS server_errors
    FROM network_logs
  `;
  return queryGet(sql);
}

/**
 * Fetches metrics per IP to analyze for potential security risks using conditional aggregation and HAVING filters.
 * @returns {Promise<Array>} Suspicious IP traffic metrics
 */
export async function getSuspiciousIPRaw() {
  const sql = `
    SELECT
      source_ip,
      COUNT(*) AS total_requests,
      SUM(CASE WHEN status_code = 401 THEN 1 ELSE 0 END) AS failed_logins,
      SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) AS client_errors,
      SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_errors
    FROM network_logs
    GROUP BY source_ip
    HAVING
      failed_logins > 2
      OR client_errors > 5
      OR server_errors > 2
      OR total_requests > 10
    ORDER BY total_requests DESC
  `;
  return queryAll(sql);
}

/**
 * Runs EXPLAIN QUERY PLAN to inspect database index usage and query execution details.
 * @returns {Promise<Array>} Query plan execution steps
 */
export async function getQueryPlan() {
  const sql = `
    EXPLAIN QUERY PLAN
    SELECT
      source_ip,
      COUNT(*) AS hit_count
    FROM network_logs
    GROUP BY source_ip
    ORDER BY hit_count DESC
    LIMIT 5
  `;
  return queryAll(sql);
}
