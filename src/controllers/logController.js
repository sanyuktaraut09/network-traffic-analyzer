import * as trafficService from '../services/trafficService.js';

export async function getAllLogs(req, res, next) {
  try {
    const data = await trafficService.getAllLogs();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTopIPs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getTopIPs(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getEndpoints(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getMostAccessedEndpoints(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getFailedLogins(req, res, next) {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 2;
    const data = await trafficService.getFailedLogins(threshold);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getServerErrors(req, res, next) {
  try {
    const data = await trafficService.getServerErrors();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getMethodsUsage(req, res, next) {
  try {
    const data = await trafficService.getMethodsUsage();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getStatusSummary(req, res, next) {
  try {
    const data = await trafficService.getStatusSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTopErrorIPs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await trafficService.getTopErrorIPs(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getTrafficByHour(req, res, next) {
  try {
    const data = await trafficService.getTrafficByHour();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getLogs(req, res, next) {
  try {
    const result = await trafficService.getFilteredLogs(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await trafficService.getDashboardMetrics();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getQueryPlan(req, res, next) {
  try {
    const data = await trafficService.getQueryPlan();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
