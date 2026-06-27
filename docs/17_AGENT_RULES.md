# 17 — Agent Rules

> **Document Type:** AI Coding Agent Ruleset  
> **Audience:** AI coding agents (Claude, Cursor, Windsurf, Copilot, Codeium, etc.)  
> **Status:** Primary Reference — Read This First

---

## Purpose

This document defines the rules that all AI coding agents MUST follow when working in the FinanceFlow codebase. These rules exist to maintain security, data integrity, code quality, and architectural consistency.

**If you are an AI agent, read every rule in this document before generating any code.**

---

## 1. Critical Rules (Non-Negotiable)

### RULE-001: Never Use Floating-Point for Money
```typescript
// ❌ FORBIDDEN
const amount = 1000.50
const total = amount + 200.25

// ✅ REQUIRED
import { Decimal } from '@prisma/client/runtime/library'
const amount = new Decimal('1000.50')
const total = amount.plus(new Decimal('200.25'))
```
**Why:** Floating-point arithmetic has precision errors. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. Financial calculations must be exact.

### RULE-002: Never Hard-Delete Financial Data
```typescript
// ❌ FORBIDDEN
await prisma.transaction.delete({ where: { id } })

// ✅ REQUIRED
await prisma.transaction.update({
  where: { id },
  data: { deletedAt: new Date() }
})
```
**Why:** Financial records must be retained for audit purposes. Soft-delete with `deletedAt` is the only acceptable pattern.

### RULE-003: Always Scope Database Queries to userId
```typescript
// ❌ FORBIDDEN (IDOR vulnerability)
const transaction = await prisma.transaction.findUnique({
  where: { id: transactionId }
})

// ✅ REQUIRED (always include userId in WHERE)
const transaction = await prisma.transaction.findFirst({
  where: { id: transactionId, userId, deletedAt: null }
})
```
**Why:** Without userId scoping, any authenticated user could access any other user's data.

### RULE-004: Never Put Business Logic in Route Handlers
```typescript
// ❌ FORBIDDEN
export async function POST(request: Request) {
  const body = await request.json()
  const wallet = await prisma.wallet.findFirst({ where: { id: body.walletId } })
  if (!wallet) return Response.json({ error: 'Not found' }, { status: 404 })
  const tx = await prisma.transaction.create({ data: { ...body, userId } })
  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: body.amount } } })
  return Response.json(tx)
}

// ✅ REQUIRED (thin handler, service layer for logic)
export const POST = withAuth(withErrorHandler(async (req: AuthenticatedRequest) => {
  const body = CreateTransactionSchema.parse(await req.json())
  const transaction = await transactionService.create(req.user.id, body)
  return ApiResponse.created(transaction)
}))
```
**Why:** Business logic in route handlers is untestable, violates SRP, and makes features impossible to reuse.

### RULE-005: Always Validate Input with Zod
```typescript
// ❌ FORBIDDEN
const { amount, walletId } = await request.json()
// Using amount and walletId without validation is a security risk

// ✅ REQUIRED
const body = CreateTransactionSchema.parse(await request.json())
// body is now type-safe and validated
```
**Why:** Never trust client input. Zod validation is the security boundary between the internet and business logic.

### RULE-006: Never Use `any` Type
```typescript
// ❌ FORBIDDEN
const data: any = response.json()
function processData(input: any) { }

// ✅ REQUIRED
const data: unknown = response.json()
function processData(input: CreateTransactionDto) { }
```
**Why:** `any` bypasses TypeScript's entire type system. It is banned in this codebase.

### RULE-007: Never Store Secrets in Code
```typescript
// ❌ FORBIDDEN
const apiKey = 'sk-proj-abc123...'
const dbUrl = 'postgresql://user:password@host:5432/db'

// ✅ REQUIRED
import { env } from '@/lib/env'
const apiKey = env.OPENAI_API_KEY
const dbUrl = env.DATABASE_URL
```
**Why:** Secrets in code end up in git history forever.

### RULE-008: Never Call AI/LLM Providers from Frontend
All AI calls must go through `/api/v1/ai/*` endpoints. The frontend calls our API, not OpenAI directly.

### RULE-009: Always Use the Repository Pattern for DB Access
Route handlers → Service → Repository → Prisma. Skip no steps.

### RULE-010: Use Structured Logger, Not console.log
```typescript
// ❌ FORBIDDEN
console.log('Transaction created:', tx)
console.error('Error:', err)

// ✅ REQUIRED
import { logger } from '@/lib/logger'
logger.info({ transactionId: tx.id }, 'Transaction created')
logger.error({ err }, 'Failed to create transaction')
```

---

## 2. File and Folder Rules

### Where to Create New Files

| What you're creating | Where it goes |
|---------------------|--------------|
| New feature | `src/features/{feature-name}/` |
| New API endpoint | `src/app/api/v1/{resource}/route.ts` |
| Shared React component | `src/shared/components/` |
| Feature-specific component | `src/features/{feature}/components/` |
| Shared utility function | `src/shared/utils/` |
| Third-party client | `src/lib/{provider}.ts` |
| Server-only middleware | `src/server/middleware/` |
| Type definitions | `src/features/{feature}/{feature}.types.ts` |
| Zod schemas | `src/features/{feature}/{feature}.validators.ts` |
| Tests | Mirror path in `tests/unit/` or `tests/integration/` |

### File Naming
- TypeScript modules: `kebab-case.ts` (e.g., `transaction.service.ts`)
- React components: `PascalCase.tsx` (e.g., `TransactionCard.tsx`)
- Test files: `{file}.test.ts` or `{file}.spec.ts`
- Never create files named `utils.ts`, `helpers.ts`, or `misc.ts` at the top level

---

## 3. Architecture Rules

### Service Layer Rules
- Services are classes, not plain functions
- Constructor receives dependencies (repositories, other services) — dependency injection
- Services return domain types, not Prisma types
- Services throw typed `AppError` subclasses, never raw `Error`
- Services never import from `next/server` or touch HTTP

### Repository Rules
- Repositories are classes with an injected Prisma client
- All queries include `deletedAt: null` for soft-deleted tables
- All queries include `userId` (or `organizationId`) for tenant isolation
- Return domain types, not raw Prisma objects
- Use `prisma.$transaction()` for multi-step operations

### Component Rules
- Components receive data as props — no direct API calls inside components (use hooks or React Query)
- Use `data-testid` attributes on all interactive elements
- Use Shadcn UI components for all UI primitives
- Never inline styles — only Tailwind classes
- All forms use React Hook Form + Zod resolver

---

## 4. Security Rules for Agents

When generating code, always verify:

1. **Does this endpoint have `withAuth` middleware?** If it's a protected resource, yes.
2. **Does this DB query include `userId` in `WHERE`?** Always yes for user data.
3. **Is user input going through Zod validation?** Always yes before reaching service layer.
4. **Is this a money value?** Use `Decimal`, never `number`.
5. **Is this raw SQL?** If yes, use tagged template literals (Prisma parameterizes them). Never string concatenation.
6. **Is this a webhook handler?** Must verify the signature before processing.
7. **Is this a sensitive operation?** Write an `auditLog()` entry.

---

## 5. Testing Rules

Every new feature or bug fix must include:
- Unit tests for all service methods (happy path + error paths)
- Integration test for new API endpoints
- Test for IDOR — verify user B cannot access user A's resources

Test file naming: `{feature}.service.test.ts`, `{feature}.repository.test.ts`

```typescript
// Minimum test structure for a service method
describe('ServiceName.methodName', () => {
  it('does the correct thing on happy path', async () => { })
  it('throws NotFoundError when resource does not exist', async () => { })
  it('throws ForbiddenError when resource belongs to another user', async () => { })
  it('throws ValidationError when input is invalid', async () => { })
})
```

---

## 6. Common Patterns to Follow

### Pattern: Creating a New Feature Module

```
1. Create src/features/{feature}/
2. Add {feature}.types.ts         (domain types)
3. Add {feature}.validators.ts    (Zod schemas)
4. Add {feature}.errors.ts        (feature-specific errors)
5. Add {feature}.repository.ts    (DB access)
6. Add {feature}.service.ts       (business logic)
7. Create src/app/api/v1/{feature}/route.ts
8. Create tests/unit/features/{feature}/
9. Create tests/integration/api/{feature}.test.ts
```

### Pattern: Creating a New API Endpoint

```typescript
// src/app/api/v1/{resource}/route.ts
import { withAuth } from '@/server/middleware/auth.middleware'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { CreateResourceSchema } from '@/features/{resource}/{resource}.validators'
import { resourceService } from '@/features/{resource}/{resource}.service'
import { ApiResponse } from '@/shared/utils/api-response'
import type { AuthenticatedRequest } from '@/server/middleware/auth.middleware'

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const body = CreateResourceSchema.parse(await req.json())
    const result = await resourceService.create(req.user.id, body)
    return ApiResponse.created(result)
  })
)

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') ?? '1')
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100)
    const result = await resourceService.findAll(req.user.id, { page, limit })
    return ApiResponse.success(result.data, result.meta)
  })
)
```

---

## 7. Anti-Patterns: What Never to Generate

| Pattern | Why Banned |
|---------|-----------|
| `const x: any` | Disables type safety |
| `process.env.SECRET_KEY` directly | Use `env` from `@/lib/env` |
| `prisma.transaction.findUnique({ where: { id } })` without userId | IDOR vulnerability |
| `parseFloat(amount)` for money | Floating point error |
| `response.json()` without validation | Trusts unvalidated external data |
| Direct `new Error('message')` | Use typed AppError subclasses |
| `console.log` | Use structured logger |
| Hard `delete` from DB | Use soft delete |
| Business logic in route handler | Belongs in service layer |
| LLM API call from frontend component | Must go through backend API |
| `fetch` inside React component body (no hook) | Use React Query or SWR |
| CSS `style={{ }}` attributes | Use Tailwind classes only |
| `// TODO: add auth later` | Auth is not optional |

---

## 8. Checklist Before Submitting Generated Code

- [ ] No `any` types
- [ ] No `console.log`
- [ ] No floating-point for money
- [ ] No hard deletes
- [ ] Route handlers wrapped in `withAuth` + `withErrorHandler`
- [ ] All user inputs validated with Zod
- [ ] All DB queries scoped to `userId`
- [ ] New feature has tests
- [ ] No secrets in code
- [ ] Follows feature module folder structure
- [ ] Uses `ApiResponse` helper for responses
- [ ] Uses typed error classes
- [ ] Service methods have JSDoc
