# 15 — DevOps

> **Document Type:** DevOps, CI/CD, Infrastructure  
> **Audience:** DevOps engineers, all engineers  
> **Status:** Living Document

---

## Purpose

This document covers CI/CD pipelines, deployment environments, secrets management, database migration strategy, rollback procedures, and infrastructure configuration for FinanceFlow.

---

## 1. Environment Strategy

| Environment | Purpose | Deployment Trigger | DB |
|-------------|---------|-------------------|----|
| `development` | Local dev | Manual | Local PostgreSQL |
| `preview` | PR review | On every PR (Vercel Preview) | Shared preview DB |
| `staging` | Pre-production validation | Merge to `staging` branch | Staging PostgreSQL |
| `production` | Live users | Merge to `main` (after staging validation) | Production PostgreSQL |

### Environment Variable Scoping

Each environment has its own isolated set of secrets in Vercel. Production secrets are accessible only to the DevOps engineer and Principal Engineer.

---

## 2. CI/CD Pipeline (GitHub Actions)

### Pipeline Overview

```mermaid
graph LR
    PR["Pull Request\nOpened/Updated"]
    Lint["Lint &\nType Check"]
    Unit["Unit Tests"]
    Integration["Integration Tests\n(test DB)"]
    Build["Next.js Build"]
    Preview["Deploy to\nVercel Preview"]
    E2E["Playwright E2E\n(against preview)"]
    Coverage["Coverage\nCheck ≥80%"]

    MergeMain["Merge to\nmain"]
    StagingDeploy["Deploy to\nStaging"]
    StagingSmoke["Smoke Tests\n(staging)"]
    ProdDeploy["Deploy to\nProduction"]
    ProdSmoke["Health Check\n(production)"]

    PR --> Lint
    Lint --> Unit
    Unit --> Integration
    Integration --> Coverage
    Coverage --> Build
    Build --> Preview
    Preview --> E2E

    MergeMain --> StagingDeploy
    StagingDeploy --> StagingSmoke
    StagingSmoke --> ProdDeploy
    ProdDeploy --> ProdSmoke
```

### Full CI Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [main, staging]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: financeflow_test
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
        options: --health-cmd "redis-cli ping" --health-interval 10s
    env:
      DATABASE_URL: postgresql://postgres:testpass@localhost:5432/financeflow_test
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test
      JWT_SECRET: test-jwt-secret-minimum-32-chars-long
      AUTH_SECRET: test-auth-secret-minimum-32-chars
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx prisma db seed
      - run: npm run test:integration

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high
```

### Production Deployment Workflow

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  pre-deploy-checks:
    name: Pre-Deploy Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify staging health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.financeflow.in/api/v1/health)
          if [ "$STATUS" != "200" ]; then
            echo "Staging is unhealthy. Aborting production deploy."
            exit 1
          fi

  migrate-database:
    name: Run Database Migrations
    runs-on: ubuntu-latest
    needs: pre-deploy-checks
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

  deploy:
    name: Deploy to Vercel Production
    runs-on: ubuntu-latest
    needs: migrate-database
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  post-deploy-smoke:
    name: Post-Deploy Smoke Tests
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:smoke
        env:
          PLAYWRIGHT_BASE_URL: https://app.financeflow.in
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"🚨 Production smoke tests failed after deploy. Investigate immediately."}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 3. Database Migration Strategy in CI/CD

### Migration Order (Critical)
1. Migrations run **before** the new code is deployed.
2. New code must be backward-compatible with the **old schema**.
3. After deployment, the old schema is no longer supported.

This is the **expand-contract** (blue-green migration) pattern:

```
Phase 1: Expand schema (add new nullable column)
Phase 2: Deploy new code (writes to both old and new column)
Phase 3: Backfill data
Phase 4: Contract schema (make column non-nullable, remove old column)
Phase 5: Deploy code that only uses new column
```

### Rollback Strategy for Migrations

Every migration file should include a comment with the rollback SQL:

```sql
-- Migration: add_ai_confidence_to_transactions
-- Rollback: ALTER TABLE transactions DROP COLUMN IF EXISTS ai_confidence;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(4,3);
```

If a migration must be rolled back:
1. Run the rollback SQL manually against the database
2. Revert the `prisma/schema.prisma` change
3. Delete the migration file
4. Run `npx prisma migrate resolve --rolled-back <migration-name>`

---

## 4. Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "regions": ["bom1"],
  "functions": {
    "src/app/api/v1/ai/chat/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/v1/reports/export/route.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/workers/:path*",
      "destination": "/api/workers/:path*"
    }
  ]
}
```

---

## 5. Rollback Procedure

### Code Rollback (Vercel)
```bash
# List recent deployments
vercel ls

# Roll back to previous deployment (instant, no rebuild)
vercel rollback [deployment-url]
```

### Database Rollback
Database rollbacks are manual. There is no automatic database rollback.

**Rollback Decision Tree:**
```
Production issue detected
│
├── Is it a code bug? → Vercel rollback (instant)
│                       Is the DB schema still compatible? Yes → Done
│                       No → Roll back schema manually too
│
└── Is it a data corruption issue?
    ├── Scope: small → Fix via targeted SQL update
    └── Scope: large → Restore from backup (see below)
```

### Backup and Restore
- **Backup frequency:** Automated daily backups (managed PostgreSQL provider)
- **Retention:** 30 days
- **Point-in-time recovery:** Enabled (restore to any second in last 7 days)
- **Restore test:** Performed quarterly (restore to staging and verify data integrity)

---

## 6. Infrastructure as Code (Phase 2)

At current scale, infrastructure is managed via Vercel and managed cloud services (no IaC needed). At Phase 2 (10k+ users), introduce Terraform:

```
infra/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── s3/
│   │   └── networking/
│   └── environments/
│       ├── staging.tfvars
│       └── production.tfvars
```

---

## 7. Secrets Management

### Current (Phase 1): Vercel Environment Variables
- All secrets stored in Vercel project settings
- Environment-scoped (different values for preview/staging/production)
- Access restricted by Vercel team roles

### Phase 2: HashiCorp Vault or AWS Secrets Manager
- When the team grows beyond 5 engineers
- Enables audit trail of secret access
- Enables automatic secret rotation

### What Goes in Secrets (never hardcoded)
- Database URLs
- JWT secrets
- OAuth credentials
- API keys (Resend, Razorpay, OpenAI)
- AWS credentials
- Webhook signing secrets

---

## 8. Docker (Optional Self-Hosted Deployment)

```dockerfile
# Dockerfile (for self-hosted or Docker Compose development)
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml (development)
version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/financeflow
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: financeflow
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: .
    command: node dist/workers/index.js
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/financeflow
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```
