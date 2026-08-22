# Phase 1 — Restructure the Architecture

**Goal:** Transform the monolithic `routes/logRoutes.js` into a proper layered backend.
**Time estimate:** 1 day
**Branch name:** `refactor/layered-architecture`

---

## Current problem

Everything — HTTP parsing, SQL queries, business logic, risk classification — lives in one file (`routes/logRoutes.js`). A senior reviewer sees that and immediately classifies the project as a beginner tutorial, not a production codebase.

---

## Target folder structure

```
network-traffic-analyzer/
├── src/
│   ├── routes/
│   │   ├── logRoutes.js         ← HTTP only: parse req, call service, send res
│   │   ├── securityRoutes.js
│   │   └── authRoutes.js
│   ├── controllers/
│   │   ├── logController.js     ← thin glue between route and service
│   │   └── securityController.js
│   ├── services/
│   │   ├── trafficService.js    ← analytics logic (error rate, hourly breakdown)
│   │   └── securityService.js   ← risk classification (LOW/MEDIUM/HIGH logic)
│   ├── repositories/
│   │   └── logRepository.js     ← ALL SQL lives here, nowhere else
│   ├── middleware/
│   │   ├── auth.js              ← JWT verification (Phase 4)
│   │   ├── validate.js          ← Zod/Joi request validation
│   │   └── errorHandler.js      ← centralised error middleware
│   ├── config/
│   │   └── db.js                ← DB connection/pool setup
│   └── app.js                   ← Express app wired up, no server.listen()
├── server.js                    ← only does: import app, app.listen(PORT)
├── .env.example
├── .gitignore
└── package.json
```

---

## Step-by-step

### Step 1.1 — Create the folder structure

```bash
mkdir -p src/{routes,controllers,services,repositories,middleware,config}
```

### Step 1.2 — Create `src/app.js`

Move all `app.use()` and `app.get()` calls from `server.js` into `app.js`. Export the app without calling `.listen()`. This makes the app testable — test files can import the app without it binding a port.

```js
// src/app.js
import express from 'express';
import logRoutes from './routes/logRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());

app.use('/api/logs', logRoutes);
app.use('/api/security', securityRoutes);

app.use(errorHandler); // must be last

export default app;
```

```js
// server.js
import app from './src/app.js';
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Step 1.3 — Create `src/repositories/logRepository.js`

Move every SQL string here. Each function returns raw rows from the DB. No business logic, no HTTP concerns.

```js
// src/repositories/logRepository.js
import pool from '../config/db.js';

export async function getTopIPs(limit = 5) {
  const { rows } = await pool.query(
    `SELECT source_ip, COUNT(*) AS request_count
     FROM network_logs
     GROUP BY source_ip
     ORDER BY request_count DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getFailedLogins(threshold = 2) {
  const { rows } = await pool.query(
    `SELECT source_ip, COUNT(*) AS failed_attempts
     FROM network_logs
     WHERE endpoint = '/login' AND status_code = 401
     GROUP BY source_ip
     HAVING COUNT(*) > $1
     ORDER BY failed_attempts DESC`,
    [threshold]
  );
  return rows;
}

export async function getLogs({ ip, status, method, endpoint, page = 1, limit = 10 }) {
  const conditions = [];
  const params = [];

  if (ip)       { params.push(ip);       conditions.push(`source_ip = $${params.length}`); }
  if (status)   { params.push(status);   conditions.push(`status_code = $${params.length}`); }
  if (method)   { params.push(method);   conditions.push(`method = $${params.length}`); }
  if (endpoint) { params.push(endpoint); conditions.push(`endpoint = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT * FROM network_logs ${where} ORDER BY timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM network_logs ${where}`,
    params.slice(0, -2)
  );

  return { data: rows, total: parseInt(countRows[0].count) };
}

// Add remaining queries: getDashboard, getServerErrors, getTrafficByHour, etc.
```

### Step 1.4 — Create `src/services/trafficService.js`

Business logic only. Calls repository functions, transforms data, calculates derived values.

```js
// src/services/trafficService.js
import * as logRepo from '../repositories/logRepository.js';

export async function getTopIPs() {
  return logRepo.getTopIPs(5);
}

export async function getDashboardMetrics() {
  const raw = await logRepo.getDashboardRaw();
  return {
    ...raw,
    error_rate: raw.total_requests > 0
      ? ((raw.error_requests / raw.total_requests) * 100).toFixed(1)
      : 0
  };
}

export async function getFilteredLogs(filters) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 10));
  const result = await logRepo.getLogs({ ...filters, page, limit });
  return {
    page,
    limit,
    total: result.total,
    totalPages: Math.ceil(result.total / limit),
    data: result.data
  };
}
```

### Step 1.5 — Create `src/services/securityService.js`

Move the risk classification logic here — out of the route file.

```js
// src/services/securityService.js
import * as logRepo from '../repositories/logRepository.js';

function classifyRisk({ failed_logins, client_errors, total_requests }) {
  if (failed_logins >= 5 || client_errors / total_requests > 0.5) return 'HIGH';
  if (failed_logins >= 2 || client_errors >= 3) return 'MEDIUM';
  return 'LOW';
}

export async function getSuspiciousIPs() {
  const rows = await logRepo.getSuspiciousIPRaw();
  const enriched = rows.map(row => ({
    ...row,
    risk_level: classifyRisk(row)
  }));
  return {
    suspicious_ips: enriched.length,
    data: enriched
  };
}
```

### Step 1.6 — Create `src/middleware/errorHandler.js`

Central error handler — every `next(err)` call lands here. Consistent JSON error shape across all endpoints.

```js
// src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
}
```

In every controller, wrap async calls:

```js
export async function getTopIPs(req, res, next) {
  try {
    const data = await trafficService.getTopIPs();
    res.json({ data });
  } catch (err) {
    next(err); // goes to errorHandler
  }
}
```

### Step 1.7 — Add `.env.example`

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=network_analyzer
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=changeme_use_openssl_rand_hex_32
```

Add `.env` to `.gitignore`.

### Step 1.8 — Update git history

Commit each sub-step separately:

```bash
git add src/repositories/logRepository.js
git commit -m "refactor: extract all SQL into logRepository"

git add src/services/
git commit -m "refactor: add trafficService and securityService layers"

git add src/middleware/errorHandler.js
git commit -m "feat: add centralised error handler middleware"

git add src/app.js server.js
git commit -m "refactor: separate app setup from server entry point"
```

---

## Definition of done

- [ ] `routes/` files contain zero SQL strings
- [ ] `repositories/` files contain zero business logic
- [ ] `services/` files contain zero `req`/`res` references
- [ ] All async errors flow through `errorHandler`
- [ ] `server.js` is under 10 lines
- [ ] `app.js` exports the Express app without calling `.listen()`
