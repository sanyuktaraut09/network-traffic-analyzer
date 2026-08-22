import express from 'express';
import * as securityController from '../controllers/securityController.js';

const router = express.Router();

router.get('/suspicious-ips', securityController.getSuspiciousIPs);
router.get('/', securityController.getSuspiciousIPs);

export default router;
