# 16 — Monitoring

> **Document Type:** Observability & Monitoring  
> **Audience:** DevOps engineers, all engineers  
> **Status:** Living Document

---

## Purpose

This document defines the observability stack for FinanceFlow — structured logging, error tracking, performance monitoring, alerting, and dashboards. A system you can't observe is a system you can't trust.

---

## 1. Observability Stack

| Tool | Purpose | Layer |
|------|---------|-------|
| Pino | Structured JSON logging | Application |
| Sentry | Error tracking + performance | Application + Frontend |
| OpenTelemetry | Distributed tracing | Application |
| Vercel Analytics | Web vitals + traffic | Edge/CDN |
| BullMQ Board | Queue monitoring | Background jobs |
| PostgreSQL monitoring | Query performance, slow queries | Database |
| Custom dashboards | Business + AI metrics | Admin |

---

## 2. Structured Logging (Pino)

### Logger Setup

```typescript
// src/lib/logger.ts
import pino from 'pino'
import { env } from './env'

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  base: {
    env: env.NODE_ENV,
    version: process.env.npm_package_version,
  },
  redact: {
    // Never log these fields — even accidentally
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.passwordHash',
      'body.refreshToken',
      'body.cardNumber',
      '*.passwordHash',
    ],
    censor: '[REDACTED]',
  },
})
```

### Request Logging Middleware

```typescript
// src/server/middleware/logging.middleware.ts
export function withLogging(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get('X-Request-ID') ?? generateRequestId()
    const start = Date.now()

    const childLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
    })

    try {
      const response = await handler(req)
      const duration = Date.now() - start

      childLogger.info({
        status: response.status,
        durationMs: duration,
      }, 'Request completed')

      response.headers.set('X-Request-ID', requestId)
      return response
    } catch (error) {
      const duration = Date.now() - start
      childLogger.error({ err: error, durationMs: duration }, 'Request failed')
      throw error
    }
  }
}
```

### Log Levels and When to Use Them

| Level | When |
|-------|------|
| `trace` | Verbose debug (local dev only, never in production) |
| `debug` | Development debugging — query plans, cache hits |
| `info` | Normal operations — request completed, user created |
| `warn` | Unexpected but recoverable — AI fallback used, cache miss spike |
| `error` | Something failed and needs attention |
| `fatal` | System cannot continue — DB connection lost |

### Mandatory Log Fields

Every log entry must include:
```json
{
  "level": "info",
  "time": "2025-06-01T10:30:00.000Z",
  "requestId": "req_01HXYZ",
  "userId": "uuid (when authenticated)",
  "env": "production",
  "version": "1.0.0",
  "msg": "Human readable message"
}
```

### Log PII Rules
- **Never log passwords, tokens, or payment card data** (Pino redact config handles this)
- Log `userId` but not full user profiles
- Log `transactionId` but not full transaction data in high-volume contexts
- Log error messages but redact any interpolated user data

---

## 3. Error Tracking (Sentry)

### Sentry Setup

```typescript
// src/lib/sentry.ts (server)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.05,  // CPU profiling on 5% of transactions
  integrations: [
    Sentry.prismaIntegration(),
  ],
  beforeSend(event, hint) {
    // Scrub PII before sending to Sentry
    if (event.request?.headers?.authorization) {
      event.request.headers.authorization = '[REDACTED]'
    }
    return event
  },
  ignoreErrors: [
    // Don't alert on expected client errors
    'UNAUTHORIZED',
    'TOKEN_EXPIRED',
    'RATE_LIMIT_EXCEEDED',
  ],
})
```

### Error Severity Classification

| Sentry Level | Condition | Response Time |
|-------------|-----------|--------------|
| `fatal` | DB connection lost, app crashes | Immediate page (< 5 min) |
| `error` | Unhandled exception in production | Alert in 15 min |
| `warning` | AI fallback triggered, high latency | Review in 24h |
| `info` | Payment failed (user error), rate limit hit | Dashboard review |

### Custom Sentry Context

```typescript
// Attach user context to all errors in authenticated requests
Sentry.setUser({
  id: user.id,
  email: user.email,
  plan: user.plan,
})

// Attach request context
Sentry.setTag('feature', 'transactions')
Sentry.setExtra('requestId', requestId)
```

---

## 4. Performance Monitoring

### Core Web Vitals (Vercel Analytics)

| Metric | Target | Alert If |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | > 4s |
| FID/INP (Interaction to Next Paint) | < 200ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | > 0.25 |
| TTFB (Time to First Byte) | < 600ms | > 1500ms |

### API Performance Targets

| Endpoint Group | p50 Target | p95 Target | p99 Target |
|---------------|-----------|-----------|-----------|
| Auth endpoints | < 200ms | < 500ms | < 1000ms |
| Transaction list | < 150ms | < 300ms | < 500ms |
| Dashboard summary | < 200ms | < 400ms | < 800ms |
| AI chat (streaming) | < 500ms TTFB | < 1000ms TTFB | < 2000ms TTFB |
| Report generation | < 2000ms | < 5000ms | < 10000ms |

### Database Query Monitoring

Enable PostgreSQL slow query log (queries > 100ms):
```sql
-- postgresql.conf
log_min_duration_statement = 100  -- ms
log_statement = 'none'
log_duration = off
```

Configure Prisma query logging in development:
```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
})

prisma.$on('query', (e) => {
  if (e.duration > 100) {
    logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected')
  }
})
```

---

## 5. Alerting Rules

### Critical Alerts (PagerDuty / immediate notification)
| Alert | Condition | Action |
|-------|-----------|--------|
| Error rate spike | > 1% of requests error in 5min window | Page on-call engineer |
| DB connection failure | Prisma connection errors | Page on-call + DBA |
| Auth failures spike | > 50 failed logins in 1 min from same IP | Block IP, alert security |
| Payment webhook failures | > 3 Razorpay webhook failures in 10 min | Alert + manual review |
| Memory/CPU critical | Serverless function consistently hitting limits | Scale up + alert |

### Warning Alerts (Slack notification)
| Alert | Condition |
|-------|-----------|
| AI cost spike | Daily AI spend > $50 |
| Slow queries | p95 query time > 500ms over 10 min |
| Cache miss rate high | Redis cache hit rate < 60% over 30 min |
| Queue depth growing | BullMQ job queue depth > 1000 |
| 5xx rate elevated | > 0.1% of requests are 5xx |

---

## 6. Key Metrics Dashboard

### Business Metrics (Admin Dashboard)

```
Daily Active Users (DAU)
Monthly Active Users (MAU)
New signups today / this week / this month
Free → Premium conversion rate
Premium churn rate
AI assistant usage rate (% MAU)
Average transactions per active user
Top spending categories (platform-wide, anonymized)
```

### AI Metrics (Admin Dashboard)

```
Total AI requests today / this month
Token usage (prompt + completion)
Estimated AI cost today / this month
Cache hit rate for AI responses
Average AI response latency
Model fallback rate (OpenAI → Anthropic)
Categorization accuracy (user-corrected %)
```

### Technical Metrics (Grafana / Vercel)

```
API request rate (req/s)
API error rate (%)
API p50 / p95 / p99 latency
Database query count and latency
Redis cache hit rate
BullMQ queue depth per queue
Active user sessions
```

---

## 7. Health Check Endpoints

```typescript
// src/app/api/v1/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkQueue(),
  ])

  const [dbCheck, redisCheck, queueCheck] = checks

  const allHealthy = checks.every(c => c.status === 'fulfilled' && c.value.ok)

  return Response.json({
    status: allHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString(),
    services: {
      database: dbCheck.status === 'fulfilled' ? dbCheck.value : { ok: false, error: String(dbCheck.reason) },
      redis: redisCheck.status === 'fulfilled' ? redisCheck.value : { ok: false, error: String(redisCheck.reason) },
      queue: queueCheck.status === 'fulfilled' ? queueCheck.value : { ok: false, error: String(queueCheck.reason) },
    },
  }, { status: allHealthy ? 200 : 503 })
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  await prisma.$queryRaw`SELECT 1`
  return { ok: true, latencyMs: Date.now() - start }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  await redis.ping()
  return { ok: true, latencyMs: Date.now() - start }
}
```
