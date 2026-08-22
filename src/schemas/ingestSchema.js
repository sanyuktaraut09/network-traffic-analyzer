/**
 * Folder: src/schemas/
 * Description: Zod validation schemas for log ingestion endpoint payloads.
 *
 * File: src/schemas/ingestSchema.js
 * Implementation details:
 * - Validates log entry data structure (source_ip, endpoint, method, status_code, timestamp).
 * - Uses z.string().ipv4() for IP validation.
 * - Enforces minimum 1 and maximum 1000 items batch payload limits.
 */

import { z } from 'zod';

export const LogEntrySchema = z.object({
  source_ip: z.string().ipv4({ message: 'Invalid IP address format' }),
  endpoint: z.string().startsWith('/', { message: 'Endpoint must start with /' }).max(255),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], {
    message: 'Method must be one of GET, POST, PUT, DELETE, PATCH'
  }),
  status_code: z.number().int().min(100).max(599, { message: 'HTTP status code must be between 100 and 599' }),
  timestamp: z.string().datetime({ message: 'Timestamp must be ISO 8601 string' }).optional()
});

export const IngestPayloadSchema = z.object({
  logs: z.array(LogEntrySchema).min(1, { message: 'At least 1 log entry is required' }).max(1000, { message: 'Maximum 1000 log entries allowed per batch' })
});
