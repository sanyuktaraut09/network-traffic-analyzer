/**
 * Folder: src/routes/
 * Description: Pure HTTP routing layer. Defines URI endpoints and maps them to controller handlers.
 *
 * File: src/routes/logRoutes.js
 * Implementation details:
 * - Express Router mapping endpoint paths to logController methods.
 * - Contains ZERO SQL queries and ZERO business logic.
 */

import express from 'express';
import * as logController from '../controllers/logController.js';

const router = express.Router();

// Traffic analytical endpoints
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

// Base route handler when mounted at /api/logs
router.get('/', logController.getLogs);

export default router;
