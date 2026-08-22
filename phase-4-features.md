# Phase 4 — Add Depth Features

**Goal:** Add the features that make this defensible in a technical interview and distinguishable from tutorials.
**Time estimate:** 2–3 days
**Branch name:** `feat/depth-features`
**Depends on:** Phase 1, Phase 2, Phase 3 complete

---

## Feature 4A — JWT Authentication + RBAC

### Why it matters
Every endpoint is currently public. `/security/suspicious-ips` being open is ironic. Adding auth with role-based access control gives you a real engineering decision to talk about in interviews: trade-offs between stateless JWT vs sessions, token expiry, refresh token patterns.

### Step 4A.1 — Install dependencies

```bash
npm install jsonwebtoken bcryptjs zod
```

### Step 4A.2 — Create `migrations/002_create_users.sql`

```sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'analyst',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_check CHECK (role IN ('admin', 'analyst'))
);

-- Seed a default admin (password: 'admin123' — change in prod)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$placeholder_replace_with_real_hash', 'admin')
ON CONFLICT DO NOTHING;
```

Generate the hash to put in the seed:

```js
// one-off in Node REPL:
import bcrypt from 'bcryptjs';
console.log(await bcrypt.hash('admin123', 10));
```

### Step 4A.3 — Create `src/repositories/userRepository.js`

```js
import pool from '../config/db.js';

export async function findByUsername(username) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return rows[0] || null;
}
```

### Step 4A.4 — Create `src/services/authService.js`

```js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/userRepository.js';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '8h';

export async function login(username, password) {
  const user = await userRepo.findByUsername(username);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );

  return { token, role: user.role, expiresIn: EXPIRES_IN };
}
```

### Step 4A.5 — Create `src/middleware/auth.js`

```js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or invalid Authorization header' } });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: { message: 'Token invalid or expired' } });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: { message: `Requires ${role} role` } });
    }
    next();
  };
}
```

### Step 4A.6 — Create `src/routes/authRoutes.js`

```js
import { Router } from 'express';
import { login } from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: { message: 'username and password required' } });
    }
    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
```

### Step 4A.7 — Apply middleware in `src/app.js`

```js
import { requireAuth, requireRole } from './middleware/auth.js';

// Public routes
app.use('/api/auth', authRoutes);

// All analytics require auth
app.use('/api/logs', requireAuth, logRoutes);

// Security analytics require admin role
app.use('/api/security', requireAuth, requireRole('admin'), securityRoutes);
```

---

## Feature 4B — Ingestion API with async queue

### Why it matters
Right now data is auto-seeded on startup. That means the project only reads — it never writes in a real way. Adding a `POST /ingest` endpoint with async processing via BullMQ turns this from a "read-only analytics layer over fake data" into an actual log pipeline. This is the most impressive single addition and gives you a data pipeline to talk about.

### Step 4B.1 — Install dependencies

```bash
npm install bullmq ioredis
```

Add Redis to `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 4B.2 — Create `src/config/queue.js`

```js
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as logRepo from '../repositories/logRepository.js';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null
});

export const ingestQueue = new Queue('log-ingest', { connection });

// Worker processes jobs from the queue
const worker = new Worker('log-ingest', async (job) => {
  const { logs } = job.data;
  await logRepo.bulkInsertLogs(logs);
  return { inserted: logs.length };
}, { connection });

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed: ${result.inserted} logs inserted`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});
```

### Step 4B.3 — Add `bulkInsertLogs` to `logRepository.js`

```js
export async function bulkInsertLogs(logs) {
  if (!logs.length) return;

  const values = logs.map((_, i) => {
    const base = i * 5;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  }).join(', ');

  const params = logs.flatMap(log => [
    log.source_ip,
    log.endpoint,
    log.method,
    log.status_code,
    log.timestamp || new Date().toISOString()
  ]);

  await pool.query(
    `INSERT INTO network_logs (source_ip, endpoint, method, status_code, timestamp) VALUES ${values}`,
    params
  );
}
```

### Step 4B.4 — Create the ingest schema with Zod

```js
// src/schemas/ingestSchema.js
import { z } from 'zod';

const LogEntrySchema = z.object({
  source_ip:   z.string().ip(),
  endpoint:    z.string().startsWith('/').max(255),
  method:      z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  status_code: z.number().int().min(100).max(599),
  timestamp:   z.string().datetime().optional()
});

export const IngestPayloadSchema = z.object({
  logs: z.array(LogEntrySchema).min(1).max(1000)
});
```

### Step 4B.5 — Create `src/routes/ingestRoutes.js`

```js
import { Router } from 'express';
import { ingestQueue } from '../config/queue.js';
import { IngestPayloadSchema } from '../schemas/ingestSchema.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const parsed = IngestPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', details: parsed.error.flatten() }
      });
    }

    const job = await ingestQueue.add('ingest', { logs: parsed.data.logs });

    res.status(202).json({
      message: 'Logs queued for processing',
      jobId: job.id,
      count: parsed.data.logs.length
    });
  } catch (err) {
    next(err);
  }
});

// GET /ingest/:jobId — poll job status
router.get('/:jobId', async (req, res, next) => {
  try {
    const job = await ingestQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: { message: 'Job not found' } });
    const state = await job.getState();
    res.json({ jobId: job.id, state, result: job.returnvalue || null });
  } catch (err) {
    next(err);
  }
});

export default router;
```

Wire it up in `app.js`:

```js
// Ingest requires auth; only admin can push logs
app.use('/api/ingest', requireAuth, requireRole('admin'), ingestRoutes);
```

---

## Feature 4C — Request validation middleware

### Step 4C.1 — Create `src/middleware/validate.js`

Generic Zod validation middleware. Pass a schema, it validates `req.query` or `req.body` and calls `next(err)` on failure.

```js
// src/middleware/validate.js
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const err = Object.assign(
        new Error('Invalid query parameters'),
        { status: 400, details: result.error.flatten() }
      );
      return next(err);
    }
    req.validatedQuery = result.data;
    next();
  };
}
```

### Step 4C.2 — Create schemas for existing routes

```js
// src/schemas/logSchemas.js
import { z } from 'zod';

export const LogFilterSchema = z.object({
  ip:       z.string().ip().optional(),
  status:   z.coerce.number().int().min(100).max(599).optional(),
  method:   z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  endpoint: z.string().startsWith('/').optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(10)
});
```

Apply in the route:

```js
import { validateQuery } from '../middleware/validate.js';
import { LogFilterSchema } from '../schemas/logSchemas.js';

router.get('/', requireAuth, validateQuery(LogFilterSchema), async (req, res, next) => {
  try {
    const result = await trafficService.getFilteredLogs(req.validatedQuery);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

Now invalid inputs return a structured 400 instead of a crash or empty result.

---

## Step 4 — Commit atomically

```bash
git add migrations/002_create_users.sql src/repositories/userRepository.js src/services/authService.js
git commit -m "feat: add user table and auth service with bcrypt + JWT"

git add src/middleware/auth.js src/routes/authRoutes.js
git commit -m "feat: add auth middleware and POST /api/auth/login route"

git add src/config/queue.js
git commit -m "feat: add BullMQ ingest queue and worker"

git add src/schemas/ingestSchema.js src/routes/ingestRoutes.js
git commit -m "feat: add POST /api/ingest with Zod validation and 202 queuing"

git add src/schemas/logSchemas.js src/middleware/validate.js
git commit -m "feat: add Zod request validation middleware for log filter route"
```

---

## Definition of done

- [ ] `POST /api/auth/login` returns a JWT on valid credentials
- [ ] `GET /api/logs/top-ips` returns 401 without a token
- [ ] `GET /api/security/suspicious-ips` returns 403 for `analyst` role, 200 for `admin`
- [ ] `POST /api/ingest` accepts an array of log objects and returns 202 with a job ID
- [ ] `GET /api/ingest/:jobId` returns the job state (`waiting`, `active`, `completed`, `failed`)
- [ ] `GET /api/logs?status=abc` returns 400 with validation error details
- [ ] `POST /api/ingest` with missing fields returns 400 with Zod error details
