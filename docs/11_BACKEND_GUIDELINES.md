# 11 — Backend Guidelines

> **Document Type:** Backend Architecture & Standards  
> **Audience:** Backend engineers, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines how backend code is structured and written in FinanceFlow — covering Route Handlers, the Service Layer, the Repository Pattern, BullMQ workers, Prisma usage, Redis integration, and error handling patterns. All backend implementations must follow these guidelines.

---

## 1. Layer Responsibilities (Enforcement)

```
HTTP Request
    ↓
[Route Handler]      — Parse, validate, delegate, respond. Zero logic.
    ↓
[Service Layer]      — All business logic lives here. No HTTP, no Prisma.
    ↓
[Repository Layer]   — All DB queries. No logic. Returns domain types.
    ↓
[Prisma Client]      — ORM. Wrapped in repository. Never called elsewhere.
```

**Breaking this layering is a blocking PR review comment.**

---

## 2. Route Handler Pattern

Every route handler follows this exact structure:

```typescript
// src/app/api/v1/wallets/route.ts
import { withAuth } from '@/server/middleware/auth.middleware'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { rateLimit, RATE_LIMITS } from '@/server/middleware/rate-limit.middleware'
import { CreateWalletSchema } from '@/features/wallets/wallet.validators'
import { walletService } from '@/features/wallets/wallet.service'
import { ApiResponse } from '@/shared/utils/api-response'
import type { AuthenticatedRequest } from '@/server/middleware/auth.middleware'

// GET /api/v1/wallets
export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const wallets = await walletService.findAll(req.user.id)
    return ApiResponse.success(wallets)
  })
)

// POST /api/v1/wallets
export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // 1. Check plan limits
    await walletService.assertPlanLimit(req.user.id, req.user.plan)

    // 2. Validate body
    const body = CreateWalletSchema.parse(await req.json())

    // 3. Delegate to service
    const wallet = await walletService.create(req.user.id, body)

    // 4. Respond
    return ApiResponse.created(wallet)
  })
)
```

### Route Handler Rules
- Must be wrapped in `withAuth` (unless explicitly public)
- Must be wrapped in `withErrorHandler`
- Body parsed and validated with Zod **before** calling service
- Returns `ApiResponse.*` helper — never raw `Response.json()`
- No try/catch — `withErrorHandler` handles it
- No conditional logic — use service methods
- Max 15 lines per handler

---

## 3. Service Layer Pattern

```typescript
// src/features/wallets/wallet.service.ts
import { injectable } from 'tsyringe'  // or manual DI via constructor
import { WalletRepository } from './wallet.repository'
import { NotificationService } from '../notifications/notification.service'
import { NotFoundError, ForbiddenError, BusinessRuleError } from '@/shared/errors'
import { PLAN_LIMITS } from '@/shared/constants'
import { auditLog } from '@/lib/audit'
import type { Wallet, CreateWalletDto } from './wallet.types'

export class WalletService {
  constructor(
    private walletRepo: WalletRepository,
    private notificationService: NotificationService,
  ) {}

  async findAll(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findById(id, userId)
    if (!wallet) throw new NotFoundError('Wallet', id)
    return wallet
  }

  async assertPlanLimit(userId: string, plan: string): Promise<void> {
    const count = await this.walletRepo.countByUser(userId)
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.MAX_WALLETS ?? 3

    if (count >= limit) {
      throw new BusinessRuleError(
        'PLAN_LIMIT_REACHED',
        `Your ${plan} plan allows a maximum of ${limit} wallets. Upgrade to add more.`
      )
    }
  }

  async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    // If this is the first wallet, make it default
    const existingCount = await this.walletRepo.countByUser(userId)
    const isDefault = existingCount === 0 ? true : (dto.isDefault ?? false)

    // If setting as default, unset any existing default
    if (isDefault) {
      await this.walletRepo.unsetDefault(userId)
    }

    const wallet = await this.walletRepo.create({
      userId,
      ...dto,
      isDefault,
      balance: dto.initialBalance ?? '0',
    })

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'wallet',
      resourceId: wallet.id,
      newValue: { name: wallet.name, type: wallet.type },
    })

    return wallet
  }

  async delete(id: string, userId: string): Promise<void> {
    const wallet = await this.findById(id, userId)

    if (wallet.isDefault) {
      throw new BusinessRuleError(
        'CANNOT_DELETE_DEFAULT_WALLET',
        'Cannot delete your default wallet. Set another wallet as default first.'
      )
    }

    const txCount = await this.walletRepo.countTransactions(id)
    if (txCount > 0) {
      // Soft delete — keep historical transactions
      await this.walletRepo.softDelete(id, userId)
    } else {
      // No transactions — can soft delete cleanly
      await this.walletRepo.softDelete(id, userId)
    }

    await auditLog({ userId, action: 'DELETE', resource: 'wallet', resourceId: id })
  }
}

// Singleton instance (or use DI container)
export const walletService = new WalletService(
  new WalletRepository(),
  notificationService,
)
```

### Service Layer Rules
- Constructor takes only repositories and other services (DI)
- Returns **domain types** (`Wallet`), never Prisma types (`PrismaWallet`)
- Throws typed `AppError` subclasses — never raw errors
- Writes audit logs for all mutating operations
- Never imports from `next/server`
- Methods are async, named as verbs (`findAll`, `create`, `delete`, `assertPlanLimit`)

---

## 4. Repository Pattern

```typescript
// src/features/wallets/wallet.repository.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type { Wallet, CreateWalletData } from './wallet.types'

export class WalletRepository {
  private readonly base = { deletedAt: null }

  async findAll(userId: string): Promise<Wallet[]> {
    const rows = await prisma.wallet.findMany({
      where: { userId, ...this.base },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return rows.map(this.toDomain)
  }

  async findById(id: string, userId: string): Promise<Wallet | null> {
    const row = await prisma.wallet.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async countByUser(userId: string): Promise<number> {
    return prisma.wallet.count({ where: { userId, ...this.base } })
  }

  async countTransactions(walletId: string): Promise<number> {
    return prisma.transaction.count({
      where: { walletId, deletedAt: null },
    })
  }

  async create(data: CreateWalletData): Promise<Wallet> {
    const row = await prisma.wallet.create({ data })
    return this.toDomain(row)
  }

  async unsetDefault(userId: string): Promise<void> {
    await prisma.wallet.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.wallet.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async updateBalance(
    id: string,
    delta: Decimal,
    expectedVersion: number
  ): Promise<boolean> {
    const result = await prisma.wallet.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: {
        balance: { increment: delta },
        version: { increment: 1 },
      },
    })
    return result.count > 0
  }

  // Domain mapping — never leak Prisma types outside repository
  private toDomain(row: PrismaWallet): Wallet {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as WalletType,
      balance: row.balance,      // Decimal stays as Decimal
      currency: row.currency,
      isDefault: row.isDefault,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
```

### Repository Rules
- Spread `{ deletedAt: null }` on every query for soft-delete tables
- Always include `userId` in WHERE for user-owned resources
- `toDomain()` maps Prisma rows to typed domain objects — this is the only place Prisma types are used
- No business logic
- No throwing custom errors — return `null` for not-found, let service throw

---

## 5. Prisma Usage Rules

### Client Singleton (Required)

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }]
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Why singleton?** Serverless functions and hot module reloading create new `PrismaClient` instances on every invocation without this pattern, exhausting database connections.

### Prisma Dos and Don'ts

```typescript
// ✅ DO: Select only needed fields
await prisma.user.findFirst({
  where: { id: userId },
  select: { id: true, name: true, plan: true }
})

// ❌ DON'T: Select everything when you need 3 fields
await prisma.user.findUnique({ where: { id: userId } })

// ✅ DO: Use transactions for multi-step operations
await prisma.$transaction([
  prisma.transaction.create({ data: txData }),
  prisma.wallet.update({ where: { id }, data: { balance: newBalance } }),
])

// ❌ DON'T: Sequential awaits without transaction (inconsistent on failure)
await prisma.transaction.create({ data: txData })
await prisma.wallet.update({ where: { id }, data: { balance: newBalance } })

// ✅ DO: Use Prisma's tagged template literals for raw SQL
await prisma.$queryRaw`SELECT * FROM transactions WHERE user_id = ${userId}`

// ❌ DON'T: String interpolation in raw queries (SQL injection)
await prisma.$queryRaw(`SELECT * FROM transactions WHERE user_id = '${userId}'`)
```

### Connection Pooling

In serverless environments (Vercel), each function invocation may open a new DB connection. Use a connection pooler:

- **Supabase / Neon:** Built-in PgBouncer — set `?pgbouncer=true&connection_limit=1` in `DATABASE_URL`
- **Prisma Accelerate:** Managed connection pool + query caching (Phase 2)

```
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
```

---

## 6. Redis Usage Patterns

```typescript
// src/lib/redis.ts
import { Redis } from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error')
})
```

### Cache Helper

```typescript
// src/lib/cache.ts
import { redis } from './redis'

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as T
  } catch {
    // Redis unavailable — fall through to DB
  }

  const data = await fetcher()

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    // Cache write failed — still return data
  }

  return data
}

// Usage in service
async getDashboardSummary(userId: string, month: string) {
  return getOrSet(
    `user:dashboard:${userId}:${month}`,
    300,  // 5 minutes
    () => this.analyticsRepo.getDashboardSummary(userId, month)
  )
}
```

**Redis Fail-Open:** If Redis is unavailable, the system falls back to the database. Never let a Redis outage take down the API.

---

## 7. BullMQ Worker Implementation

```typescript
// src/workers/email.worker.ts
import { Worker, Job } from 'bullmq'
import { redis } from '@/lib/redis'
import { resend } from '@/lib/resend'
import { logger } from '@/lib/logger'
import type { EmailJobData } from '@/lib/queues'
import { renderEmailTemplate } from '@/features/notifications/email.templates'

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, template, variables } = job.data
    const childLogger = logger.child({ jobId: job.id, template, to })

    childLogger.info('Processing email job')

    const html = renderEmailTemplate(template, variables)

    const result = await resend.emails.send({
      from: 'FinanceFlow <noreply@financeflow.in>',
      to,
      subject,
      html,
    })

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`)
    }

    childLogger.info({ messageId: result.data?.id }, 'Email sent successfully')
    return { messageId: result.data?.id }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email job completed')
})

emailWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, err: error }, 'Email job failed')
})
```

### Worker Bootstrap (runs as separate process)

```typescript
// src/workers/index.ts
import { emailWorker } from './email.worker'
import { notificationWorker } from './notification.worker'
import { aiWorker } from './ai.worker'
import { reportWorker } from './report.worker'
import { paymentWorker } from './payment.worker'
import { logger } from '@/lib/logger'

logger.info('Starting BullMQ workers...')

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — closing workers gracefully')
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    aiWorker.close(),
    reportWorker.close(),
    paymentWorker.close(),
  ])
  process.exit(0)
})

logger.info({
  workers: ['email', 'notification', 'ai', 'report', 'payment']
}, 'All workers started')
```

---

## 8. Environment Validation (Startup)

The app validates all required environment variables at startup. Missing secrets cause an immediate crash with a clear error message — never a silent runtime failure.

```typescript
// src/lib/env.ts — see full implementation in 08_SECURITY.md
// This runs at module load time, so if a secret is missing,
// the app crashes before accepting any requests.
export const env = envSchema.parse(process.env)
```

---

## 9. Anti-Patterns (Backend)

| Anti-Pattern | Impact | Fix |
|-------------|--------|-----|
| Fat route handlers with business logic | Untestable, violates SRP | Move to service layer |
| Calling `prisma` directly in route handlers | Bypasses repository | Use repository pattern |
| Returning Prisma types from repositories | Leaks DB structure, breaks abstraction | Map to domain types in `toDomain()` |
| `JSON.stringify` for Decimal values | Serializes as string without precision control | Always call `.toFixed(2)` or `.toString()` |
| Not using `$transaction` for multi-step writes | Inconsistent state on partial failure | Always use Prisma transaction |
| Redis fail-closed (throws if Redis down) | Redis outage takes down the API | Wrap Redis calls in try/catch, fall back to DB |
| Workers in same process as API | Worker crash affects API, scaling is coupled | Run workers as separate process |
| `findUnique` instead of `findFirst` for user-scoped queries | Can't add `userId` to where clause | Use `findFirst` with `{ id, userId }` |
| Logging user passwords or tokens | Security breach | Use Pino redact config |
