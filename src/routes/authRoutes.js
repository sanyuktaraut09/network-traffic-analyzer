/**
 * Folder: src/routes/
 * Description: Authentication router stub prepared for Phase 4 JWT integration.
 *
 * File: src/routes/authRoutes.js
 * Implementation details:
 * - Placeholders for auth routes (/login, /register) to be built in Phase 4.
 */

import express from 'express';

const router = express.Router();

// Stub for authentication routes (Phase 4)
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Auth routes will be implemented in Phase 4' });
});

export default router;
