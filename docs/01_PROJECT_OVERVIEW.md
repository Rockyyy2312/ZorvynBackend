# 01 — Project Overview

> **Document Type:** Product & Engineering Overview  
> **Audience:** All engineers, product managers, stakeholders  
> **Status:** Living Document

---

## Purpose

This document defines what FinanceFlow is, why it exists, who it serves, and what success looks like. Every engineering decision in this codebase should be traceable back to the goals described here.

---

## 1. Vision Statement

**FinanceFlow** empowers individuals, families, freelancers, and small businesses to take complete control of their financial lives through intelligent automation, AI-driven insights, and a beautifully simple interface — all in one platform.

We believe that financial clarity should not require a finance degree, a personal accountant, or three separate apps. FinanceFlow brings it all together.

---

## 2. Problem Statement

### The Problem with Personal Finance Today

| Problem | Current State | FinanceFlow Solution |
|---------|--------------|----------------------|
| Fragmented tools | People use separate apps for budgets, investments, EMIs, subscriptions | Single unified platform |
| Manual data entry | Expense tracking requires constant manual input | Smart auto-categorization + AI tagging |
| No intelligence | Spreadsheets don't give advice | AI Financial Assistant with proactive insights |
| Bank lock-in | Each bank has its own app | Future bank integration layer (Open Banking) |
| No family visibility | Individual-only tools | Family accounts with shared budgets |
| Freelancer complexity | Self-employed users have irregular income | Freelancer-specific income tracking + tax estimates |
| Business basics | Small businesses can't afford accounting software | Business account tier with invoicing (roadmap) |

---

## 3. Target Users

### Persona 1: The Individual (Primary)
- Age: 22–40
- Profile: Salaried professional, early-career to mid-career
- Pain Points: Can't track where money goes, no savings discipline, doesn't know net worth
- Goals: Build emergency fund, track spending, save for goals (vacation, car, house)
- Usage Pattern: Daily check-in, monthly review

### Persona 2: The Family
- Age: 28–50, household with 2–5 members
- Profile: Dual-income household, multiple bank accounts
- Pain Points: Shared expenses are a mess, no visibility into spouse's spending, kids' spending unchecked
- Goals: Shared budget, household expense visibility, savings for children's education
- Usage Pattern: Weekly family budget review, daily transaction monitoring

### Persona 3: The Freelancer
- Age: 25–45
- Profile: Self-employed, variable income, multiple clients
- Pain Points: Irregular cash flow, no sense of "real" income, tax confusion
- Goals: Separate business and personal expenses, estimate taxes, track client invoices
- Usage Pattern: After each project payment, end-of-month tax prep

### Persona 4: The Small Business Owner
- Age: 30–55
- Profile: 1–20 employee business, no dedicated finance team
- Pain Points: Cash flow management, payroll timing, no real P&L visibility
- Goals: Business expense tracking, cash flow forecasting, subscription and vendor management
- Usage Pattern: Daily financial health check, monthly close

---

## 4. Core Features

### Authentication & User Management
- Email/password login with secure password hashing (bcrypt, cost factor 12)
- Google OAuth (one-click sign-in)
- Email verification (mandatory)
- Password reset with secure time-limited tokens
- Multi-device session management
- Login history and suspicious activity detection

### Dashboard
- Personalized financial health score
- Net worth snapshot
- Cash flow summary (income vs. expenses, current month)
- Upcoming bills and EMIs
- Budget progress bars
- Savings goal progress
- Recent transactions

### Expense Tracking
- Manual transaction entry
- AI-powered smart categorization
- Category customization
- Recurring expense detection
- Merchant normalization
- Bulk import (CSV)
- Receipt attachment (photo upload → S3)

### Income Tracking
- Multiple income source management
- Irregular income support (freelancer mode)
- Income vs. expense ratio tracking
- Tax estimation (flat % estimation, roadmap: full tax module)

### Wallet Management
- Multiple wallet/account types: bank account, cash wallet, credit card, digital wallet (UPI, Paytm, etc.)
- Balance tracking per wallet
- Transfer between wallets
- Wallet-level transaction history

### Budget Planning
- Monthly budget per category
- Budget vs. actual tracking
- Overspend alerts
- Budget rollover option
- Family shared budgets

### Savings Goals
- Goal creation with target amount and deadline
- Progress tracking
- Linked wallet contributions
- AI-suggested contribution amounts

### Investment Tracking
- Portfolio overview
- Asset class breakdown (equity, debt, gold, real estate, crypto)
- Manual investment entry
- Returns calculation (XIRR on roadmap)
- Investment goal linking

### EMI Management
- Track all active loans and EMIs
- EMI calendar (upcoming payments)
- Total debt burden view
- Early payoff simulation (roadmap)

### Subscription Tracking
- Detect recurring charges
- Subscription cost summary (monthly/annual)
- Cancel date reminders
- Subscription audit ("subscriptions you forgot about")

### Reports & Analytics
- Monthly/quarterly/annual reports
- Category-wise expense breakdown
- Income vs. expense trend
- Net worth trend over time
- Export to PDF and CSV

### AI Financial Assistant
- Natural language Q&A about user's finances
- Proactive insights and alerts
- Budget recommendations
- Goal achievement coaching
- Spending pattern analysis
- "Where did my money go this month?" type queries

### Smart Categorization
- ML-based transaction categorization
- User feedback loop (correct and it learns)
- Custom category rules
- Merchant alias database

### Notifications
- Email notifications (Resend)
- In-app notifications
- Push notifications (roadmap: mobile app)
- Budget alerts
- Bill reminders
- Unusual spending alerts
- AI-generated weekly summaries

### Admin Dashboard
- User management
- Plan management
- Revenue analytics
- Feature flags
- System health
- AI cost monitoring

### Premium Plans
- Free tier with limits
- Premium tier (individual)
- Family plan
- Business plan
- Annual discount

### Future: Bank Integrations
- Open Banking API integration (India: Account Aggregator framework)
- Auto-sync transactions
- Real-time balance

---

## 5. Success Metrics

### Product Metrics (North Star)

| Metric | Definition | Target (Year 1) |
|--------|-----------|-----------------|
| MAU | Monthly Active Users | 5,000 |
| D7 Retention | % users still active 7 days after signup | > 40% |
| D30 Retention | % users still active 30 days after signup | > 25% |
| NPS | Net Promoter Score | > 45 |
| Premium Conversion | Free → Premium upgrade rate | > 8% |
| AI Interaction Rate | % MAU using AI assistant | > 35% |

### Engineering Metrics

| Metric | Target |
|--------|--------|
| API p95 latency | < 200ms |
| API p99 latency | < 500ms |
| Uptime SLA | 99.9% |
| Error rate | < 0.1% of requests |
| Time to First Transaction | < 3 minutes post-signup |
| Test coverage | > 80% |
| Deploy frequency | Daily |
| Mean time to recover (MTTR) | < 30 minutes |

---

## 6. Scale Expectations

### Current State (Phase 1)
- **Users:** ~2,000
- **Infrastructure:** Single Vercel deployment, managed PostgreSQL, managed Redis
- **Transactions/day:** ~5,000
- **AI requests/day:** ~500

### Phase 2 Target (6–18 months)
- **Users:** 10,000–50,000
- **Changes needed:** Read replicas, Redis clustering, CDN optimization, queue scaling

### Phase 3 Target (18–36 months)
- **Users:** 100,000–500,000
- **Changes needed:** Service extraction (AI, Notifications, Payments as separate services), database sharding strategy, global CDN

### Phase 4 Target (36+ months)
- **Users:** 1,000,000+
- **Changes needed:** Full microservices, multi-region, CQRS + Event Sourcing for transaction ledger, dedicated ML pipeline

> **Architecture Principle:** The system is designed as a Modular Monolith today with clean module boundaries that allow extraction into microservices at any phase without rewriting business logic.

---

## 7. Regulatory and Compliance Context

FinanceFlow operates in India and must consider:

| Regulation | Implication |
|-----------|-------------|
| RBI Data Localization | User financial data must be stored in India |
| PDPB (Personal Data Protection Bill) | User consent for data use, right to deletion |
| Account Aggregator Framework | Required for bank integration (future) |
| GST | For premium plan billing |
| PCI-DSS | Not directly (Razorpay handles card data), but must not store card details |

> **Note:** FinanceFlow does not currently hold a NBFC or payment aggregator license. All payment processing is delegated to Razorpay.

---

## 8. Non-Goals (Explicit Exclusions)

The following are explicitly OUT of scope for v1:

- Direct bank account access (no screen scraping)
- Tax filing integration
- Insurance products
- Lending / credit products
- Cryptocurrency trading
- Invoice generation (roadmap for Business plan)
- Mobile native app (web-first, then PWA, then native)
- Multi-currency support (INR only for v1)
- Offline mode

---

## 9. Competitive Landscape

| Competitor | Strengths | Our Differentiation |
|-----------|-----------|---------------------|
| Walnut (acquired) | Transaction SMS parsing | AI assistant, goal tracking, family accounts |
| Money View | Credit score, bank sync | AI insights, business accounts, open API |
| ET Money | Mutual fund investing | Full expense + budget + AI, not just investing |
| Fi Money | Neobank + finance | Not a bank, lower friction, works across all banks |
| Spendee | Good UI | AI-native, Indian market focused |
| YNAB (US) | Methodology-driven budgeting | Indian payment methods, AI, local context |

---

## 10. Engineering Team Structure

| Role | Responsibilities |
|------|-----------------|
| Principal Engineer | Architecture decisions, cross-cutting concerns, documentation |
| Backend Lead | API design, database, services, performance |
| Frontend Lead | Next.js, component library, UX implementation |
| AI/ML Engineer | AI assistant, categorization model, prompt engineering |
| DevOps Engineer | CI/CD, infrastructure, monitoring, security operations |
| QA Engineer | Test strategy, E2E automation, load testing |
| Product Designer | Design system, user research, prototypes |
