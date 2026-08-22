/**
 * Folder: src/repositories/
 * Description: Data access layer (DAL). Responsible EXCLUSIVELY for interacting with the database.
 *
 * File: src/repositories/logRepository.js
 * Implementation details:
 * - Refactored for PostgreSQL syntax using pg connection Pool ($1, $2 placeholders).
 * - Contains ALL raw SQL queries for the application. No SQL strings exist outside this file.
 * - Free of HTTP concerns (req, res) and business logic calculations.
 * - Uses EXTRACT(HOUR FROM timestamp) for PostgreSQL time-based analytics.
 * - Returns raw rows or aggregate records wrapped in Promises.
 */

import pool from '../config/db.js';

/**
 * Fetches all network traffic logs sorted chronologically from oldest to newest.
 * @returns {Promise<Array>} List of log records
 */
export async function getAllLogs() {
  const { rows } = await pool.query(`
    SELECT
      source_ip,
      endpoint,
      method,
      status_code,
      timestamp
    FROM network_logs
    ORDER BY timestamp ASC
  `);
  return rows;
}

/**
 * Fetches the top source IP addresses by total request count.
 * @param {number} limit - Maximum number of top IPs to return (default: 5)
 * @returns {Promise<Array>} List of IP addresses with request counts
 */
export async function getTopIPs(limit = 5) {
  const { rows } = await pool.query(
    `SELECT
      source_ip,
      COUNT(*)::integer AS request_count,
      COUNT(*)::integer AS hit_count
    FROM network_logs
    GROUP BY source_ip
    ORDER BY request_count DESC
    LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Fetches the most accessed API endpoints.
 * @param {number} limit - Maximum number of endpoints to return (default: 5)
 * @returns {Promise<Array>} List of endpoints with total hit counts
 */
export async function getMostAccessedEndpoints(limit = 5) {
  const { rows } = await pool.query(
    `SELECT
      endpoint,
      COUNT(*)::integer AS total_hits
    FROM network_logs
    GROUP BY endpoint
    ORDER BY total_hits DESC
    LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Identifies source IPs exceeding a threshold of 401 Unauthorized attempts on /login endpoint.
 * @param {number} threshold - Minimum failed login attempts to filter by (default: 2)
 * @returns {Promise<Array>} List of source IPs with failed login counts
 */
export async function getFailedLogins(threshold = 2) {
  const { rows } = await pool.query(
    `SELECT
      source_ip,
      COUNT(*)::integer AS failed_attempts
    FROM network_logs
    WHERE status_code = 401 AND endpoint = '/login'
    GROUP BY source_ip
    HAVING COUNT(*) > $1
    ORDER BY failed_attempts DESC`,
    [threshold]
  );
  return rows;
}

/**
 * Retrieves endpoints encountering HTTP 500 Internal Server Errors.
 * @returns {Promise<Array>} Endpoints sorted by error frequency
 */
export async function getServerErrors() {
  const { rows } = await pool.query(`
    SELECT
      endpoint,
      COUNT(*)::integer AS errors
    FROM network_logs
    WHERE status_code = 500
    GROUP BY endpoint
    ORDER BY errors DESC
  `);
  return rows;
}

/**
 * Counts total request volume broken down by HTTP method (GET, POST, PUT, etc.).
 * @returns {Promise<Array>} HTTP method usage summary
 */
export async function getMethodsUsage() {
  const { rows } = await pool.query(`
    SELECT
      method,
      COUNT(*)::integer AS usage_count
    FROM network_logs
    GROUP BY method
    ORDER BY usage_count DESC
  `);
  return rows;
}

/**
 * Summarizes total requests grouped by HTTP status code (200, 401, 404, 500, etc.).
 * @returns {Promise<Array>} Status code distribution summary
 */
export async function getStatusSummary() {
  const { rows } = await pool.query(`
    SELECT
      status_code,
      COUNT(*)::integer AS total_requests
    FROM network_logs
    GROUP BY status_code
    ORDER BY total_requests DESC
  `);
  return rows;
}

/**
 * Finds top source IPs generating client or server errors (status_code >= 400).
 * @param {number} limit - Maximum number of IPs to return (default: 5)
 * @returns {Promise<Array>} List of top error-generating IPs
 */
export async function getTopErrorIPs(limit = 5) {
  const { rows } = await pool.query(
    `SELECT
      source_ip,
      COUNT(*)::integer AS error_count
    FROM network_logs
    WHERE status_code >= 400
    GROUP BY source_ip
    ORDER BY error_count DESC
    LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Groups request counts by hour of the day (0-23) based on log timestamps using EXTRACT.
 * @returns {Promise<Array>} Hourly traffic distribution
 */
export async function getTrafficByHour() {
  const { rows } = await pool.query(`
    SELECT
      EXTRACT(HOUR FROM timestamp)::integer AS hour,
      COUNT(*)::integer AS request_count
    FROM network_logs
    GROUP BY hour
    ORDER BY hour ASC
  `);
  return rows;
}

/**
 * Queries network logs dynamically with parameterized filtering ($1, $2...) and offset-based pagination.
 * @param {Object} filters - Filter criteria (ip, status, method, endpoint, page, limit)
 * @returns {Promise<Object>} Object containing matching log records and total matching count
 */
export async function getLogs({ ip, status, method, endpoint, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (ip) {
    params.push(ip);
    conditions.push(`source_ip = $${params.length}`);
  }

  if (status) {
    params.push(parseInt(status, 10));
    conditions.push(`status_code = $${params.length}`);
  }

  if (method) {
    params.push(method.toUpperCase());
    conditions.push(`method = $${params.length}`);
  }

  if (endpoint) {
    params.push(endpoint);
    conditions.push(`endpoint = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Query 1: Total count for pagination metadata
  const countQuery = `
    SELECT COUNT(*)::integer AS total
    FROM network_logs
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = countResult.rows[0] ? parseInt(countResult.rows[0].total, 10) : 0;

  // Query 2: Paginated log entries
  const dataParams = [...params];
  dataParams.push(limit);
  const limitIndex = dataParams.length;

  dataParams.push(offset);
  const offsetIndex = dataParams.length;

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
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const dataResult = await pool.query(dataQuery, dataParams);

  return { data: dataResult.rows, total };
}

/**
 * Aggregates high-level metrics across all network traffic using conditional SUM/CASE statements in PostgreSQL.
 * @returns {Promise<Object>} Raw aggregate counts for dashboard calculation
 */
export async function getDashboardRaw() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::integer                                              AS total_requests,
      COUNT(DISTINCT source_ip)::integer                             AS unique_ips,
      COUNT(DISTINCT endpoint)::integer                              AS unique_endpoints,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::integer  AS error_requests,
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END)::integer  AS failed_login_attempts,
      SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::integer  AS server_errors
    FROM network_logs
  `);
  return rows[0] || {
    total_requests: 0,
    unique_ips: 0,
    unique_endpoints: 0,
    error_requests: 0,
    failed_login_attempts: 0,
    server_errors: 0
  };
}

/**
 * Fetches metrics per IP to analyze for potential security risks using conditional aggregation and HAVING filters.
 * @returns {Promise<Array>} Suspicious IP traffic metrics
 */
export async function getSuspiciousIPRaw() {
  const { rows } = await pool.query(`
    SELECT
      source_ip,
      COUNT(*)::integer                                              AS total_requests,
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END)::integer  AS failed_logins,
      SUM(CASE WHEN status_code BETWEEN 400 AND 499
               THEN 1 ELSE 0 END)::integer                          AS client_errors,
      SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::integer  AS server_errors
    FROM network_logs
    GROUP BY source_ip
    HAVING
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END) >= 2
      OR SUM(CASE WHEN status_code BETWEEN 400 AND 499
                  THEN 1 ELSE 0 END) >= 3
      OR SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) >= 2
      OR COUNT(*) >= 10
    ORDER BY failed_logins DESC, client_errors DESC
  `);
  return rows;
}

/**
 * Runs EXPLAIN ANALYZE to inspect PostgreSQL query execution and index scan details.
 * @returns {Promise<Array>} PostgreSQL query plan execution steps
 */
export async function getQueryPlan() {
  const { rows } = await pool.query(`
    EXPLAIN ANALYZE
    SELECT source_ip, COUNT(*) AS request_count
    FROM network_logs
    GROUP BY source_ip
    ORDER BY request_count DESC
    LIMIT 5
  `);
  return rows;
}

/**
 * Inserts multiple log records in a single optimized batch parameterized SQL query.
 * @param {Array<Object>} logs - Array of network log objects to insert
 * @returns {Promise<void>}
 */
export async function bulkInsertLogs(logs = []) {
  if (!logs || !logs.length) return;

  const values = logs
    .map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    })
    .join(', ');

  const params = logs.flatMap((log) => [
    log.source_ip,
    log.endpoint,
    log.method,
    log.status_code,
    log.timestamp || new Date().toISOString()
  ]);

  await pool.query(
    `INSERT INTO network_logs (source_ip, endpoint, method, status_code, timestamp)
     VALUES ${values}`,
    params
  );
}
