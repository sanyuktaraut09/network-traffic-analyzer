import express from 'express';
import * as logController from '../controllers/logController.js';

const router = express.Router();

router.get('/all-logs', logController.getAllLogs);
router.get('/top-ips', logController.getTopIPs);
router.get('/endpoints', logController.getEndpoints);
router.get('/failed-logins', logController.getFailedLogins);
router.get('/server-errors', logController.getServerErrors);
router.get('/methods-usage', logController.getMethodsUsage);
router.get('/status-summary', logController.getStatusSummary);
router.get('/top-error-ips', logController.getTopErrorIPs);
router.get('/traffic-by-hour', logController.getTrafficByHour);
router.get('/dashboard', logController.getDashboard);
router.get('/query-plan', logController.getQueryPlan);

// Paginated & filtered logs endpoint
router.get('/logs', logController.getLogs);

// Root path for logRoutes when mounted directly
router.get('/', logController.getLogs);

export default router;
