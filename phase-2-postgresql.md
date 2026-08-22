# Phase 2 — Swap SQLite → PostgreSQL

**Goal:** Replace SQLite with PostgreSQL. This is the single biggest perception upgrade for MNC recruiters.
**Time estimate:** 1 day
**Branch name:** `feat/postgres-migration`
**Depends on:** Phase 1 complete (repositories layer exists)

---

## Why this matters

SQLite is not used in any production backend system at scale. Every MNC (Google, Microsoft, Goldman, Walmart Labs) uses PostgreSQL, MySQL, or a managed equivalent. Swapping it signals you understand production database requirements: connection pooling, concurrent writes, proper query planning, and schema versioning.

---

## Step 2.1 — Install dependencies

```bash
npm install pg dotenv
npm install --save-dev node-pg-migrate
```

Remove `sqlite3` from `package.json`:

```bash
npm uninstall sqlite3
```

### Update `package.json` scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "migrate:up": "node-pg-migrate up",
  "migrate:down": "node-pg-migrate down",
  "test": "jest --forceExit"
}
```

---

## Step 2.2 — Set up `src/config/db.js`

Replace the sqlite3 connection with a `pg` Pool. The pool manages multiple concurrent connections automatically.

```js
// src/config/db.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'network_analyzer',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

---

## Step 2.3 — Create the migrations folder

```bash
mkdir migrations
```

Create `migrations/001_create_network_logs.sql`:

```sql
-- migrations/001_create_network_logs.sql
CREATE TABLE IF NOT EXISTS network_logs (
  id          SERIAL PRIMARY KEY,
  source_ip   VARCHAR(45)  NOT NULL,
  endpoint    VARCHAR(255) NOT NULL,
  method      VARCHAR(10)  NOT NULL,
  status_code SMALLINT     NOT NULL,
  timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes on columns used in GROUP BY, WHERE, and ORDER BY
CREATE INDEX IF NOT EXISTS idx_source_ip   ON network_logs (source_ip);
CREATE INDEX IF NOT EXISTS idx_status_code ON network_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_endpoint    ON network_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_timestamp   ON network_logs (timestamp DESC);

-- Composite index for the suspicious-IP query (filters on status range + groups by IP)
CREATE INDEX IF NOT EXISTS idx_ip_status   ON network_logs (source_ip, status_code);
```

Add `node-pg-migrate` config to `package.json`:

```json
"node-pg-migrate": {
  "migrations-dir": "migrations",
  "database-url-var": "DATABASE_URL"
}
```

Add `DATABASE_URL` to `.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/network_analyzer
```

Run the migration:

```bash
npm run migrate:up
```

---

## Step 2.4 — Update `logRepository.js` for pg syntax

PostgreSQL uses `$1, $2` placeholders (not `?`). Update every query.

Key differences from SQLite:
- `?` → `$1, $2, $3...`
- `strftime('%H', timestamp)` → `EXTRACT(HOUR FROM timestamp::timestamptz)`
- `db.all()` / `db.get()` → `pool.query()` returning `{ rows }`
- `INTEGER` auto-increment → `SERIAL`
- Date handling is much richer

```js
// src/repositories/logRepository.js  (PostgreSQL version)
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

export async function getTrafficByHour() {
  const { rows } = await pool.query(
    `SELECT EXTRACT(HOUR FROM timestamp) AS hour,
            COUNT(*) AS request_count
     FROM network_logs
     GROUP BY hour
     ORDER BY hour`
  );
  return rows;
}

export async function getDashboardRaw() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                              AS total_requests,
      COUNT(DISTINCT source_ip)                             AS unique_ips,
      COUNT(DISTINCT endpoint)                              AS unique_endpoints,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)  AS error_requests,
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END)  AS failed_login_attempts,
      SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)  AS server_errors
    FROM network_logs
  `);
  return rows[0];
}

export async function getSuspiciousIPRaw() {
  const { rows } = await pool.query(`
    SELECT
      source_ip,
      COUNT(*)                                              AS total_requests,
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END)  AS failed_logins,
      SUM(CASE WHEN status_code BETWEEN 400 AND 499
               THEN 1 ELSE 0 END)                          AS client_errors,
      SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)  AS server_errors
    FROM network_logs
    GROUP BY source_ip
    HAVING
      SUM(CASE WHEN status_code = 401
               AND endpoint = '/login' THEN 1 ELSE 0 END) >= 2
      OR SUM(CASE WHEN status_code BETWEEN 400 AND 499
                  THEN 1 ELSE 0 END) >= 3
    ORDER BY failed_logins DESC, client_errors DESC
  `);
  return rows;
}
```

---

## Step 2.5 — Run EXPLAIN ANALYZE and document it

This demonstrates query performance awareness — something MNC interviews ask about.

```sql
-- Run in psql after seeding data:
EXPLAIN ANALYZE
SELECT source_ip, COUNT(*) AS request_count
FROM network_logs
GROUP BY source_ip
ORDER BY request_count DESC
LIMIT 5;
```

Copy the output. Add a `QUERY_PERFORMANCE.md` in the repo with:
- The query
- The EXPLAIN ANALYZE output (before indexes)
- The EXPLAIN ANALYZE output (after indexes)
- One sentence explaining what changed and why

This is a talking point in every backend interview.

---

## Step 2.6 — Update the seed script

Move data generation out of `db.js` into a standalone `scripts/seed.js`:

```js
// scripts/seed.js
import pool from '../src/config/db.js';

const IPS = Array.from({ length: 50 }, (_, i) => `192.168.1.${i + 1}`);
const ENDPOINTS = ['/login', '/products', '/orders', '/checkout', '/profile', '/search', '/cart', '/payments'];
const METHODS = ['GET', 'POST', 'PUT'];
const STATUSES = [200, 200, 200, 200, 401, 404, 500]; // weighted toward 200

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const values = Array.from({ length: 500 }, () => {
      const ip = IPS[Math.floor(Math.random() * IPS.length)];
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      const method = METHODS[Math.floor(Math.random() * METHODS.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const ts = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      return `('${ip}', '${endpoint}', '${method}', ${status}, '${ts.toISOString()}')`;
    });
    await client.query(
      `INSERT INTO network_logs (source_ip, endpoint, method, status_code, timestamp)
       VALUES ${values.join(',')}`
    );
    await client.query('COMMIT');
    console.log('Seeded 500 rows.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
```

Add to `package.json`:

```json
"scripts": {
  "seed": "node scripts/seed.js"
}
```

---

## Step 2.7 — Commit atomically

```bash
git add src/config/db.js
git commit -m "feat: replace sqlite3 with pg Pool"

git add migrations/001_create_network_logs.sql
git commit -m "feat: add pg migration for network_logs with indexes"

git add src/repositories/logRepository.js
git commit -m "refactor: update all queries to PostgreSQL syntax"

git add scripts/seed.js
git commit -m "feat: add standalone seed script with 500 realistic rows"

git add QUERY_PERFORMANCE.md
git commit -m "docs: add EXPLAIN ANALYZE results before/after indexing"
```

---

## Definition of done

- [ ] `sqlite3` removed from `package.json`
- [ ] `pg` pool with environment-variable config
- [ ] Schema managed via migration file, not `CREATE TABLE IF NOT EXISTS` in `db.js`
- [ ] All queries use `$1`/`$2` placeholders
- [ ] `EXTRACT(HOUR FROM ...)` used for time-based grouping
- [ ] `EXPLAIN ANALYZE` output documented in `QUERY_PERFORMANCE.md`
- [ ] Seed script is separate from app startup
- [ ] `npm run migrate:up && npm run seed && npm start` works end to end
