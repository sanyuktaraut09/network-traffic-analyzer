import * as logRepo from '../repositories/logRepository.js';

export async function getAllLogs() {
  return logRepo.getAllLogs();
}

export async function getTopIPs(limit = 5) {
  return logRepo.getTopIPs(limit);
}

export async function getMostAccessedEndpoints(limit = 5) {
  return logRepo.getMostAccessedEndpoints(limit);
}

export async function getFailedLogins(threshold = 2) {
  return logRepo.getFailedLogins(threshold);
}

export async function getServerErrors() {
  return logRepo.getServerErrors();
}

export async function getMethodsUsage() {
  return logRepo.getMethodsUsage();
}

export async function getStatusSummary() {
  return logRepo.getStatusSummary();
}

export async function getTopErrorIPs(limit = 5) {
  return logRepo.getTopErrorIPs(limit);
}

export async function getTrafficByHour() {
  return logRepo.getTrafficByHour();
}

export async function getFilteredLogs(filters = {}) {
  const rawPage = parseInt(filters.page, 10);
  const rawLimit = parseInt(filters.limit, 10);

  const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;
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

export async function getDashboardMetrics() {
  const raw = await logRepo.getDashboardRaw();
  const totalRequests = raw ? raw.total_requests || 0 : 0;
  const errorRequests = raw ? raw.error_requests || 0 : 0;

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

export async function getQueryPlan() {
  return logRepo.getQueryPlan();
}
