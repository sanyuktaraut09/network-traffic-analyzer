import * as securityService from '../services/securityService.js';

export async function getSuspiciousIPs(req, res, next) {
  try {
    const data = await securityService.getSuspiciousIPs();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
