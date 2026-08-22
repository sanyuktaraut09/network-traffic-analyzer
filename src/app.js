import express from 'express';
import logRoutes from './routes/logRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Network Traffic Analyzer API is Running 🚀');
});

// Primary API route mounts
app.use('/api/logs', logRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/auth', authRoutes);

// Backwards-compatible root mounts
app.use('/security', securityRoutes);
app.use('/', logRoutes);

// Centralised error handling middleware
app.use(errorHandler);

export default app;
