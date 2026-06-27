# 14 — Testing

> **Document Type:** Testing Strategy & Standards  
> **Audience:** All engineers, QA, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines the complete testing strategy for FinanceFlow — covering unit, integration, E2E, load, and security testing. Every feature shipped must meet the testing standards defined here.

---

## 1. Testing Philosophy

**Test behavior, not implementation.** Tests should verify that the system does the right thing, not that internal wiring is arranged a specific way. A test that breaks when you rename a private variable is a bad test.

**The Testing Pyramid:**

```
         /\
        /  \
       / E2E \          Small number, high value, slow
      /________\
     /Integration\      Medium number, high value, moderate speed
    /______________\
   /  Unit Tests   \    Large number, fast, isolated
  /________________\
```

**Coverage Target:** ≥ 80% line coverage overall, ≥ 95% on service layer, ≥ 90% on critical financial calculations.

---

## 2. Test Stack

| Type | Tool | Purpose |
|------|------|---------|
| Unit | Vitest | Service layer, utilities, validators |
| Integration | Vitest + Supertest | API route handlers with test DB |
| E2E | Playwright | User flows end-to-end |
| Load | k6 | API performance under load |
| Security | OWASP ZAP (manual) + `npm audit` | Vulnerability scanning |
| Contract | (Phase 2: Pact) | Frontend-backend API contract |

---

## 3. Unit Testing

### What to Unit Test
- Service layer methods (all business logic)
- Utility functions (money calculations, date helpers)
- Validators (Zod schemas)
- AI response validators
- Categorization logic

### What NOT to Unit Test
- Route handlers (integration tests cover these)
- Repository layer (integration tests with real DB)
- UI components (Playwright covers behavior)
- Prisma models (framework internals)

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        'src/features/**/*.service.ts': {
          lines: 95,
          functions: 95,
        },
      },
      exclude: [
        'src/app/**',
        '**/*.types.ts',
        '**/index.ts',
        'tests/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Unit Test Example — Transaction Service

```typescript
// tests/unit/features/transactions/transaction.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransactionService } from '@/features/transactions/transaction.service'
import { Decimal } from '@prisma/client/runtime/library'

// Mock dependencies
const mockTransactionRepo = {
  create: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
}
const mockWalletRepo = {
  findById: vi.fn(),
  updateBalance: vi.fn(),
}
const mockBudgetService = {
  updateSpend: vi.fn(),
}
const mockQueue = {
  enqueue: vi.fn(),
}

describe('TransactionService', () => {
  let service: TransactionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TransactionService(
      mockTransactionRepo as any,
      mockWalletRepo as any,
      mockBudgetService as any,
      mockQueue as any,
    )
  })

  describe('createTransaction', () => {
    it('creates a transaction and updates wallet balance', async () => {
      const wallet = {
        id: 'wallet-id',
        userId: 'user-id',
        balance: new Decimal('5000'),
        version: 0,
      }
      const transaction = {
        id: 'tx-id',
        userId: 'user-id',
        walletId: 'wallet-id',
        amount: new Decimal('500'),
        type: 'EXPENSE',
      }

      mockWalletRepo.findById.mockResolvedValue(wallet)
      mockTransactionRepo.create.mockResolvedValue(transaction)
      mockWalletRepo.updateBalance.mockResolvedValue(undefined)
      mockBudgetService.updateSpend.mockResolvedValue(undefined)

      const dto = {
        walletId: 'wallet-id',
        amount: '500.00',
        type: 'EXPENSE' as const,
        transactionDate: new Date().toISOString(),
      }

      const result = await service.createTransaction('user-id', dto)

      expect(result).toEqual(transaction)
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        'wallet-id',
        new Decimal('-500'),
        0
      )
    })

    it('throws ForbiddenError if wallet does not belong to user', async () => {
      mockWalletRepo.findById.mockResolvedValue({
        id: 'wallet-id',
        userId: 'different-user-id',  // Different user!
        balance: new Decimal('5000'),
        version: 0,
      })

      await expect(
        service.createTransaction('user-id', {
          walletId: 'wallet-id',
          amount: '500.00',
          type: 'EXPENSE',
          transactionDate: new Date().toISOString(),
        })
      ).rejects.toThrow('ForbiddenError')
    })

    it('throws NotFoundError if wallet does not exist', async () => {
      mockWalletRepo.findById.mockResolvedValue(null)

      await expect(
        service.createTransaction('user-id', {
          walletId: 'nonexistent-wallet',
          amount: '500.00',
          type: 'EXPENSE',
          transactionDate: new Date().toISOString(),
        })
      ).rejects.toThrow('NotFoundError')
    })

    it('enqueues budget alert notification after creating expense', async () => {
      const wallet = { id: 'wallet-id', userId: 'user-id', balance: new Decimal('5000'), version: 0 }
      const transaction = { id: 'tx-id', userId: 'user-id', walletId: 'wallet-id', amount: new Decimal('500'), type: 'EXPENSE', categoryId: 'cat-id' }

      mockWalletRepo.findById.mockResolvedValue(wallet)
      mockTransactionRepo.create.mockResolvedValue(transaction)
      mockWalletRepo.updateBalance.mockResolvedValue(undefined)
      mockBudgetService.updateSpend.mockResolvedValue({ alertThresholdBreached: true })

      await service.createTransaction('user-id', {
        walletId: 'wallet-id',
        categoryId: 'cat-id',
        amount: '500.00',
        type: 'EXPENSE',
        transactionDate: new Date().toISOString(),
      })

      expect(mockQueue.enqueue).toHaveBeenCalledWith('notification:budget-alert', expect.any(Object))
    })
  })

  describe('amount validation', () => {
    it.each([
      ['0.00', 'zero amount'],
      ['-100', 'negative amount'],
      ['10000001', 'exceeds maximum'],
    ])('rejects %s (%s)', async (amount, _) => {
      await expect(
        service.createTransaction('user-id', {
          walletId: 'wallet-id',
          amount,
          type: 'EXPENSE',
          transactionDate: new Date().toISOString(),
        })
      ).rejects.toThrow()
    })
  })
})
```

---

## 4. Integration Testing

### Setup: Test Database

```typescript
// tests/setup.ts
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } }
})

beforeAll(async () => {
  // Apply migrations to test DB
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
  })
  await testPrisma.$connect()
})

afterEach(async () => {
  // Clean all tables between tests (order matters for FK constraints)
  await testPrisma.$transaction([
    testPrisma.auditLog.deleteMany(),
    testPrisma.aIMessage.deleteMany(),
    testPrisma.aIConversation.deleteMany(),
    testPrisma.notification.deleteMany(),
    testPrisma.goalContribution.deleteMany(),
    testPrisma.savingsGoal.deleteMany(),
    testPrisma.budget.deleteMany(),
    testPrisma.transaction.deleteMany(),
    testPrisma.wallet.deleteMany(),
    testPrisma.category.deleteMany(),
    testPrisma.session.deleteMany(),
    testPrisma.user.deleteMany(),
  ])
})

afterAll(async () => {
  await testPrisma.$disconnect()
})
```

### Integration Test Example — Transaction API

```typescript
// tests/integration/api/transactions.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestServer } from '../helpers/server'
import { createTestUser, createTestWallet, loginTestUser } from '../helpers/fixtures'

describe('POST /api/v1/transactions', () => {
  let server: ReturnType<typeof createTestServer>
  let authToken: string
  let userId: string
  let walletId: string

  beforeEach(async () => {
    server = createTestServer()
    const user = await createTestUser({ email: 'test@example.com', plan: 'PREMIUM' })
    userId = user.id
    const wallet = await createTestWallet({ userId, balance: '10000' })
    walletId = wallet.id
    authToken = await loginTestUser(user)
  })

  it('creates a transaction and returns 201', async () => {
    const response = await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        walletId,
        type: 'EXPENSE',
        amount: '450.00',
        description: 'Swiggy order',
        merchant: 'Swiggy',
        transactionDate: new Date().toISOString(),
      })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.amount).toBe('450.00')
    expect(response.body.data.walletId).toBe(walletId)
  })

  it('returns 401 without authentication', async () => {
    const response = await server.post('/api/v1/transactions')
      .send({ walletId, type: 'EXPENSE', amount: '100', transactionDate: new Date().toISOString() })

    expect(response.status).toBe(401)
  })

  it('returns 403 when wallet belongs to another user', async () => {
    const otherUser = await createTestUser({ email: 'other@example.com' })
    const otherWallet = await createTestWallet({ userId: otherUser.id })

    const response = await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ walletId: otherWallet.id, type: 'EXPENSE', amount: '100', transactionDate: new Date().toISOString() })

    expect(response.status).toBe(403)
  })

  it('returns 400 for invalid amount', async () => {
    const response = await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ walletId, type: 'EXPENSE', amount: 'not-a-number', transactionDate: new Date().toISOString() })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('deducts from wallet balance after expense', async () => {
    await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ walletId, type: 'EXPENSE', amount: '500.00', transactionDate: new Date().toISOString() })

    const walletResponse = await server.get(`/api/v1/wallets/${walletId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(walletResponse.body.data.balance).toBe('9500.00')
  })

  it('respects idempotency key to prevent duplicate transactions', async () => {
    const payload = { walletId, type: 'EXPENSE', amount: '500.00', transactionDate: new Date().toISOString() }
    const key = 'idem_test_123'

    const r1 = await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key)
      .send(payload)

    const r2 = await server.post('/api/v1/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', key)
      .send(payload)

    expect(r1.status).toBe(201)
    expect(r2.status).toBe(200)
    expect(r2.body.data.id).toBe(r1.body.data.id)  // Same transaction returned
  })
})
```

---

## 5. E2E Testing (Playwright)

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 14'] } },
  ],
})
```

### E2E Test Example — Transaction Creation

```typescript
// tests/e2e/transactions/create-transaction.spec.ts
import { test, expect } from '@playwright/test'
import { login, createWallet } from '../helpers'

test.describe('Create Transaction', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'testuser@financeflow.in', 'TestPass123!')
    await createWallet(page, { name: 'Test Wallet', balance: '10000' })
  })

  test('user can add an expense transaction', async ({ page }) => {
    await page.goto('/transactions/new')

    await page.selectOption('[data-testid="tx-type"]', 'EXPENSE')
    await page.selectOption('[data-testid="wallet-select"]', { label: 'Test Wallet' })
    await page.fill('[data-testid="amount-input"]', '450')
    await page.fill('[data-testid="merchant-input"]', 'Swiggy')
    await page.fill('[data-testid="date-input"]', '2025-06-15')
    await page.click('[data-testid="save-transaction"]')

    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Transaction added')
    await expect(page).toHaveURL('/transactions')

    const firstRow = page.locator('[data-testid="transaction-row"]').first()
    await expect(firstRow).toContainText('Swiggy')
    await expect(firstRow).toContainText('₹450')
  })

  test('shows validation error for empty amount', async ({ page }) => {
    await page.goto('/transactions/new')
    await page.click('[data-testid="save-transaction"]')
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible()
  })
})
```

### Critical E2E User Flows (Must Always Pass)
1. Register → Verify email → Login → Add wallet → Add transaction
2. Set budget → Add transaction → See budget progress update
3. Create savings goal → Make contribution → See progress
4. Login with Google OAuth
5. Subscribe to Premium → Verify feature unlock
6. Export transactions as CSV

---

## 6. Load Testing (k6)

```javascript
// tests/load/transactions-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50
    { duration: '1m', target: 100 },  // Spike to 100
    { duration: '2m', target: 100 },  // Stay at 100
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // SLA thresholds
    errors: ['rate<0.01'],  // < 1% error rate
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const token = __ENV.TEST_AUTH_TOKEN

  const response = http.get(
    `${__ENV.API_BASE_URL}/api/v1/transactions?page=1&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has data field': (r) => JSON.parse(r.body).data !== undefined,
  })

  errorRate.add(response.status !== 200)
  sleep(1)
}
```

---

## 7. Test Coverage Rules

| Layer | Required Coverage |
|-------|-----------------|
| Service layer | ≥ 95% |
| Repository layer | ≥ 85% (integration tests) |
| Validators | ≥ 90% |
| Utility functions | ≥ 90% |
| Route handlers | ≥ 80% (integration tests) |
| UI components | Critical flows via Playwright |
| Overall | ≥ 80% |

### CI Coverage Gate
PRs that drop total coverage below 80% will fail the CI check and cannot be merged.

---

## 8. Test Data Management

### Factory Functions (avoid hardcoded test data)

```typescript
// tests/helpers/fixtures.ts
import { faker } from '@faker-js/faker'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/shared/utils/password'

export async function createTestUser(overrides: Partial<UserCreateInput> = {}) {
  return prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      passwordHash: await hashPassword('TestPass123!'),
      emailVerified: true,
      plan: 'FREE',
      ...overrides,
    }
  })
}

export async function createTestWallet(overrides: Partial<WalletCreateInput> & { userId: string }) {
  return prisma.wallet.create({
    data: {
      name: faker.finance.accountName(),
      type: 'BANK_ACCOUNT',
      balance: new Decimal('10000'),
      currency: 'INR',
      isDefault: true,
      ...overrides,
    }
  })
}
```

---

## 9. CI Test Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: financeflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/financeflow_test
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
