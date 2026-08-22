import express from 'express';

const router = express.Router();

// Stub for authentication routes (Phase 4)
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Auth routes will be implemented in Phase 4' });
});

export default router;
