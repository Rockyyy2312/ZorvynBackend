# 08 — Security

> **Document Type:** Security Architecture & Controls  
> **Audience:** All engineers, security engineers, DevOps  
> **Status:** Living Document

---

## Purpose

This document defines the complete security posture for FinanceFlow. It covers OWASP Top 10 mitigations, threat model, all security controls, secrets management, encryption, and the security review checklist. Security is non-negotiable for a financial platform.

---

## 1. Threat Model

### Assets to Protect
| Asset | Sensitivity | Impact if Compromised |
|-------|------------|----------------------|
| User financial transactions | Critical | Privacy violation, fraud |
| Authentication credentials | Critical | Account takeover |
| AI conversation history | High | Personal data leak |
| Wallet balances | High | Financial data exposure |
| Payment information | Critical | Financial fraud |
| User PII (email, name) | High | Identity theft |
| Admin access | Critical | Platform-wide breach |

### Threat Actors
| Actor | Capability | Motivation |
|-------|-----------|-----------|
| Opportunistic attacker | Low — script kiddie | Financial gain |
| Targeted attacker | Medium — insider knowledge | Data theft, fraud |
| Malicious user | Medium — has valid account | Abuse premium features, access others' data |
| Compromised dependency | Varies — supply chain | Data exfiltration |
| Disgruntled insider | High — knows the system | Sabotage, data theft |

### Attack Vectors
1. Credential theft (phishing, brute force)
2. Injection attacks (SQL, NoSQL, XSS, SSTI)
3. Broken access control (IDOR — accessing another user's data)
4. Token theft (XSS stealing tokens from localStorage)
5. Man-in-the-middle (TLS downgrade)
6. Supply chain attack (malicious npm package)
7. API abuse (scraping, data harvesting)
8. Webhook spoofing (fake Razorpay events)

---

## 2. OWASP Top 10 Mitigations

### A01: Broken Access Control

**Risks:** User A accessing User B's transactions, wallet, or reports.

**Mitigations:**
- Every database query includes `userId` in the WHERE clause — never trust the resource ID alone
- Row-level security pattern enforced at the repository layer
- Admin endpoints protected by `isAdmin` guard
- Premium features protected by `plan` guard

```typescript
// CORRECT — Always scope to userId
async function findTransaction(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null }  // userId ALWAYS included
  })
}

// WRONG — IDOR vulnerability
async function findTransaction(id: string) {
  return prisma.transaction.findUnique({ where: { id } })  // Any user can access!
}
```

### A02: Cryptographic Failures

**Risks:** Sensitive data exposed at rest or in transit.

**Mitigations:**
- All data in transit via HTTPS/TLS 1.2+ (enforced by Vercel)
- Passwords hashed with bcrypt (cost 12)
- Refresh tokens stored as SHA-256 hashes
- Database encrypted at rest (managed PostgreSQL provider)
- S3 receipts encrypted at rest (SSE-S3)
- No sensitive data in JWT payload beyond what's needed
- `HttpOnly` cookies prevent JavaScript token access

### A03: Injection

**Risks:** SQL injection, NoSQL injection, XSS via stored content.

**Mitigations:**
- **Prisma ORM** — all queries are parameterized by default. Never use `prisma.$queryRaw` with interpolated user input.
- **Zod validation** on all inputs before they reach service layer
- **DOMPurify** for any user content rendered as HTML
- **Content-Security-Policy** headers block inline script execution

```typescript
// SAFE — Prisma parameterizes this
const transactions = await prisma.transaction.findMany({
  where: { merchant: { contains: userInput } }
})

// DANGEROUS — Never do this
const transactions = await prisma.$queryRaw`
  SELECT * FROM transactions WHERE merchant LIKE '%${userInput}%'
`

// SAFE raw query (when absolutely necessary)
import { Prisma } from '@prisma/client'
const transactions = await prisma.$queryRaw`
  SELECT * FROM transactions WHERE merchant LIKE ${`%${userInput}%`}
`
// Prisma automatically parameterizes template literals
```

### A04: Insecure Design

**Mitigations:**
- Security requirements defined before implementation (this document)
- Threat modelling done at design phase
- Principle of least privilege on all service accounts
- API designed with deny-by-default auth

### A05: Security Misconfiguration

**Mitigations:**
- Security headers via `next.config.js`
- Environment variable validation via `zod` at startup
- No default credentials anywhere
- Admin panel on separate route group with extra guards
- Dependency scanning via `npm audit` in CI

### A06: Vulnerable and Outdated Components

**Mitigations:**
- `npm audit` runs in every CI pipeline
- Dependabot alerts enabled on GitHub repository
- Monthly dependency update review
- Lock file (`package-lock.json`) committed to repo

### A07: Identification and Authentication Failures

See `07_AUTHENTICATION.md` for full detail. Summary:
- Brute force protection via rate limiting
- Refresh token rotation
- Email verification required
- Secure password reset flow

### A08: Software and Data Integrity Failures

**Mitigations:**
- Razorpay webhook signature verification before processing
- Subresource Integrity (SRI) on any CDN assets
- Signed commits policy (Phase 2)
- Supply chain review for new dependencies

```typescript
// Webhook signature verification
import crypto from 'crypto'

function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}
```

### A09: Security Logging and Monitoring Failures

**Mitigations:**
- Structured logging with Pino (every request logged)
- Audit log table for all sensitive operations
- Login history tracked
- Failed auth attempts logged with IP
- Sentry error alerting
- Alerts on: spike in 401s, admin actions, bulk data exports

### A10: Server-Side Request Forgery (SSRF)

**Mitigations:**
- No user-controlled URLs are fetched server-side (except in Phase 2 bank integration, where strict allowlist applies)
- If receipt URL validation is needed, use an allowlist of trusted domains
- Never expose internal service URLs to clients

---

## 3. Security Headers

Configured in `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'",
      "style-src 'self' 'unsafe-inline'",  // Tailwind requires this — use nonce in Phase 2
      "img-src 'self' data: https://lh3.googleusercontent.com https://*.s3.amazonaws.com",
      "font-src 'self'",
      "connect-src 'self' https://api.razorpay.com https://*.sentry.io",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  }
]
```

---

## 4. Rate Limiting Implementation

```typescript
// src/server/middleware/rate-limit.middleware.ts
import { redis } from '@/lib/redis'

interface RateLimitConfig {
  windowSeconds: number
  maxRequests: number
  keyPrefix: string
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rl:${config.keyPrefix}:${identifier}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - config.windowSeconds

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zadd(key, now, `${now}-${Math.random()}`)
  pipeline.zcard(key)
  pipeline.expire(key, config.windowSeconds)

  const results = await pipeline.exec()
  const requestCount = results[2][1] as number

  const allowed = requestCount <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - requestCount)
  const resetAt = now + config.windowSeconds

  return { allowed, remaining, resetAt }
}

// Rate limit configs
export const RATE_LIMITS = {
  AUTH: { windowSeconds: 900, maxRequests: 5, keyPrefix: 'auth' },
  FREE_USER: { windowSeconds: 60, maxRequests: 100, keyPrefix: 'user' },
  PREMIUM_USER: { windowSeconds: 60, maxRequests: 300, keyPrefix: 'user' },
  AI_CHAT: { windowSeconds: 60, maxRequests: 10, keyPrefix: 'ai' },
  UNAUTHENTICATED: { windowSeconds: 60, maxRequests: 20, keyPrefix: 'ip' },
}
```

---

## 5. Input Validation Strategy

**Rule: Validate ALL input at the API boundary using Zod. Never trust user input in the service layer.**

```typescript
// src/features/transactions/transaction.validators.ts
import { z } from 'zod'

export const CreateTransactionSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places')
    .refine(val => parseFloat(val) > 0, 'Amount must be greater than 0')
    .refine(val => parseFloat(val) <= 10000000, 'Amount cannot exceed ₹1,00,00,000'),
  description: z.string().max(500).optional(),
  merchant: z.string().max(200).optional(),
  transactionDate: z.string().datetime('Invalid date format'),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>
```

---

## 6. Secrets Management

### Environment Variables

All secrets are stored as environment variables, never hardcoded. Validated at startup using Zod:

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  RESEND_API_KEY: z.string().startsWith('re_'),
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_'),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_REGION: z.string(),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  SENTRY_DSN: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']),
})

export const env = envSchema.parse(process.env)
```

### Secret Rotation Policy
| Secret | Rotation Frequency | Trigger for Immediate Rotation |
|--------|-------------------|-------------------------------|
| JWT_SECRET | Quarterly | Any suspected breach |
| Database password | Quarterly | On engineer offboarding |
| API keys (Resend, Razorpay) | Annually | Any suspected breach |
| Google OAuth secret | Annually | Any suspected breach |
| AWS access keys | Quarterly | On engineer offboarding |

---

## 7. CSRF Protection

Auth.js handles CSRF token generation and validation for its own flows. For custom API endpoints:

- All state-changing requests require `Authorization: Bearer` header
- Bearer token requirement inherently prevents CSRF (browsers cannot set auth headers cross-origin)
- SameSite=Strict on refresh token cookies prevents cookie-based CSRF

---

## 8. Security Audit Log

Every sensitive operation is written to the `audit_logs` table:

| Action | Trigger |
|--------|---------|
| LOGIN | Successful login (any provider) |
| LOGOUT | Explicit logout |
| PASSWORD_CHANGE | Password updated |
| PLAN_CHANGE | Premium plan purchased or cancelled |
| DELETE | Any resource soft-deleted |
| EXPORT | User data exported |
| ADMIN_ACTION | Any admin panel operation |

```typescript
// src/lib/audit.ts
export async function auditLog(params: {
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
  userAgent?: string
}) {
  await prisma.auditLog.create({ data: params })
}
```

---

## 9. Security Checklist

### Development
- [ ] No secrets in source code or git history
- [ ] `.env` in `.gitignore`
- [ ] Zod validation on all API inputs
- [ ] `userId` scoping on all DB queries
- [ ] No `prisma.$queryRaw` with interpolated user input
- [ ] All money values use `Decimal`, not `number`
- [ ] `npm audit` passes (0 critical vulnerabilities)

### Deployment
- [ ] Security headers configured in `next.config.js`
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] All secrets in Vercel environment variables
- [ ] Database not publicly accessible (VPC or connection pooler)
- [ ] S3 bucket not publicly readable
- [ ] Rate limiting enabled in production
- [ ] Sentry DSN configured for error alerting

### Ongoing
- [ ] Dependabot alerts reviewed weekly
- [ ] Audit logs reviewed monthly
- [ ] Failed login spikes monitored
- [ ] Admin actions reviewed quarterly
- [ ] Penetration test annually (Phase 2+)
