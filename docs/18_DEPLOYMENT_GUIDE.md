# 18 — Deployment Guide

> **Document Type:** Deployment Runbook  
> **Audience:** DevOps engineers, backend engineers  
> **Status:** Living Document

---

## Purpose

This document is the step-by-step runbook for deploying FinanceFlow to all environments. Follow it precisely. Do not improvise during production deployments.

---

## 1. Deployment Architecture

```
GitHub repo (main branch)
    ↓ Push triggers
GitHub Actions CI pipeline
    ↓ On success
Vercel Production deployment
    ↓ Before deploy
Database migrations (Prisma)
    ↓ After deploy
Smoke tests
    ↓ On failure
Automatic alert + manual rollback
```

---

## 2. Prerequisites

Before your first deployment, ensure you have:

- [ ] Vercel account with project created
- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Access to Vercel project settings (to add env vars)
- [ ] Production PostgreSQL database provisioned (Supabase / Neon / Railway)
- [ ] Production Redis provisioned (Upstash)
- [ ] AWS S3 bucket created with correct IAM user
- [ ] Resend account + sending domain verified
- [ ] Razorpay account + webhook endpoint configured
- [ ] OpenAI API key with billing enabled
- [ ] Sentry project created, DSN noted
- [ ] Google OAuth app created in Google Cloud Console

---

## 3. Environment Variables Setup

Set these in Vercel → Project → Settings → Environment Variables. Scope each to the correct environment (Preview / Staging / Production).

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string with PgBouncer | `postgresql://user:pass@host:5432/db?pgbouncer=true` |
| `REDIS_URL` | Redis connection string | `redis://default:pass@host:6379` |
| `AUTH_SECRET` | NextAuth secret (min 32 chars, random) | `openssl rand -hex 32` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `RESEND_API_KEY` | Resend API key | `re_123abc...` |
| `RAZORPAY_KEY_ID` | Razorpay public key | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | `abc123...` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret | `abc123...` |
| `AWS_S3_BUCKET` | S3 bucket name | `financeflow-uploads-prod` |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `SENTRY_DSN` | Sentry DSN URL | `https://abc@sentry.io/123` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://app.financeflow.in` |
| `NODE_ENV` | Environment | `production` |

### Generating Secrets

```bash
# Generate AUTH_SECRET and JWT_SECRET
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. First-Time Production Setup

Run these steps once when setting up a new production environment.

### Step 1: Provision Database

```bash
# Create database (example with Supabase CLI)
supabase projects create financeflow-prod --region ap-south-1

# Get connection string from dashboard
# Format: postgresql://postgres:[password]@[host]:5432/postgres
```

### Step 2: Run Migrations

```bash
# Set DATABASE_URL for migration
export DATABASE_URL="postgresql://..."

# Apply all migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Seed system categories
npx prisma db seed
```

### Step 3: Connect Vercel Project

```bash
# Link local repo to Vercel project
vercel link

# Deploy to staging first
vercel --prod=false

# If staging looks good, deploy to production
vercel --prod
```

### Step 4: Configure Razorpay Webhook

In Razorpay Dashboard → Webhooks:
- URL: `https://app.financeflow.in/api/v1/webhooks/razorpay`
- Events to subscribe:
  - `payment.captured`
  - `payment.failed`
  - `subscription.activated`
  - `subscription.charged`
  - `subscription.cancelled`
  - `subscription.halted`

### Step 5: Configure Google OAuth Redirect

In Google Cloud Console → Credentials → OAuth 2.0 Client:
- Authorized redirect URIs: `https://app.financeflow.in/api/auth/callback/google`

### Step 6: Configure Custom Domain

In Vercel → Domains:
- Add `app.financeflow.in`
- Update DNS to point to Vercel
- Verify SSL certificate is issued

---

## 5. Regular Deployment Process

This is the standard process for every feature release.

### Pre-Deployment Checklist

- [ ] All CI checks pass on the PR
- [ ] PR has been reviewed and approved
- [ ] Feature tested on Preview deployment
- [ ] No pending DB migrations that haven't been reviewed
- [ ] If schema changes: rollback SQL documented in migration file
- [ ] `npm audit` shows no critical vulnerabilities

### Deployment Steps

```bash
# 1. Merge PR to main (GitHub UI or CLI)
git checkout main && git merge --squash feature/your-feature
git push origin main

# 2. GitHub Actions triggers automatically:
#    - Lint + type check
#    - Unit + integration tests
#    - Migration (npx prisma migrate deploy against production DB)
#    - Vercel production deploy
#    - Post-deploy smoke tests

# 3. Monitor in real-time
# - GitHub Actions logs: github.com/your-org/financeflow/actions
# - Vercel deployment: vercel.com/dashboard
# - Sentry: sentry.io (watch for new errors)
# - Health check: https://app.financeflow.in/api/v1/health
```

### Post-Deployment Verification (Manual)

After every deployment, verify these manually:

```bash
# 1. Health check
curl https://app.financeflow.in/api/v1/health

# Expected:
# { "status": "ok", "services": { "database": { "ok": true }, "redis": { "ok": true } } }

# 2. Auth endpoint
curl -X POST https://app.financeflow.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@financeflow.in","password":"SmokeTest123!"}'

# 3. Sentry — check for new error spikes in last 10 minutes

# 4. Vercel Analytics — check for traffic and error rate anomalies
```

---

## 6. Database Migration Runbook

### Schema-Only Migration (No Data Transform)

```bash
# Example: Adding a nullable column
# 1. Add to schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_notes_to_investments

# 3. Review generated SQL in prisma/migrations/
cat prisma/migrations/*_add_notes_to_investments/migration.sql

# 4. Commit and push — CI applies migration automatically
```

### Data Migration (Transform Existing Data)

```bash
# For transforming existing data, use a separate script:
# scripts/migrations/backfill-merchant-normalized.ts

# 1. Write idempotent migration script
# 2. Test on staging: npx tsx scripts/migrations/backfill-merchant-normalized.ts
# 3. Verify data integrity
# 4. Apply to production with monitoring
```

### Emergency Schema Fix

```bash
# If a bad migration has been applied and must be reverted:

# 1. Find the rollback SQL (documented in migration file comments)
# 2. Connect to production DB
psql $DATABASE_URL

# 3. Apply rollback SQL manually
ALTER TABLE transactions DROP COLUMN IF EXISTS bad_column;

# 4. Update Prisma's migration history
npx prisma migrate resolve --rolled-back 20250601000000_bad_migration

# 5. Remove the migration file from repo
# 6. Redeploy

# ⚠️ This is an emergency procedure. Always consult DBA before applying.
```

---

## 7. Rollback Procedure

### Code Rollback (< 2 minutes)

```bash
# Via Vercel CLI
vercel ls                              # List recent deployments
vercel rollback [previous-deploy-url]  # Instant rollback, no rebuild

# Via Vercel Dashboard
# Deployments → Previous deployment → Promote to Production
```

### Decision Matrix

| Issue | Action | Time |
|-------|--------|------|
| UI bug, no DB change | Vercel rollback | < 2 min |
| API bug, no DB change | Vercel rollback | < 2 min |
| Bug + compatible DB change | Vercel rollback (old code works with new schema) | < 5 min |
| Bug + breaking DB change | Rollback code + rollback schema (emergency) | 15–30 min |
| Data corruption | Restore from backup | 30–120 min |

### Database Restore from Backup

```bash
# 1. Identify the restore point
# Go to your DB provider dashboard → Backups → Select point-in-time

# 2. Create a new DB from backup (don't overwrite production directly)
# Restore to: financeflow-prod-restore-2025-06-01-10-00

# 3. Verify data integrity on the restored DB
psql $RESTORE_DB_URL -c "SELECT COUNT(*) FROM transactions;"

# 4. Swap production to restored DB
# Update DATABASE_URL in Vercel → Redeploy

# ⚠️ Restoring a DB means losing all transactions created after the restore point.
# Communicate with users and/or reconstruct from audit logs if needed.
```

---

## 8. Smoke Test Script

```typescript
// tests/smoke/production-smoke.ts
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.financeflow.in'

test('health check returns ok', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/v1/health`)
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe('ok')
  expect(body.services.database.ok).toBe(true)
  expect(body.services.redis.ok).toBe(true)
})

test('login page loads', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)
  await expect(page.locator('h1')).toContainText('Welcome back')
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
})

test('smoke user can login', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('[data-testid="email-input"]', process.env.SMOKE_USER_EMAIL!)
  await page.fill('[data-testid="password-input"]', process.env.SMOKE_USER_PASSWORD!)
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL(`${BASE_URL}/`)
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
})
```

---

## 9. Deployment Frequency & Freeze Windows

| Period | Deployment Policy |
|--------|------------------|
| Normal (Mon–Thu) | Deploy anytime after CI passes |
| Friday | No production deploys after 4 PM IST |
| Weekend | Emergency fixes only (with Principal Engineer approval) |
| Last day of month | No deploys (payment processing period) |
| Major Indian holidays | No deploys (user activity spike, risk of support requests) |

### Emergency Hotfix Process

```bash
# 1. Branch from main
git checkout -b hotfix/critical-auth-bug main

# 2. Make minimal fix
# 3. Push and open emergency PR
# 4. Get single approval (Principal Engineer or Backend Lead)
# 5. Merge directly (bypass normal review queue)
# 6. Monitor closely for 30 minutes post-deploy
```
