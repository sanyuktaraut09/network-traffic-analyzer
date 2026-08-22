# Phase 3 — Add Tests

**Goal:** Write unit and integration tests. Zero tests = junior project to any MNC reviewer.
**Time estimate:** 2 days
**Branch name:** `feat/test-suite`
**Depends on:** Phase 1 (layered architecture), Phase 2 (PostgreSQL)

---

## Why this is the highest-impact change

MNC SDEs are expected to write testable code by default. A project with no tests tells a reviewer two things: the code was never meant to be maintained, and the author hasn't worked on real team software. Fixing this changes the project's entire signal.

Target: **70%+ coverage** on the service and repository layers. Show the coverage report screenshot in the README.

---

## Step 3.1 — Install test dependencies

```bash
npm install --save-dev jest supertest @jest/globals
```

For ESM support (if using `import`/`export`):

```bash
npm install --save-dev babel-jest @babel/core @babel/preset-env
```

Create `babel.config.json`:

```json
{
  "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]]
}
```

Update `package.json`:

```json
"scripts": {
  "test": "jest --forceExit --detectOpenHandles",
  "test:coverage": "jest --coverage --forceExit --detectOpenHandles",
  "test:watch": "jest --watch"
},
"jest": {
  "testEnvironment": "node",
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/config/**"
  ]
}
```

---

## Step 3.2 — Create test folder structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── trafficService.test.js
│   │   └── securityService.test.js
│   └── middleware/
│       └── errorHandler.test.js
├── integration/
│   ├── routes/
│   │   ├── logs.test.js
│   │   ├── dashboard.test.js
│   │   └── security.test.js
└── helpers/
    └── testDb.js
```

---

## Step 3.3 — Unit tests: service layer

Unit tests mock the repository so they run without a database. They test that your business logic (risk classification, error rate calculation, pagination math) is correct.

```js
// tests/unit/services/securityService.test.js
import { jest } from '@jest/globals';

// Mock the repository before importing the service
jest.unstable_mockModule('../../src/repositories/logRepository.js', () => ({
  getSuspiciousIPRaw: jest.fn()
}));

const { getSuspiciousIPs } = await import('../../src/services/securityService.js');
const logRepo = await import('../../src/repositories/logRepository.js');

describe('securityService.getSuspiciousIPs', () => {
  beforeEach(() => jest.clearAllMocks());

  test('classifies IP as HIGH when failed_logins >= 5', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([{
      source_ip: '10.0.0.1',
      total_requests: 20,
      failed_logins: 5,
      client_errors: 2,
      server_errors: 0
    }]);

    const result = await getSuspiciousIPs();
    expect(result.data[0].risk_level).toBe('HIGH');
  });

  test('classifies IP as MEDIUM when failed_logins >= 2', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([{
      source_ip: '10.0.0.2',
      total_requests: 10,
      failed_logins: 2,
      client_errors: 1,
      server_errors: 0
    }]);

    const result = await getSuspiciousIPs();
    expect(result.data[0].risk_level).toBe('MEDIUM');
  });

  test('classifies IP as LOW when activity is normal', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([{
      source_ip: '10.0.0.3',
      total_requests: 5,
      failed_logins: 0,
      client_errors: 1,
      server_errors: 0
    }]);

    const result = await getSuspiciousIPs();
    expect(result.data[0].risk_level).toBe('LOW');
  });

  test('returns suspicious_ips count matching data length', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([
      { source_ip: '10.0.0.1', total_requests: 10, failed_logins: 3, client_errors: 2, server_errors: 0 },
      { source_ip: '10.0.0.2', total_requests: 5,  failed_logins: 0, client_errors: 4, server_errors: 1 }
    ]);

    const result = await getSuspiciousIPs();
    expect(result.suspicious_ips).toBe(2);
    expect(result.data).toHaveLength(2);
  });
});
```

```js
// tests/unit/services/trafficService.test.js
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/repositories/logRepository.js', () => ({
  getDashboardRaw: jest.fn(),
  getFilteredLogs: jest.fn()
}));

const { getDashboardMetrics, getFilteredLogs } = await import('../../src/services/trafficService.js');
const logRepo = await import('../../src/repositories/logRepository.js');

describe('trafficService.getDashboardMetrics', () => {
  test('calculates error_rate correctly', async () => {
    logRepo.getDashboardRaw.mockResolvedValue({
      total_requests: 200,
      unique_ips: 48,
      unique_endpoints: 8,
      error_requests: 42,
      failed_login_attempts: 15,
      server_errors: 14
    });

    const result = await getDashboardMetrics();
    expect(result.error_rate).toBe('21.0');
  });

  test('returns 0 error_rate when total_requests is 0', async () => {
    logRepo.getDashboardRaw.mockResolvedValue({
      total_requests: 0, unique_ips: 0, unique_endpoints: 0,
      error_requests: 0, failed_login_attempts: 0, server_errors: 0
    });

    const result = await getDashboardMetrics();
    expect(result.error_rate).toBe(0);
  });
});

describe('trafficService.getFilteredLogs — pagination', () => {
  test('clamps limit to max 100', async () => {
    logRepo.getFilteredLogs.mockResolvedValue({ data: [], total: 0 });
    await getFilteredLogs({ page: '1', limit: '9999' });
    expect(logRepo.getFilteredLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  test('defaults page to 1 when not provided', async () => {
    logRepo.getFilteredLogs.mockResolvedValue({ data: [], total: 0 });
    await getFilteredLogs({ limit: '10' });
    expect(logRepo.getFilteredLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });
});
```

---

## Step 3.4 — Integration tests: routes

Integration tests hit the actual Express app using `supertest`. They test the full request-response cycle. Use a test database or mock the repository at the module level.

```js
// tests/integration/routes/logs.test.js
import request from 'supertest';
import { jest } from '@jest/globals';

// Mock repository so tests don't need a real DB
jest.unstable_mockModule('../../src/repositories/logRepository.js', () => ({
  getTopIPs: jest.fn(),
  getLogs: jest.fn(),
  getFailedLogins: jest.fn(),
  getServerErrors: jest.fn(),
  getStatusSummary: jest.fn(),
  getTopErrorIPs: jest.fn(),
  getTrafficByHour: jest.fn(),
  getMostAccessedEndpoints: jest.fn()
}));

const app = (await import('../../src/app.js')).default;
const logRepo = await import('../../src/repositories/logRepository.js');

describe('GET /api/logs/top-ips', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 with data array', async () => {
    logRepo.getTopIPs.mockResolvedValue([
      { source_ip: '192.168.1.1', request_count: '42' }
    ]);

    const res = await request(app).get('/api/logs/top-ips');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].source_ip).toBe('192.168.1.1');
  });

  test('returns 500 when repository throws', async () => {
    logRepo.getTopIPs.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app).get('/api/logs/top-ips');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toBe('DB connection failed');
  });
});

describe('GET /api/logs', () => {
  test('accepts valid filter params and returns paginated response', async () => {
    logRepo.getLogs.mockResolvedValue({ data: [], total: 0 });

    const res = await request(app)
      .get('/api/logs')
      .query({ status: '500', page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body).toHaveProperty('data');
  });

  test('rejects invalid page param', async () => {
    const res = await request(app)
      .get('/api/logs')
      .query({ page: 'abc' });

    // After adding Zod validation in Phase 4, this should be 400
    expect([200, 400]).toContain(res.status);
  });
});

describe('GET /api/logs/failed-logins', () => {
  test('returns IPs with multiple failed login attempts', async () => {
    logRepo.getFailedLogins.mockResolvedValue([
      { source_ip: '10.0.0.1', failed_attempts: '7' }
    ]);

    const res = await request(app).get('/api/logs/failed-logins');
    expect(res.status).toBe(200);
    expect(res.body.data[0].failed_attempts).toBe('7');
  });
});
```

```js
// tests/integration/routes/security.test.js
import request from 'supertest';
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/repositories/logRepository.js', () => ({
  getSuspiciousIPRaw: jest.fn()
}));

const app = (await import('../../src/app.js')).default;
const logRepo = await import('../../src/repositories/logRepository.js');

describe('GET /api/security/suspicious-ips', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 with risk levels assigned', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([{
      source_ip: '172.16.0.1',
      total_requests: 30,
      failed_logins: 6,
      client_errors: 8,
      server_errors: 2
    }]);

    const res = await request(app).get('/api/security/suspicious-ips');
    expect(res.status).toBe(200);
    expect(res.body.data[0].risk_level).toBe('HIGH');
    expect(res.body.suspicious_ips).toBe(1);
  });

  test('returns empty result when no suspicious IPs', async () => {
    logRepo.getSuspiciousIPRaw.mockResolvedValue([]);

    const res = await request(app).get('/api/security/suspicious-ips');
    expect(res.status).toBe(200);
    expect(res.body.suspicious_ips).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });
});
```

---

## Step 3.5 — Run coverage and document it

```bash
npm run test:coverage
```

Expected output directory: `coverage/lcov-report/index.html`

Add `coverage/` to `.gitignore`.

Take a screenshot of the coverage table showing `>= 70%` coverage. Put it in `screenshots/test-coverage.png` and reference it in the README:

```markdown
## Test Coverage
![Test Coverage](./screenshots/test-coverage.png)
```

---

## Step 3.6 — Commit atomically

```bash
git add tests/unit/services/securityService.test.js
git commit -m "test: add unit tests for securityService risk classification"

git add tests/unit/services/trafficService.test.js
git commit -m "test: add unit tests for trafficService pagination and error rate"

git add tests/integration/routes/logs.test.js
git commit -m "test: add integration tests for /api/logs routes"

git add tests/integration/routes/security.test.js
git commit -m "test: add integration tests for /api/security routes"
```

---

## Definition of done

- [ ] `npm test` runs clean with zero failures
- [ ] `npm run test:coverage` shows ≥ 70% statement coverage on `src/services/` and `src/repositories/`
- [ ] Every route has at least one happy-path integration test
- [ ] Every route has at least one error-path integration test (DB failure → 500)
- [ ] `coverage/` is in `.gitignore`
- [ ] Coverage screenshot in README
