/**
 * Folder: src/schemas/
 * Description: Zod validation schemas for query parameters on log endpoints.
 *
 * File: src/schemas/logSchemas.js
 * Implementation details:
 * - Validates and coerces query parameters (status, page, limit, method, ip, endpoint).
 * - Uses z.string().ipv4() for IPv4 format validation.
 * - Implements type coercion for string query inputs to numeric integers.
 */

import { z } from 'zod';

export const LogFilterSchema = z.object({
  ip: z.string().ipv4().optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  endpoint: z.string().startsWith('/').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
