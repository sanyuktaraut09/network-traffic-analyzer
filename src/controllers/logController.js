/**
 * Folder: src/controllers/
 * Description: Controller layer acting as thin glue between HTTP routes and business services.
 *
 * File: src/controllers/logController.js
 * Implementation details:
 * - Parses incoming HTTP request parameters (req.query, req.params).
 * - Invokes appropriate methods from trafficService.
 * - Sends structured JSON responses to clients.
 * - Wraps async execution in try/catch blocks and delegates errors to next(err) for centralised handling.
 */

import * as trafficService from '../services/trafficService.js';

/**
 * GET /api/logs/all-logs
 * Fetches all network traffic logs.
 */
export async function getAllLogs(req, res, next) {
  try {
    const data = await trafficService.getAllLogs();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/top-ips
 * Fetches top source IP addresses by volume.
 */
export async function getTopIPs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getTopIPs(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/endpoints
 * Fetches most accessed API endpoints.
 */
export async function getEndpoints(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getMostAccessedEndpoints(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/failed-logins
 * Fetches IPs exceeding threshold of failed 401 logins.
 */
export async function getFailedLogins(req, res, next) {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 2;
    const data = await trafficService.getFailedLogins(threshold);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/server-errors
 * Fetches endpoints generating HTTP 500 server errors.
 */
export async function getServerErrors(req, res, next) {
  try {
    const data = await trafficService.getServerErrors();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/methods-usage
 * Fetches HTTP method usage distribution.
 */
export async function getMethodsUsage(req, res, next) {
  try {
    const data = await trafficService.getMethodsUsage();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/status-summary
 * Fetches status code summary metrics.
 */
export async function getStatusSummary(req, res, next) {
  try {
    const data = await trafficService.getStatusSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/top-error-ips
 * Fetches top IPs generating HTTP 4xx/5xx errors.
 */
export async function getTopErrorIPs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getTopErrorIPs(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/traffic-by-hour
 * Fetches hourly traffic distribution.
 */
export async function getTrafficByHour(req, res, next) {
  try {
    const data = await trafficService.getTrafficByHour();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs
 * Dynamic log filtering and paginated log retrieval.
 */
export async function getLogs(req, res, next) {
  try {
    const queryParams = req.validatedQuery || req.query;
    const result = await trafficService.getFilteredLogs(queryParams);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/dashboard
 * High-level system dashboard analytics metrics.
 */
export async function getDashboard(req, res, next) {
  try {
    const data = await trafficService.getDashboardMetrics();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/logs/query-plan
 * Database EXPLAIN QUERY PLAN execution details.
 */
export async function getQueryPlan(req, res, next) {
  try {
    const data = await trafficService.getQueryPlan();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
