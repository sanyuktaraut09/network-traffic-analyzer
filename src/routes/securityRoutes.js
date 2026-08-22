/**
 * Folder: src/routes/
 * Description: Security routes module.
 *
 * File: src/routes/securityRoutes.js
 * Implementation details:
 * - Express Router mapping security analytics endpoints to securityController.
 * - HTTP concerns only; delegates analysis to controller and service.
 */

import express from 'express';
import * as securityController from '../controllers/securityController.js';

const router = express.Router();

// Security suspicious IP detection routes
router.get('/suspicious-ips', securityController.getSuspiciousIPs);
router.get('/', securityController.getSuspiciousIPs);

export default router;
