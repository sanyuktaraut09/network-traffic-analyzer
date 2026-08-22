import { queryAll, queryGet } from '../config/db.js';

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

export async function getLogs({ ip, status, method, endpoint, page = 1, limit = 20 }) {
  let whereClause = 'WHERE 1 = 1';
  const params = [];

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

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM network_logs
    ${whereClause}
  `;

  const countRow = await queryGet(countQuery, params);
  const total = countRow ? countRow.total : 0;

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
