/**
 * File: src/app.js
 * Description: Express Application Assembly module.
 *
 * Implementation details:
 * - Instantiates Express app and configures built-in JSON body parsing middleware.
 * - Mounts REST API routes under /api/logs, /api/security, and /api/auth.
 * - Provides backwards-compatible root mounts for legacy API clients.
 * - Registers centralized errorHandler middleware at the end of the middleware chain.
 * - Exports the Express app instance WITHOUT calling .listen(), allowing unit and integration
 *   test suites (Phase 3) to test HTTP routes without binding server network ports.
 */

import express from 'express';
import logRoutes from './routes/logRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Parse incoming request body as JSON
app.use(express.json());

// Healthcheck / Root endpoint
app.get('/', (req, res) => {
  res.send('Network Traffic Analyzer API is Running 🚀');
});

// Primary API route mounts
app.use('/api/logs', logRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/auth', authRoutes);

// Backwards-compatible legacy route mounts
app.use('/security', securityRoutes);
app.use('/', logRoutes);

// Centralised error handling middleware (must be registered last)
app.use(errorHandler);

export default app;
