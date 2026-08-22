import * as logRepo from '../repositories/logRepository.js';

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
