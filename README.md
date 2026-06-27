# FinanceFlow — Premium SaaS Wealth Management & Financial Planning

FinanceFlow is a state-of-the-art, production-grade SaaS wealth management and financial tracking system rebuilt using Next.js 15, TypeScript, PostgreSQL (Prisma), and Redis.

## 🚀 Modern Tech Stack
- **Framework**: Next.js 15 (App Router, Server Actions, React 19)
- **Database**: PostgreSQL with Prisma ORM
- **Cache & Rate Limiting**: Redis (sorted sets sliding window)
- **Authentication**: NextAuth v5 (Auth.js) with credentials & OAuth (Google)
- **Structured Logging**: Pino Logger with PII redaction
- **Validation**: Strict Zod Schema guards

## 📌 Features
- **Multi-Tenant Authentication**: Credentials & Google OAuth callbacks, RTR session limits, rate limit protection.
- **Wallet & Asset Tracking**: Add credit cards, cash, bank accounts; transfer atomically.
- **Transactional Ledger**: Paginated transaction logs, precise balance revert/apply, budget compliance updates.
- **Budgeting System**: Monthly category limits, real-time alert thresholds, rollover logic.
- **Savings Goals**: Milestone metrics, automatic completions, push log alerts.
- **Dashboard Analytics**: Net Worth, income vs expense cash flow, dynamic budgets/goals progress, financial health score.

## ▶️ Setup Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@localhost:5432/financeflow"
   REDIS_URL="redis://localhost:6379"
   AUTH_SECRET="your-authjs-secret"
   RESEND_API_KEY="re_yourkey"
   ```
3. Run migrations and seed:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
