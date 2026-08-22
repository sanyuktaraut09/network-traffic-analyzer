/**
 * Folder: src/routes/
 * Description: Express router for asynchronous batch log ingestion pipeline endpoints.
 *
 * File: src/routes/ingestRoutes.js
 * Implementation details:
 * - POST /api/ingest validates payload via IngestPayloadSchema and enqueues BullMQ batch ingestion job.
 * - GET /api/ingest/:jobId polls BullMQ background job state and return payload.
 * - Features robust fallback to direct bulk DB insertion if Redis connection is unavailable.
 */

import { Router } from 'express';
import { ingestQueue } from '../config/queue.js';
import { IngestPayloadSchema } from '../schemas/ingestSchema.js';
import { validateBody } from '../middleware/validate.js';
import * as logRepo from '../repositories/logRepository.js';

const router = Router();

/**
 * POST /api/ingest
 * Accepts array of network log objects and queues them for asynchronous batch processing.
 */
router.post('/', validateBody(IngestPayloadSchema), async (req, res, next) => {
  try {
    const logs = req.validatedBody.logs;

    try {
      // Attempt to push batch log ingestion job to BullMQ queue
      const job = await ingestQueue.add('ingest', { logs });

      return res.status(202).json({
        message: 'Logs queued for processing',
        jobId: job.id,
        count: logs.length
      });
    } catch (queueErr) {
      // Direct insertion fallback if Redis queue is offline
      await logRepo.bulkInsertLogs(logs);
      return res.status(202).json({
        message: 'Logs inserted directly via fallback pipeline',
        jobId: 'direct-insert',
        count: logs.length
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ingest/:jobId
 * Polls status of a queued batch ingestion job.
 */
router.get('/:jobId', async (req, res, next) => {
  try {
    if (req.params.jobId === 'direct-insert') {
      return res.json({
        jobId: 'direct-insert',
        state: 'completed',
        result: { inserted: 'direct' }
      });
    }

    const job = await ingestQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        error: {
          message: 'Job not found',
          status: 404,
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });
    }

    const state = await job.getState();
    res.json({
      jobId: job.id,
      state,
      result: job.returnvalue || null
    });
  } catch (err) {
    next(err);
  }
});

export default router;
