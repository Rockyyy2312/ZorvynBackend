# 19 — Production Checklist

> **Document Type:** Production Readiness Checklist  
> **Audience:** All engineers, DevOps, security  
> **Status:** Living Document — review before every major release

---

## Purpose

This checklist must be completed before launching FinanceFlow to production users and reviewed quarterly thereafter. It covers security, performance, reliability, observability, legal, and operational readiness. If any item is marked ❌, it is a launch blocker unless explicitly waived by the Principal Engineer with written justification.

---

## 1. Security Checklist

### Authentication & Authorization
- [ ] Email verification required before first login
- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] JWT access tokens expire in ≤ 15 minutes
- [ ] Refresh tokens rotated on every use
- [ ] Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies
- [ ] Password reset tokens expire in ≤ 1 hour and are single-use
- [ ] Reset tokens hashed (SHA-256) in database — never stored in plain text
- [ ] All sessions invalidated on password change
- [ ] Rate limiting on auth endpoints (5 attempts / 15 min / IP)
- [ ] Login history recorded with IP and user agent
- [ ] All routes require authentication by default — explicit opt-out only
- [ ] Admin routes protected by `isAdmin` guard
- [ ] Premium routes protected by plan check

### Data Security
- [ ] All database queries include `userId` scoping — IDOR impossible
- [ ] Soft deletes implemented on all user financial data tables
- [ ] `DECIMAL(15,2)` used for all monetary columns — never FLOAT
- [ ] All API inputs validated with Zod before reaching service layer
- [ ] Prisma parameterized queries used — no raw SQL with interpolation
- [ ] No sensitive data in JWT payload beyond necessary identifiers
- [ ] Razorpay webhook signature verification implemented
- [ ] S3 bucket is private — files only accessible via signed URLs (1h TTL)
- [ ] Database connection encrypted (SSL/TLS)
- [ ] Database accessible only via VPC or connection pooler (not publicly)
- [ ] No secrets hardcoded in source code or git history
- [ ] Environment variable validation (`zod`) runs at startup

### Headers & Transport
- [ ] HTTPS enforced (Vercel handles this automatically)
- [ ] HSTS header set: `max-age=63072000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` restricts camera, microphone, geolocation
- [ ] Content Security Policy (CSP) configured
- [ ] No sensitive data in URL query parameters

### Dependencies
- [ ] `npm audit` shows 0 critical, 0 high severity vulnerabilities
- [ ] All dependencies are pinned to specific versions in `package-lock.json`
- [ ] Dependabot enabled on GitHub repository
- [ ] No abandoned or unmaintained packages in production dependencies

---

## 2. Performance Checklist

### API Performance
- [ ] p95 API response time < 200ms for list endpoints (verified with load test)
- [ ] p95 API response time < 500ms for analytics/report endpoints
- [ ] p99 API response time < 1000ms for all endpoints
- [ ] Database connection pooling configured (PgBouncer or equivalent)
- [ ] Redis caching implemented for dashboard summary and transaction lists
- [ ] Composite indexes on all frequently queried column combinations
- [ ] `EXPLAIN ANALYZE` run on all queries serving > 1000 rows
- [ ] No N+1 query patterns (Prisma `include` used instead of sequential queries)

### Frontend Performance
- [ ] Lighthouse Performance score ≥ 85 on mobile
- [ ] LCP (Largest Contentful Paint) < 2.5s on 4G
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] All images served via `next/image` with proper sizing
- [ ] Chart.js loaded with dynamic import (code splitting)
- [ ] Skeleton screens implemented for all data-loading states
- [ ] TanStack Query `staleTime` set appropriately on all queries
- [ ] Bundle size analyzed (`@next/bundle-analyzer`) — no unintended large deps

---

## 3. Reliability Checklist

### Database
- [ ] Automated daily backups configured
- [ ] Point-in-time recovery enabled (last 7 days minimum)
- [ ] Backup restore tested on staging (restore + data integrity check)
- [ ] Database migration rollback SQL documented in every migration file
- [ ] Migrations tested on staging before production
- [ ] Connection pool limits configured to prevent connection exhaustion

### Application
- [ ] Health check endpoint returns 200 when healthy, 503 when degraded
- [ ] Redis fail-open implemented — Redis outage doesn't crash API
- [ ] AI service fail-open — AI unavailability doesn't block core features
- [ ] BullMQ workers have retry logic with exponential backoff
- [ ] Failed payment jobs retained for manual inspection (not auto-deleted)
- [ ] Graceful shutdown handling for workers (SIGTERM)
- [ ] Request timeout configured on AI calls (30s max)
- [ ] Idempotency keys implemented on transaction creation

### Deployment
- [ ] Zero-downtime deployments configured (Vercel handles this)
- [ ] Smoke tests run automatically after every production deploy
- [ ] Rollback procedure documented and tested
- [ ] No Friday-after-4PM production deployments (policy enforced)

---

## 4. Observability Checklist

### Logging
- [ ] Pino structured logging configured for all services
- [ ] All requests logged with: method, URL, status, duration, requestId
- [ ] Sensitive fields redacted in Pino config (passwords, tokens, cards)
- [ ] Log level set to `info` in production (not `debug`)
- [ ] Workers emit structured logs with jobId and queue name

### Error Tracking
- [ ] Sentry DSN configured for both client and server
- [ ] Sentry performance monitoring enabled (tracesSampleRate: 0.1)
- [ ] PII scrubbed from Sentry payloads (`beforeSend`)
- [ ] Expected client errors (401, 429) excluded from Sentry alerts
- [ ] Sentry alerts configured for new error events
- [ ] Team is subscribed to Sentry email/Slack notifications

### Monitoring & Alerts
- [ ] Error rate alert: > 1% of requests → immediate page
- [ ] DB connection failure alert → immediate page
- [ ] Auth failure spike alert: > 50 failures / minute from same IP
- [ ] Payment webhook failure alert: > 3 failures / 10 minutes
- [ ] AI daily cost alert: > $50 / day
- [ ] Vercel Analytics connected and showing traffic baseline
- [ ] Admin dashboard shows real-time user counts and error rates

---

## 5. Feature Completeness Checklist

### Core Features
- [ ] Email registration with verification
- [ ] Google OAuth login
- [ ] Password reset flow
- [ ] Dashboard with net worth, cash flow, budgets, goals
- [ ] Transaction create / edit / delete (soft)
- [ ] AI auto-categorization on transaction create
- [ ] CSV transaction import
- [ ] Receipt upload (S3)
- [ ] Wallet management (create / edit / delete / transfer)
- [ ] Budget create / track / alert
- [ ] Savings goal create / contribute / complete
- [ ] Investment portfolio tracking
- [ ] EMI tracking + payment recording
- [ ] Subscription tracking + renewal reminders
- [ ] Monthly report + PDF export
- [ ] CSV data export
- [ ] AI chat assistant
- [ ] Weekly AI insights (background job)
- [ ] In-app notifications
- [ ] Email notifications (Resend)
- [ ] Notification preferences
- [ ] Premium subscription (Razorpay)
- [ ] Admin dashboard (users, stats, AI cost)
- [ ] Profile settings (name, timezone, avatar)
- [ ] Security settings (password change, sessions)
- [ ] Account deletion (soft delete)

### Plan Limit Enforcement
- [ ] Free plan: wallet limit enforced at creation
- [ ] Free plan: transaction limit enforced (monthly)
- [ ] Free plan: budget limit enforced
- [ ] Free plan: AI message limit enforced
- [ ] Premium features locked behind plan check
- [ ] "Upgrade" prompt shown at every plan limit

---

## 6. Legal & Compliance Checklist

- [ ] Privacy Policy published at `/privacy`
- [ ] Terms of Service published at `/terms`
- [ ] Cookie consent banner for analytics (if using tracking cookies)
- [ ] User data deletion implemented (`DELETE /api/v1/users/me`)
- [ ] Data export implemented (PDPB compliance)
- [ ] No PCI-DSS scope — card data flows directly to Razorpay (never our servers)
- [ ] Razorpay integration uses their hosted payment page or SDK (no card data touches our backend)
- [ ] GST invoice capability for premium subscriptions (or use Razorpay's billing)

---

## 7. Operational Readiness Checklist

### Runbooks
- [ ] Deployment runbook documented (`18_DEPLOYMENT_GUIDE.md`)
- [ ] Rollback procedure documented and tested
- [ ] DB restore procedure documented and tested
- [ ] On-call rotation defined (who to contact for prod incidents)
- [ ] Escalation path documented (L1 → L2 → Principal Engineer)

### Team
- [ ] All engineers have been briefed on production deployment process
- [ ] At least 2 engineers have Vercel production access
- [ ] At least 2 engineers have production database access
- [ ] Sentry notifications go to a team Slack channel, not just one person
- [ ] Razorpay webhook shared secret is stored in team password manager

### Communication
- [ ] Status page set up (e.g., statuspage.io or self-hosted)
- [ ] User-facing incident communication template prepared
- [ ] Support email configured and monitored

---

## 8. Quarterly Review Checklist

Review these items every quarter:

- [ ] Rotate all secrets (JWT_SECRET, AUTH_SECRET, DB password)
- [ ] Rotate AWS IAM access keys
- [ ] Review and close unused admin accounts
- [ ] Review `npm audit` results and update dependencies
- [ ] Review Sentry error trends — resolve recurring issues
- [ ] Review slow query log — optimize or add indexes
- [ ] Review AI cost trends — adjust plan limits if needed
- [ ] Review and clean up soft-deleted data older than 1 year (per data retention policy)
- [ ] Test backup restore procedure
- [ ] Review access control — remove access for departed team members
- [ ] Review open security issues in GitHub Security tab
