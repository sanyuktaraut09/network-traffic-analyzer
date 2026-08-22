/**
 * File: src/app.js
 * Description: Express Application Assembly module.
 *
 * Implementation details:
 * - Instantiates Express app and configures built-in JSON body parsing middleware.
 * - Mounts public authentication routes under /api/auth.
 * - Enforces JWT authentication middleware (requireAuth) on /api/logs analytics routes.
 * - Enforces admin RBAC authorization middleware (requireAuth, requireRole('admin')) on /api/security and /api/ingest routes.
 * - Registers centralized errorHandler middleware at the end of the middleware chain.
 * - Exports the Express app instance WITHOUT calling .listen(), allowing unit and integration
 *   test suites to test HTTP routes without binding server network ports.
 */

import express from 'express';
import logRoutes from './routes/logRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import ingestRoutes from './routes/ingestRoutes.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Parse incoming request body as JSON
app.use(express.json());

// Healthcheck / Root endpoint
app.get('/', (req, res) => {
  res.send('Network Traffic Analyzer API is Running 🚀');
});

// Public authentication routes
app.use('/api/auth', authRoutes);

// Protected analytics routes — Requires JWT authentication
app.use('/api/logs', requireAuth, logRoutes);

// Protected security analytics — Requires JWT authentication and admin role
app.use('/api/security', requireAuth, requireRole('admin'), securityRoutes);

// Protected log ingestion pipeline — Requires JWT authentication and admin role
app.use('/api/ingest', requireAuth, requireRole('admin'), ingestRoutes);

// Centralised error handling middleware (must be registered last)
app.use(errorHandler);

export default app;
