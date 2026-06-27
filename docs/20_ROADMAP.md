# 20 — Roadmap

> **Document Type:** Engineering Roadmap  
> **Audience:** All engineers, product managers, stakeholders  
> **Status:** Living Document — updated quarterly

---

## Purpose

This document maps the engineering roadmap for FinanceFlow across four growth phases. It defines what gets built when, what infrastructure changes are required at each scale milestone, and what technical debt must be addressed before scaling to the next phase.

---

## 1. Roadmap Overview

```
Phase 1 (Now–6 months):     Foundation — 0 to 10,000 users
Phase 2 (6–18 months):      Growth — 10,000 to 100,000 users
Phase 3 (18–36 months):     Scale — 100,000 to 500,000 users
Phase 4 (36+ months):       Hyperscale — 500,000 to 1,000,000+ users
```

Each phase has:
- Product features to ship
- Infrastructure changes required
- Technical debt to resolve
- Team size assumptions

---

## 2. Phase 1: Foundation (0–10k Users)

**Goal:** Ship a complete, polished v1 that users love. Optimize for development velocity and learning, not premature scaling.

### Product Features (Priority Order)

| Feature | Status | Quarter |
|---------|--------|---------|
| Email auth + Google OAuth | ✅ Done | Q1 |
| Dashboard (net worth, cash flow, budgets, goals) | ✅ Done | Q1 |
| Transaction CRUD + AI categorization | ✅ Done | Q1 |
| Wallet management + transfers | ✅ Done | Q1 |
| Budget planning + alerts | ✅ Done | Q1 |
| Savings goals | ✅ Done | Q1 |
| Investment tracking | ✅ Done | Q2 |
| EMI management | ✅ Done | Q2 |
| Subscription tracking | ✅ Done | Q2 |
| Reports (monthly, PDF export) | 🔄 In Progress | Q2 |
| AI Financial Assistant (chat) | 🔄 In Progress | Q2 |
| CSV import + data export | ⬜ Planned | Q2 |
| Receipt attachment (S3) | ⬜ Planned | Q2 |
| Premium subscription (Razorpay) | ⬜ Planned | Q3 |
| Family accounts | ⬜ Planned | Q3 |
| Weekly AI insights (background) | ⬜ Planned | Q3 |
| Admin dashboard (users, AI cost, stats) | ⬜ Planned | Q3 |
| Notification preferences | ⬜ Planned | Q3 |

### Infrastructure (Phase 1)
- Single Vercel deployment (auto-scaling)
- Managed PostgreSQL (Supabase or Neon)
- Managed Redis (Upstash)
- BullMQ workers on Vercel Functions or single VPS
- AWS S3 (single region, ap-south-1)
- No read replicas needed

### Technical Debt to Address Before Phase 2
- [ ] Add PgBouncer / connection pooler (connection exhaustion risk at 5k+ users)
- [ ] Add database indexes to all frequently filtered columns (confirm with EXPLAIN ANALYZE)
- [ ] Implement cache invalidation properly (prevent stale balance displays)
- [ ] Set up BullMQ on a dedicated VPS (not Vercel Functions — cold starts are bad for workers)
- [ ] Write integration tests for all API endpoints (coverage ≥ 80%)
- [ ] Set up Playwright E2E for all critical user flows

---

## 3. Phase 2: Growth (10k–100k Users)

**Goal:** Handle 10x user growth without rewriting the codebase. Optimize database, caching, and infrastructure while continuing feature delivery.

### Product Features

| Feature | Description | Quarter |
|---------|-------------|---------|
| **Bank Integration (Account Aggregator)** | Auto-sync transactions from Indian banks via AA framework | Q4–Q5 |
| **Recurring Transaction Auto-Detection** | Detect and tag recurring expenses automatically | Q4 |
| **Tax Estimation Module** | Estimate income tax based on income and deductions | Q5 |
| **Mobile PWA** | Progressive Web App for mobile-first users | Q5 |
| **Business Account Features** | GST tracking, expense reports, vendor management | Q6 |
| **Invoice Generation** | For freelancers and small businesses | Q6 |
| **Shared Family Budgets** | Budget visible to all family members | Q5 |
| **Financial Health Report** | Monthly AI-generated comprehensive health report | Q5 |
| **Expense Splitting** | Split expenses between family members | Q6 |
| **Multi-language Support** | Hindi as first additional language | Q6 |

### Infrastructure Changes (Phase 2)

```
PostgreSQL:
  + Add 1 read replica
  + Route analytics and report queries to replica
  + Enable connection pooling (PgBouncer or Prisma Accelerate)

Redis:
  + Move to Redis Cluster (3 nodes) for HA
  + Separate Redis instances for cache vs. queue (different eviction policies)

Application:
  + Extract AI service to a separate Node.js process
    (AI has different scaling needs — more CPU, longer timeouts)
  + BullMQ workers on dedicated EC2/VPS (not serverless)
  + CDN for static assets and API responses where possible

Monitoring:
  + Grafana + Prometheus for infrastructure metrics
  + Database slow query dashboard
  + AI cost per user segmentation

Search:
  + Consider Elasticsearch for full-text transaction search
    (PostgreSQL ILIKE becomes slow at 1M+ transactions)
```

### Database Changes (Phase 2)

```sql
-- Read replica routing
-- In Prisma, use separate client for read queries:
const readPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_READ_URL } }
})

-- New tables for Phase 2 features
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  aa_handle TEXT,          -- Account Aggregator handle
  bank_name TEXT,
  account_number_masked TEXT,
  last_synced_at TIMESTAMP,
  consent_id TEXT,
  consent_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE tax_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  regime TEXT,             -- OLD or NEW
  pan TEXT,
  deductions JSONB,        -- 80C, 80D, HRA, etc.
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Team Size Assumption
Phase 2 assumes 5–8 engineers total (3 backend, 2 frontend, 1 DevOps, 1 AI/ML, 1 QA).

---

## 4. Phase 3: Scale (100k–500k Users)

**Goal:** Handle 50x+ user growth. Introduce service extraction where it enables independent scaling. Invest in developer tooling, reliability, and data infrastructure.

### Product Features

| Feature | Description |
|---------|-------------|
| **Native Mobile App (iOS + Android)** | React Native app with biometric auth |
| **Real-time Notifications** | Push notifications via FCM/APNs |
| **Investment Returns (XIRR)** | Proper time-weighted return calculations |
| **Credit Score Integration** | Pull credit score from CIBIL/Experian (with consent) |
| **Bill Payment Reminders + One-Click Pay** | Deep integration with BBPS |
| **Collaborative Budgeting** | Real-time multi-user budget editing |
| **Advanced Analytics** | Custom date ranges, comparison periods, cohort analysis |
| **API for Third-Party Apps** | Public API for power users and integrations |
| **Expense Policies (Business)** | Approval workflows for team expenses |

### Infrastructure Changes (Phase 3)

```
Service Extraction:
  1. AI Service → Standalone Node.js service
     - Independent deployment, scaling, and cost tracking
     - Communicates via internal HTTP (same VPC)
  
  2. Notification Service → Standalone service
     - Handles WebSocket/SSE connections for real-time delivery
     - Manages FCM/APNs for mobile push
  
  3. Payment Service → Standalone service
     - Handles all Razorpay communication
     - Owns webhook processing and payment state machine

Database:
  + 2–3 read replicas
  + Consider partitioning transactions table by user_id hash
    (transactions will be the largest table at this scale)
  + Dedicated analytics database (read-only replica with BI schema)
  + Elasticsearch for transaction search

Message Bus:
  + Introduce Apache Kafka or AWS SQS for inter-service communication
  + Replace direct service calls with event-driven architecture for:
    - Transaction created → notify budget service
    - Payment captured → notify user service
    - AI insight ready → notify notification service

Caching:
  + Redis Cluster (6 nodes, 3 primary + 3 replica)
  + CDN caching for API responses (public endpoints only)

Infrastructure:
  + Kubernetes (EKS on AWS) for container orchestration
  + Terraform for all infrastructure as code
  + Multi-AZ deployment (high availability within Mumbai region)
```

### Scaling Decision Triggers

| Trigger | Action |
|---------|--------|
| DB p95 read latency > 100ms | Add read replica, route analytics queries there |
| DB connection count > 80% of max | Enable PgBouncer or Prisma Accelerate |
| AI service costs > $200/month | Extract as separate service, optimize model selection |
| Notification delivery p95 > 5s | Extract notification service, add WebSocket layer |
| Transaction table > 10M rows | Partition by user_id hash range |
| Search queries > 500ms p95 | Introduce Elasticsearch |

---

## 5. Phase 4: Hyperscale (500k–1M+ Users)

**Goal:** World-class reliability, global availability, and a platform that other fintech products can build on.

### Architecture Evolution

```
Current (Modular Monolith):
  Next.js → Service Layer → Repository → PostgreSQL

Phase 4 Target (Full Microservices + CQRS):
  
  API Gateway (Kong / AWS API Gateway)
  ├── Auth Service (stateless, JWT)
  ├── User Service
  ├── Transaction Service (CQRS)
  │   ├── Command side: Write to event store
  │   └── Query side: Read from materialized views
  ├── Budget Service
  ├── AI Service (GPU-backed for custom models)
  ├── Notification Service (WebSocket + Push)
  ├── Payment Service
  ├── Report Service (async generation)
  └── Analytics Service (OLAP, separate DB)
  
  Event Bus: Apache Kafka
  Event Store: EventStoreDB (for transaction ledger)
  Read Models: PostgreSQL (per service) + Redis
  Analytics: ClickHouse or BigQuery
  Search: Elasticsearch
  Object Storage: AWS S3 (multi-region)
  Global CDN: CloudFront
```

### CQRS for Transaction Ledger

At hyperscale, the transaction service separates reads and writes:

```
Command side:
  POST /transactions → Validate → Write to event store → Publish event

Event store:
  TransactionCreated { userId, walletId, amount, category, timestamp }
  TransactionDeleted { id, userId, timestamp }
  WalletBalanceUpdated { walletId, newBalance, timestamp }

Query side (materialized views, rebuilt from events):
  GET /transactions → Read from read model (fast, denormalized)
  GET /dashboard → Read from pre-computed aggregates
  GET /analytics → Read from ClickHouse OLAP
```

### Multi-Region Deployment

```
Primary region: Mumbai (ap-south-1)       — All Indian users
Secondary region: Singapore (ap-southeast-1) — SE Asia expansion
CDN: CloudFront → both regions
Database: Aurora Global (write in Mumbai, read replicas in Singapore)
Redis: ElastiCache Global Datastore
```

---

## 6. Technical Debt Backlog

Items to address proactively, ordered by priority:

| Item | Priority | Phase to Address |
|------|----------|-----------------|
| Add rate limiting to all endpoints (not just auth) | High | Phase 1 |
| Implement proper cache invalidation strategy | High | Phase 1 |
| Add integration tests for all API endpoints | High | Phase 1 |
| Move BullMQ workers off Vercel Functions to dedicated process | High | Phase 1→2 |
| Add database read replica for analytics queries | Medium | Phase 2 |
| Implement cursor-based pagination (replace offset) | Medium | Phase 2 |
| Add database connection pooling (PgBouncer) | High | Phase 1→2 |
| Implement proper soft-delete pruning job (retain 3 years) | Medium | Phase 2 |
| Add OpenAPI spec generation from route handlers | Low | Phase 2 |
| Extract AI service for independent scaling | High | Phase 2→3 |
| Implement distributed tracing (OpenTelemetry) | Medium | Phase 2 |
| Add E2E tests for all critical user flows | High | Phase 1 |
| Implement feature flags (LaunchDarkly or Vercel Edge Config) | Medium | Phase 2 |
| Add CQRS to transaction service | Low | Phase 4 |

---

## 7. Feature Flag Strategy

Features in development are gated behind flags to enable safe rollout:

```typescript
// src/lib/flags.ts
import { unstable_flag as flag } from '@vercel/flags/next'

export const aiChatEnabled = flag({
  key: 'ai-chat-enabled',
  defaultValue: false,
  description: 'Enable AI Financial Assistant chat',
})

export const bankSyncEnabled = flag({
  key: 'bank-sync-enabled',
  defaultValue: false,
  description: 'Enable Account Aggregator bank sync (Phase 2)',
})

// Usage in component
const enabled = await aiChatEnabled()
if (!enabled) return null
```

**Rollout strategy for major features:**
1. 0% → Internal team only (flag on for test accounts)
2. 5% → Beta users (opt-in via settings)
3. 25% → Random 25% of new signups
4. 50% → 50% of all users
5. 100% → GA (flag removed from codebase)

---

## 8. Open Engineering Questions

These are unsolved decisions that must be addressed before each phase:

| Question | Phase | Options | Current Lean |
|----------|-------|---------|-------------|
| How to handle Account Aggregator consent renewal? | 2 | Auto-renew vs. user-initiated | User-initiated (privacy-first) |
| Real-time notifications: SSE vs WebSocket? | 3 | SSE (simpler) vs WS (bidirectional) | SSE for Phase 2, WS for Phase 3 |
| Mobile app: React Native vs Flutter vs PWA-first? | 3 | All three viable | PWA first, then React Native |
| AI model: OpenAI-only vs multi-model? | 2 | Single provider vs. model abstraction | Abstraction layer now, multi-model Phase 2 |
| Transaction search: PostgreSQL FTS vs Elasticsearch? | 3 | PG (simple) vs ES (powerful, complex) | PG until 10M transactions, then ES |
| Analytics DB: PostgreSQL vs ClickHouse vs BigQuery? | 3 | All viable | PostgreSQL read replica for Phase 2, ClickHouse for Phase 3 |
| Event bus: Kafka vs SQS vs Inngest? | 3 | Kafka (powerful, complex) vs SQS (managed) | SQS for Phase 2 simplicity, Kafka for Phase 3 |
