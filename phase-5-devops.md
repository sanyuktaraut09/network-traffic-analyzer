# Phase 5 — DevOps Finishing Layer

**Goal:** Make the project look production-adjacent, not just locally runnable. One command should start everything.
**Time estimate:** 1 day
**Branch name:** `feat/devops`
**Depends on:** Phases 1–4 complete

---

## Why this matters

A recruiter or hiring engineer who clones your repo has 5 minutes. If they can't run it in one command, they won't run it at all. Docker Compose, a CI badge, and a clean git history are the difference between a project that looks maintained and one that looks abandoned.

---

## Step 5.1 — Dockerize the application

### Create `Dockerfile`

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

### Create `.dockerignore`

```
node_modules
coverage
.env
*.log
.git
```

---

## Step 5.2 — Create `docker-compose.yml`

One command starts the app, PostgreSQL, and Redis.

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: network_analyzer
      DB_USER: postgres
      DB_PASSWORD: postgres
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: dev_secret_replace_in_production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "npm run migrate:up && npm run seed && node server.js"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: network_analyzer
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

### Create `docker-compose.test.yml`

Separate compose for the test environment used by CI:

```yaml
# docker-compose.test.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: network_analyzer_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Add a test environment `.env.test`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/network_analyzer_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test_secret
```

---

## Step 5.3 — GitHub Actions CI pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: network_analyzer_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/network_analyzer_test
        run: npm run migrate:up

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/network_analyzer_test
          JWT_SECRET: test_secret_ci
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/lcov-report/
```

After your first successful CI run, a green badge appears on your repo. Add it to the README:

```markdown
[![CI](https://github.com/sanyuktaraut09/network-traffic-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/sanyuktaraut09/network-traffic-analyzer/actions/workflows/ci.yml)
```

---

## Step 5.4 — Clean up the git history

Right now the repo has 3 commits. Rebuild it with meaningful atomic commits that tell a story. This is what interviewers check when they open your repo.

Target commit history (most recent first):

```
feat: add GitHub Actions CI with PostgreSQL and Redis services
feat: dockerize app with docker-compose for one-command startup
feat: add Zod validation middleware for query and body params
feat: add BullMQ ingest queue and POST /api/ingest endpoint
feat: add JWT auth middleware and RBAC (admin/analyst roles)
test: add integration tests for security routes
test: add integration tests for log filter and pagination routes
test: add unit tests for securityService risk classification
test: add unit tests for trafficService error rate and pagination
feat: add pg migration runner and schema versioning
feat: replace sqlite3 with pg connection pool
feat: add PostgreSQL migration 001_create_network_logs with indexes
docs: add EXPLAIN ANALYZE results before and after indexing
refactor: add centralised error handler middleware
refactor: add request validation middleware skeleton
refactor: extract security logic into securityService
refactor: extract analytics logic into trafficService
refactor: move all SQL into logRepository
refactor: separate app setup from server entry point (app.js)
chore: initial project structure
```

To rebuild cleanly (do this on a fresh branch):

```bash
git checkout --orphan clean-history
git add -A
git commit -m "chore: initial project structure"
# Then re-add changes in the order above
```

---

## Step 5.5 — Update the README

Replace the current README with one that leads with the outcome, not the learning outcomes.

### README structure

```markdown
# Network Traffic Analyzer

[![CI](badge-url)](actions-url)

Backend analytics API for processing and querying network access logs.
Built with Node.js, Express, PostgreSQL, Redis, and BullMQ.

## Quick start

\`\`\`bash
git clone https://github.com/sanyuktaraut09/network-traffic-analyzer
cd network-traffic-analyzer
docker compose up
\`\`\`

API available at http://localhost:3000

## Architecture

[brief description of layers: routes → controllers → services → repositories]
[link to architecture diagram or ASCII diagram]

## API Reference

[table of endpoints, auth requirements, example responses]

## Database

[schema, indexes, link to QUERY_PERFORMANCE.md]

## Test coverage

![Coverage](./screenshots/test-coverage.png)

## Design decisions

- Why PostgreSQL over SQLite: [2 sentences]
- Why BullMQ for ingestion: [2 sentences]
- Why JWT over sessions: [2 sentences]
- RBAC model: [1 sentence]
```

The "Design decisions" section is what separates a strong portfolio project from one that just works. It shows you made deliberate choices.

---

## Step 5.6 — Commit atomically

```bash
git add Dockerfile .dockerignore
git commit -m "chore: add Dockerfile with non-root user"

git add docker-compose.yml docker-compose.test.yml
git commit -m "feat: add docker-compose with postgres and redis services"

git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI pipeline with test DB"

git add README.md
git commit -m "docs: rewrite README with quick start, architecture, and design decisions"
```

---

## Definition of done

- [ ] `docker compose up` starts the app, runs migrations, seeds data, and serves on port 3000
- [ ] `docker compose up` is the only instruction needed in the README quickstart
- [ ] CI runs on every push to `main` and every PR
- [ ] Green CI badge visible on the GitHub repo page
- [ ] ≥ 20 atomic commits in git history telling a coherent story
- [ ] README has: badge, one-command quickstart, architecture section, design decisions section
- [ ] `node_modules`, `coverage`, `.env` are all in `.gitignore`
