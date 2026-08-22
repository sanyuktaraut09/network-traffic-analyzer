/**
 * Folder: src/config/
 * Description: BullMQ background message queue and worker configuration.
 *
 * File: src/config/queue.js
 * Implementation details:
 * - Initializes IORedis client connection for asynchronous job queuing.
 * - Instantiates BullMQ 'log-ingest' Queue for batch ingestion tasks.
 * - Configures BullMQ Worker to process queued batch log insertion jobs via logRepository.
 * - Sets retryStrategy: null to prevent infinite reconnect attempts when Redis is offline in test environments.
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as logRepo from '../repositories/logRepository.js';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;

export const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: () => null // Prevent continuous background retries when Redis is unavailable
});

// Suppress connection error logs in offline/mock testing environments
connection.on('error', () => {});

export const ingestQueue = new Queue('log-ingest', { connection });
ingestQueue.on('error', () => {});

// Worker process executing asynchronous batch log database insertions
export const worker = new Worker(
  'log-ingest',
  async (job) => {
    const { logs } = job.data;
    await logRepo.bulkInsertLogs(logs);
    return { inserted: logs.length };
  },
  { connection }
);

worker.on('error', () => {});

worker.on('completed', (job, result) => {
  console.log(`Ingest job ${job.id} completed: ${result.inserted} logs inserted`);
});

worker.on('failed', (job, err) => {
  console.error(`Ingest job ${job.id} failed:`, err.message);
});
