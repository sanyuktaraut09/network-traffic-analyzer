/**
 * Folder: src/controllers/
 * Description: Security controller handling security analysis HTTP endpoints.
 *
 * File: src/controllers/securityController.js
 * Implementation details:
 * - Bridges security route requests to securityService logic.
 * - Forwards any unhandled async errors to next(err) middleware.
 */

import * as securityService from '../services/securityService.js';

/**
 * GET /api/security/suspicious-ips
 * Fetches suspicious IPs categorized with threat risk levels (HIGH, MEDIUM, LOW).
 */
export async function getSuspiciousIPs(req, res, next) {
  try {
    const data = await securityService.getSuspiciousIPs();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
