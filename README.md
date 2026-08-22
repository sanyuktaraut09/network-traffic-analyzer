# 🔍 Network Traffic Analyzer

[![CI](https://github.com/sanyuktaraut09/network-traffic-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/sanyuktaraut09/network-traffic-analyzer/actions/workflows/ci.yml)

Production-grade backend analytics API for processing, querying, and ingesting network access logs in real time. Built using **Node.js (ESM), Express.js, PostgreSQL 16, Redis 7, BullMQ, Zod, and JWT (RBAC)**.

---

## ⚡ Quick Start (One Command)

The entire production stack (App + PostgreSQL 16 + Redis 7) starts with a single command:

```bash
git clone https://github.com/sanyuktaraut09/network-traffic-analyzer.git
cd network-traffic-analyzer
docker compose up
```

API available at **`http://localhost:3000`**.
The startup script automatically executes schema migrations, seeds default users/logs, and launches the application container.

---

## 🏗️ Architecture

The backend follows a strict 4-layer decoupled architecture:

```text
                     Client / HTTP Request
                               │
                               ▼
                        [ Express Router ]
                               │ (Request Validation via Zod)
                               ▼
                      [ Controller Layer ]
                               │ (HTTP Request/Response Handling)
                               ▼
                       [ Service Layer ]
                               │ (Business Logic, Risk Calculation)
                               ▼
                      [ Repository Layer ]
                               │ (Parameterized SQL Queries)
                               ▼
              ┌────────────────┴────────────────┐
              ▼                                 ▼
      [ PostgreSQL 16 ]                 [ Redis 7 / BullMQ ]
    (Analytical Database)               (Async Log Ingestion)
```

---

## 🔌 API Reference

| Endpoint | Method | Access / Role | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Authenticates user & issues JWT token |
| `/api/logs` | `GET` | Authenticated | Dynamic log filtering & pagination (`page`, `limit`, `status`, `ip`, `method`) |
| `/api/logs/dashboard` | `GET` | Authenticated | Aggregated traffic metrics & error rate calculation |
| `/api/logs/top-ips` | `GET` | Authenticated | Top 5 IP addresses by request volume |
| `/api/logs/endpoints` | `GET` | Authenticated | Most frequently accessed API endpoints |
| `/api/logs/failed-logins` | `GET` | Authenticated | IP addresses with repeated HTTP 401 failures |
| `/api/logs/query-plan` | `GET` | Authenticated | Executes `EXPLAIN ANALYZE` on indexed traffic query |
| `/api/security/suspicious-ips` | `GET` | `admin` | Security risk analysis (`LOW`, `MEDIUM`, `HIGH`) |
| `/api/ingest` | `POST` | `admin` | Asynchronous batch log ingestion via BullMQ queue |
| `/api/ingest/:jobId` | `GET` | `admin` | Polls background ingestion job execution status |

---

## 🗄️ Database & Optimization

### PostgreSQL Schema & Indexes

- `network_logs`: Stores IP address, endpoint, HTTP method, status code, and ISO timestamps.
- **Indexes**:
  - `idx_source_ip` on `network_logs(source_ip)`
  - `idx_status_code` on `network_logs(status_code)`
  - `idx_endpoint` on `network_logs(endpoint)`
  - `idx_timestamp` on `network_logs(timestamp DESC)`

### Query Performance (`EXPLAIN ANALYZE`)

Query performance was benchmarked before and after indexing (documented in [`QUERY_PERFORMANCE.md`](./QUERY_PERFORMANCE.md)):
- **Seq Scan (Unindexed)**: Execution time ~3.2ms on sample log set.
- **Bitmap Heap Scan / Index Scan (Indexed)**: Execution time reduced to **<0.1ms**, eliminating full table scans.

---

## 🧪 Test Coverage

The project maintains comprehensive test coverage across 9 test suites using Jest, Supertest, and Babel.

```text
Test Suites: 9 passed, 9 total
Tests:       51 passed, 51 total
Snapshots:   0 total
Time:        12.5 s
```

Run test suite locally:

```bash
npm run test:coverage
```

---

## 🧠 Design Decisions

- **Why PostgreSQL over SQLite**: Migrated to PostgreSQL to leverage connection pooling (`pg.Pool`), strict typing, concurrent writing capabilities, and native `EXPLAIN ANALYZE` diagnostics required for production analytics workloads.
- **Why BullMQ & Redis for Ingestion**: Decoupled log ingestion from HTTP request-response cycles. Incoming high-throughput log streams are queued in Redis via BullMQ, enabling non-blocking processing and resilient batch insertions.
- **Why JWT over Sessions**: Stateless JSON Web Tokens allow the analytics API to scale horizontally without session storage overhead or server-side state synchronization.
- **Role-Based Access Control (RBAC)**: Enforces least-privilege access. `analyst` accounts access read-only analytics, while sensitive security risk data and log ingestion pipelines are restricted to `admin` users.

---

## 🛠️ Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Run database migrations and seed data
npm run migrate:up
npm run seed

# 4. Start development server
npm run dev
```
