# 09 — Coding Standards

> **Document Type:** Engineering Standards  
> **Audience:** All engineers, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines how code is written, reviewed, and maintained across the FinanceFlow codebase. Standards exist to ensure the code is readable, consistent, safe, and maintainable by any engineer on the team — including AI agents.

**Rule: If your code would confuse a new engineer (or an AI agent) on their first day, refactor it before merging.**

---

## 1. TypeScript Standards

### Strict Mode (Non-Negotiable)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Definitions

```typescript
// GOOD: Explicit return types on all functions
async function createTransaction(userId: string, dto: CreateTransactionDto): Promise<Transaction> { }

// BAD: Implicit return type
async function createTransaction(userId, dto) { }

// GOOD: Named types over inline objects
type CreateTransactionDto = {
  walletId: string
  amount: Decimal
  type: TransactionType
}

// BAD: Inline complex types
function create(dto: { walletId: string; amount: Decimal; type: 'INCOME' | 'EXPENSE' | 'TRANSFER' }) { }

// GOOD: Use discriminated unions for state
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

// BAD: Separate boolean flags
let isLoading: boolean
let isError: boolean
let data: T | null
```

### Forbidden Patterns
```typescript
// NEVER use `any`
const data: any = response.json()  // BAD

// Use `unknown` and narrow
const data: unknown = response.json()  // GOOD
if (isTransaction(data)) { ... }

// NEVER use non-null assertion on external data
const userId = request.headers.get('x-user-id')!  // BAD

// Validate explicitly
const userId = request.headers.get('x-user-id')
if (!userId) throw new UnauthorizedError()  // GOOD

// NEVER use `as` to bypass type safety
const tx = data as Transaction  // BAD (no validation)

// Parse with Zod
const tx = TransactionSchema.parse(data)  // GOOD
```

---

## 2. Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Variables | camelCase | `transactionAmount` |
| Functions | camelCase | `createTransaction` |
| Classes | PascalCase | `TransactionService` |
| Interfaces | PascalCase | `CreateTransactionDto` |
| Types | PascalCase | `TransactionType` |
| Enums | PascalCase | `TransactionStatus` |
| Enum values | UPPER_SNAKE | `INCOME`, `EXPENSE` |
| Constants | UPPER_SNAKE | `MAX_WALLETS_PER_USER` |
| Files (modules) | kebab-case | `transaction.service.ts` |
| Files (React) | PascalCase | `TransactionCard.tsx` |
| CSS classes | kebab-case (Tailwind) | `transaction-card` |
| Database tables | snake_case | `transactions` |
| Database columns | snake_case | `transaction_date` |
| API routes | kebab-case | `/api/v1/savings-goals` |

---

## 3. File Organization Rules

### Feature Module Structure
Every feature module must follow this structure exactly:

```
features/transactions/
├── transaction.service.ts       # Business logic
├── transaction.repository.ts   # Data access
├── transaction.types.ts        # Domain types (NOT Prisma types)
├── transaction.validators.ts   # Zod schemas
├── transaction.errors.ts       # Feature-specific errors
├── transaction.categorizer.ts  # Categorization logic (feature-specific)
└── __tests__/
    ├── transaction.service.test.ts
    └── transaction.repository.test.ts
```

### Import Order (enforced by ESLint)
```typescript
// 1. Node built-ins
import { randomBytes } from 'crypto'

// 2. Third-party packages
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

// 3. Internal absolute imports (using path aliases)
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/shared/utils/api-response'

// 4. Internal relative imports (same feature)
import { TransactionRepository } from './transaction.repository'
import type { CreateTransactionDto } from './transaction.types'
```

---

## 4. Error Handling

### Error Hierarchy

```typescript
// src/shared/errors/base.error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown[]
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', `${resource}${id ? ` (${id})` : ''} was not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission for this action') {
    super('FORBIDDEN', message, 403)
  }
}

export class ValidationError extends AppError {
  constructor(details: { field: string; message: string }[]) {
    super('VALIDATION_ERROR', 'Request validation failed', 400, details)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409)
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 422)
  }
}
```

### Route Handler Error Boundary

```typescript
// src/shared/utils/with-error-handler.ts
import { logger } from '@/lib/logger'
import { AppError } from '@/shared/errors/base.error'
import { ZodError } from 'zod'

export function withErrorHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
        return ApiResponse.error('VALIDATION_ERROR', 'Validation failed', 400, details)
      }

      if (error instanceof AppError) {
        return ApiResponse.error(error.code, error.message, error.statusCode, error.details)
      }

      // Unexpected errors
      logger.error({ err: error, url: req.url }, 'Unhandled error in route handler')
      Sentry.captureException(error)

      return ApiResponse.error('INTERNAL_ERROR', 'An unexpected error occurred', 500)
    }
  }
}
```

---

## 5. Async/Await Rules

```typescript
// GOOD: Parallel operations
const [wallets, categories] = await Promise.all([
  walletRepo.findAll(userId),
  categoryRepo.findAll(userId),
])

// BAD: Sequential when parallel is possible
const wallets = await walletRepo.findAll(userId)
const categories = await categoryRepo.findAll(userId)

// GOOD: Handle all rejections
const results = await Promise.allSettled([op1(), op2()])
results.forEach(result => {
  if (result.status === 'rejected') logger.error(result.reason)
})

// BAD: Fire and forget without error handling
someAsyncOperation()  // Uncaught promise rejection!

// GOOD: Fire and forget WITH error handling
someAsyncOperation().catch(err => logger.error(err, 'Background op failed'))
```

---

## 6. Comments and Documentation

```typescript
/**
 * Creates a new transaction and updates the wallet balance atomically.
 * 
 * If a categoryId is not provided, the AI categorizer is invoked to
 * suggest a category based on merchant and description.
 * 
 * Budget spending is updated asynchronously via the notification queue
 * to avoid blocking the response.
 *
 * @throws {NotFoundError} If wallet or category does not exist
 * @throws {ForbiddenError} If wallet does not belong to userId
 * @throws {BusinessRuleError} If transfer would result in negative balance on credit card
 */
async function createTransaction(
  userId: string,
  dto: CreateTransactionDto
): Promise<Transaction> {
  // ...
}

// GOOD: Comments explain WHY, not WHAT
// Using optimistic locking here because wallet balance can be updated by
// concurrent transaction creates and we need to detect conflicts
await walletRepo.updateBalanceOptimistic(walletId, amount, wallet.version)

// BAD: Comments explaining obvious code
// Increment the count by one
count++
```

---

## 7. Constants and Magic Numbers

```typescript
// src/shared/constants/index.ts — GOOD
export const AUTH = {
  ACCESS_TOKEN_TTL_SECONDS: 900,        // 15 minutes
  REFRESH_TOKEN_TTL_DAYS: 30,
  PASSWORD_SALT_ROUNDS: 12,
  MAX_SESSIONS_FREE: 3,
  MAX_SESSIONS_PREMIUM: 10,
  RESET_TOKEN_TTL_HOURS: 1,
  VERIFY_TOKEN_TTL_HOURS: 24,
} as const

export const PLAN_LIMITS = {
  FREE: {
    MAX_WALLETS: 3,
    MAX_TRANSACTIONS_PER_MONTH: 100,
    MAX_BUDGETS: 5,
    MAX_GOALS: 3,
    AI_MESSAGES_PER_DAY: 5,
  },
  PREMIUM: {
    MAX_WALLETS: 20,
    MAX_TRANSACTIONS_PER_MONTH: Infinity,
    MAX_BUDGETS: Infinity,
    MAX_GOALS: Infinity,
    AI_MESSAGES_PER_DAY: 50,
  },
} as const

// BAD: Magic numbers scattered in code
if (sessions.length > 3) { ... }   // Why 3?
await sleep(900000)                  // What's 900000?
```

---

## 8. Code Review Checklist

Every PR must pass this checklist before merge:

### Security
- [ ] No user input used without Zod validation
- [ ] All DB queries include `userId` scope
- [ ] No secrets in code
- [ ] No `any` type usage
- [ ] No `prisma.$queryRaw` with interpolated strings

### Data Integrity
- [ ] Money handled with `Decimal`, not `number`
- [ ] Soft delete used, not hard delete
- [ ] Optimistic locking used where concurrent writes possible
- [ ] Database transactions used for multi-step operations

### Error Handling
- [ ] All async operations have error handling
- [ ] Custom `AppError` subclasses used, not generic `Error`
- [ ] Route handlers wrapped in `withErrorHandler`

### Testing
- [ ] Unit tests for service layer business logic
- [ ] Integration test for new API endpoints
- [ ] Tests pass locally (`npm test`)

### Documentation
- [ ] JSDoc on public service methods
- [ ] README updated if new setup step added
- [ ] This handbook updated if architectural pattern changes

---

## 9. Git Conventions

### Branch Naming
```
feature/add-recurring-transactions
fix/budget-overspend-calculation
chore/update-dependencies
docs/add-ai-architecture
refactor/extract-categorizer
```

### Commit Messages (Conventional Commits)
```
feat(transactions): add AI-powered auto-categorization
fix(auth): prevent refresh token reuse after rotation
chore(deps): upgrade Prisma to 5.14
docs(api): add EMI endpoint documentation
refactor(wallet): extract balance update to repository
test(budgets): add integration tests for budget overspend alert
perf(analytics): add composite index for monthly summary queries
security(auth): rotate JWT on password change
```

### PR Rules
- PRs must be < 400 lines changed (exceptions require Principal Engineer approval)
- Every PR must have a description explaining what changed and why
- No force-push to `main` or `staging`
- Squash and merge into `main` to keep history clean

---

## 10. Anti-Patterns (Banned)

| Anti-Pattern | Why Banned | Alternative |
|-------------|-----------|-------------|
| `any` type | Bypasses TypeScript safety | Use `unknown` + type guard |
| `!` non-null assertion on external data | Runtime crash risk | Explicit null check |
| `parseFloat()`/`toFixed()` for money | Floating point errors | `Decimal` library |
| Hard delete of financial records | Breaks audit trail | Soft delete with `deletedAt` |
| Business logic in Route Handlers | Untestable, fat handlers | Service layer |
| Direct Prisma calls in Route Handlers | Bypasses repository layer | Repository pattern |
| Storing tokens in `localStorage` | XSS vulnerable | HttpOnly cookies |
| `console.log` in production code | Unstructured, leaks PII | Pino structured logger |
| Secrets in source code | Security breach | Environment variables |
| `Promise.all` without error handling | Silent failures | `Promise.allSettled` or try/catch |
