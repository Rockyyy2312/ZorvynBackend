# 06 — API Standards

> **Document Type:** API Design & Contract  
> **Audience:** Backend engineers, frontend engineers, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines every API endpoint in FinanceFlow, the request/response format, error codes, pagination, filtering, rate limiting, versioning, and idempotency rules. All Route Handlers must conform to these standards. No exceptions.

---

## 1. General Conventions

### Base URL
```
Production:  https://app.financeflow.in/api/v1
Staging:     https://staging.financeflow.in/api/v1
Development: http://localhost:3000/api/v1
```

### Versioning
All routes are prefixed with `/api/v1`. When a breaking change is needed, introduce `/api/v2` for the affected resource only. Never remove a version until all clients have migrated (minimum 6-month deprecation period).

### HTTP Methods
| Method | Use |
|--------|-----|
| `GET` | Read resource(s) — must be idempotent and safe |
| `POST` | Create resource or trigger action |
| `PUT` | Full replacement of a resource |
| `PATCH` | Partial update of a resource |
| `DELETE` | Soft-delete a resource |

---

## 2. Standard Response Format

Every API response, success or error, uses this envelope:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 243,
    "totalPages": 13
  },
  "timestamp": "2025-06-01T10:30:00.000Z",
  "requestId": "req_01HXYZ123"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "The requested transaction does not exist or has been deleted.",
    "details": [],
    "field": null
  },
  "timestamp": "2025-06-01T10:30:00.000Z",
  "requestId": "req_01HXYZ123"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      { "field": "amount", "message": "Amount must be greater than 0" },
      { "field": "categoryId", "message": "Invalid UUID format" }
    ]
  },
  "timestamp": "2025-06-01T10:30:00.000Z",
  "requestId": "req_01HXYZ123"
}
```

### Response Helper (TypeScript)
```typescript
// src/shared/utils/api-response.ts
export class ApiResponse {
  static success<T>(data: T, meta?: PaginationMeta) {
    return Response.json({ success: true, data, meta, timestamp: new Date().toISOString() }, { status: 200 })
  }
  static created<T>(data: T) {
    return Response.json({ success: true, data, timestamp: new Date().toISOString() }, { status: 201 })
  }
  static noContent() {
    return new Response(null, { status: 204 })
  }
  static error(code: string, message: string, status: number, details?: unknown[]) {
    return Response.json({ success: false, error: { code, message, details }, timestamp: new Date().toISOString() }, { status })
  }
}
```

---

## 3. HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH, PUT |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Malformed request body or params |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist or user can't see it |
| 409 | Conflict | Duplicate creation (e.g. same email) |
| 422 | Unprocessable | Validation passed but business rule violated |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Unexpected server error |
| 503 | Service Unavailable | Planned maintenance or dependency down |

---

## 4. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `INVALID_TOKEN` | 401 | JWT is malformed or signature invalid |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `UNAUTHORIZED` | 401 | No token provided |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `PLAN_REQUIRED` | 403 | Feature requires a Premium/Family/Business plan |
| `NOT_FOUND` | 404 | Generic resource not found |
| `USER_NOT_FOUND` | 404 | User record not found |
| `WALLET_NOT_FOUND` | 404 | Wallet not found |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction not found |
| `BUDGET_NOT_FOUND` | 404 | Budget not found |
| `GOAL_NOT_FOUND` | 404 | Savings goal not found |
| `EMAIL_ALREADY_EXISTS` | 409 | Registration with existing email |
| `WALLET_ALREADY_DEFAULT` | 409 | Cannot set default — already default |
| `BUDGET_ALREADY_EXISTS` | 409 | Budget for category/month already exists |
| `INSUFFICIENT_BALANCE` | 422 | Transfer exceeds wallet balance |
| `INVALID_DATE_RANGE` | 422 | Start date after end date |
| `GOAL_ALREADY_COMPLETED` | 422 | Cannot modify completed goal |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server-side error |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI provider is unreachable |

---

## 5. Pagination

All list endpoints support cursor-based or offset-based pagination. Use **offset pagination** for simplicity at current scale, with a planned migration to **cursor-based** at 100k+ records.

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Field to sort by |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

### Example
```
GET /api/v1/transactions?page=2&limit=20&sortBy=transactionDate&sortOrder=desc
```

### Response meta
```json
{
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 243,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## 6. Filtering

### Common Filters (Transactions)
| Param | Type | Example |
|-------|------|---------|
| `type` | `INCOME\|EXPENSE\|TRANSFER` | `?type=EXPENSE` |
| `categoryId` | UUID | `?categoryId=uuid` |
| `walletId` | UUID | `?walletId=uuid` |
| `startDate` | ISO 8601 date | `?startDate=2025-01-01` |
| `endDate` | ISO 8601 date | `?endDate=2025-01-31` |
| `minAmount` | decimal | `?minAmount=100` |
| `maxAmount` | decimal | `?maxAmount=5000` |
| `search` | string | `?search=swiggy` |
| `tags` | comma-separated | `?tags=food,weekend` |

---

## 7. Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Unauthenticated | 20 req | per minute per IP |
| Free plan | 100 req | per minute per user |
| Premium plan | 300 req | per minute per user |
| Admin | 1000 req | per minute |
| AI endpoints | 10 req | per minute per user |
| Auth endpoints | 5 req | per 15 minutes per IP |

Rate limit headers are always returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717234800
```

---

## 8. Idempotency

POST endpoints that create financial records support idempotency keys to prevent duplicate transactions on retry.

```
POST /api/v1/transactions
Idempotency-Key: idem_01HXYZ123ABC
```

If the same `Idempotency-Key` is submitted within 24 hours, the original response is returned without creating a duplicate. Keys expire after 24 hours.

---

## 9. Authentication Header

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## 10. Complete Endpoint Reference

---

### 10.1 Authentication

#### POST /api/v1/auth/register
Register a new user with email and password.

**Request:**
```json
{
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "password": "SecurePass123!",
  "timezone": "Asia/Kolkata"
}
```
**Response:** `201`
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "Arjun Mehta", "email": "arjun@example.com", "emailVerified": false },
    "message": "Verification email sent."
  }
}
```

#### POST /api/v1/auth/login
```json
{ "email": "arjun@example.com", "password": "SecurePass123!" }
```
**Response:** `200`
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "ref_...",
    "expiresIn": 900,
    "user": { "id": "uuid", "name": "Arjun Mehta", "plan": "FREE" }
  }
}
```

#### POST /api/v1/auth/refresh
```json
{ "refreshToken": "ref_..." }
```
**Response:** `200` — new `accessToken` and `refreshToken`

#### POST /api/v1/auth/logout
Invalidates the current refresh token.  
**Headers:** `Authorization: Bearer <token>`  
**Response:** `204`

#### POST /api/v1/auth/forgot-password
```json
{ "email": "arjun@example.com" }
```
**Response:** `200` — always returns success (prevent email enumeration)

#### POST /api/v1/auth/reset-password
```json
{ "token": "reset_token", "password": "NewSecurePass456!" }
```
**Response:** `200`

#### POST /api/v1/auth/verify-email
```json
{ "token": "verify_token" }
```
**Response:** `200`

#### GET /api/v1/auth/google
Redirects to Google OAuth. No body.

#### GET /api/v1/auth/google/callback
OAuth callback. Handled server-side, redirects to dashboard.

---

### 10.2 Users

#### GET /api/v1/users/me
Get the current authenticated user's profile.

**Response:** `200`
```json
{
  "data": {
    "id": "uuid",
    "name": "Arjun Mehta",
    "email": "arjun@example.com",
    "avatarUrl": null,
    "plan": "PREMIUM",
    "planExpiresAt": "2026-01-01T00:00:00.000Z",
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "emailVerified": true,
    "onboardingCompleted": true,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

#### PATCH /api/v1/users/me
Update profile fields.
```json
{ "name": "Arjun Kumar Mehta", "timezone": "Asia/Kolkata", "avatarUrl": "https://..." }
```

#### DELETE /api/v1/users/me
Soft-delete the user account. Requires password confirmation.
```json
{ "password": "SecurePass123!", "reason": "not using anymore" }
```

#### GET /api/v1/users/me/sessions
List all active device sessions.

#### DELETE /api/v1/users/me/sessions/:sessionId
Revoke a specific session.

#### GET /api/v1/users/me/login-history
```
GET /api/v1/users/me/login-history?page=1&limit=20
```

---

### 10.3 Wallets

#### GET /api/v1/wallets
List all wallets for the current user.

**Response:** `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "HDFC Savings",
      "type": "BANK_ACCOUNT",
      "balance": "45200.50",
      "currency": "INR",
      "isDefault": true,
      "color": "#4ECDC4",
      "icon": "bank",
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/v1/wallets
```json
{
  "name": "ICICI Credit Card",
  "type": "CREDIT_CARD",
  "balance": "-15000.00",
  "color": "#FF6B6B",
  "icon": "credit-card"
}
```

#### GET /api/v1/wallets/:id
#### PATCH /api/v1/wallets/:id
#### DELETE /api/v1/wallets/:id

#### POST /api/v1/wallets/transfer
Transfer between wallets.
```json
{
  "fromWalletId": "uuid",
  "toWalletId": "uuid",
  "amount": "5000.00",
  "note": "Moving savings to FD wallet",
  "date": "2025-06-01"
}
```

---

### 10.4 Transactions

#### GET /api/v1/transactions
```
GET /api/v1/transactions?page=1&limit=20&type=EXPENSE&startDate=2025-06-01&endDate=2025-06-30&categoryId=uuid&search=swiggy
```

**Response:** `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "EXPENSE",
      "amount": "450.00",
      "description": "Swiggy order",
      "merchant": "Swiggy",
      "transactionDate": "2025-06-15T19:30:00.000Z",
      "category": { "id": "uuid", "name": "Food & Dining", "icon": "🍔", "color": "#FF6B6B" },
      "wallet": { "id": "uuid", "name": "HDFC Savings" },
      "aiCategorized": true,
      "aiConfidence": "0.95",
      "tags": ["food", "delivery"]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 89, "totalPages": 5 }
}
```

#### POST /api/v1/transactions
```json
{
  "walletId": "uuid",
  "categoryId": "uuid",
  "type": "EXPENSE",
  "amount": "450.00",
  "description": "Swiggy order",
  "merchant": "Swiggy",
  "transactionDate": "2025-06-15T19:30:00.000Z",
  "tags": ["food", "delivery"]
}
```

#### GET /api/v1/transactions/:id
#### PATCH /api/v1/transactions/:id
#### DELETE /api/v1/transactions/:id (soft delete)

#### POST /api/v1/transactions/bulk-import
Import transactions from CSV. `multipart/form-data`.
```
file: transactions.csv
walletId: uuid
```

#### POST /api/v1/transactions/:id/receipt
Upload receipt image. `multipart/form-data`.
```
file: receipt.jpg
```

---

### 10.5 Budgets

#### GET /api/v1/budgets?month=6&year=2025
#### POST /api/v1/budgets
```json
{
  "categoryId": "uuid",
  "limitAmount": "5000.00",
  "month": 6,
  "year": 2025,
  "alertAt": 80,
  "rollover": false
}
```
#### PATCH /api/v1/budgets/:id
#### DELETE /api/v1/budgets/:id

#### GET /api/v1/budgets/summary?month=6&year=2025
Returns all budgets with spent amounts and percentages.

---

### 10.6 Savings Goals

#### GET /api/v1/goals
#### POST /api/v1/goals
```json
{
  "name": "Goa Trip",
  "targetAmount": "30000.00",
  "targetDate": "2025-12-01",
  "walletId": "uuid",
  "icon": "✈️",
  "color": "#45B7D1"
}
```
#### GET /api/v1/goals/:id
#### PATCH /api/v1/goals/:id
#### DELETE /api/v1/goals/:id

#### POST /api/v1/goals/:id/contribute
```json
{ "amount": "2000.00", "note": "Monthly contribution" }
```

---

### 10.7 Investments

#### GET /api/v1/investments
#### GET /api/v1/investments/summary
Returns total portfolio value, returns, and asset class breakdown.

#### POST /api/v1/investments
```json
{
  "name": "Nippon India Nifty 50 Index Fund",
  "assetClass": "EQUITY",
  "purchaseAmount": "10000.00",
  "currentValue": "11500.00",
  "purchaseDate": "2024-01-01",
  "platform": "Groww",
  "ticker": "NIFTYBEES"
}
```
#### PATCH /api/v1/investments/:id
#### DELETE /api/v1/investments/:id

---

### 10.8 EMIs

#### GET /api/v1/emis
#### POST /api/v1/emis
```json
{
  "lenderName": "HDFC Bank",
  "loanType": "HOME_LOAN",
  "totalAmount": "2000000.00",
  "emiAmount": "18500.00",
  "totalMonths": 240,
  "interestRate": "8.5",
  "startDate": "2023-01-01",
  "nextDueDate": "2025-07-01",
  "walletId": "uuid"
}
```
#### GET /api/v1/emis/:id
#### PATCH /api/v1/emis/:id
#### DELETE /api/v1/emis/:id

#### POST /api/v1/emis/:id/mark-paid
Record an EMI payment.
```json
{ "paidAt": "2025-06-05T10:00:00.000Z", "amount": "18500.00" }
```

---

### 10.9 Subscriptions

#### GET /api/v1/subscriptions
#### POST /api/v1/subscriptions
```json
{
  "name": "Netflix",
  "amount": "649.00",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2025-07-01",
  "categoryId": "uuid",
  "walletId": "uuid",
  "url": "https://netflix.com"
}
```
#### PATCH /api/v1/subscriptions/:id
#### DELETE /api/v1/subscriptions/:id

#### GET /api/v1/subscriptions/summary
Returns total monthly/annual spend on subscriptions.

---

### 10.10 Reports & Analytics

#### GET /api/v1/reports/monthly?month=6&year=2025
Full monthly financial report.

#### GET /api/v1/analytics/overview?period=MONTH&date=2025-06-01
High-level income vs. expense, net savings.

#### GET /api/v1/analytics/spending-by-category?startDate=2025-06-01&endDate=2025-06-30
```json
{
  "data": [
    { "category": "Food & Dining", "amount": "8500.00", "percentage": 32.5, "count": 28 },
    { "category": "Transportation", "amount": "3200.00", "percentage": 12.2, "count": 15 }
  ]
}
```

#### GET /api/v1/analytics/cash-flow?months=6
Monthly income vs expense for last N months.

#### GET /api/v1/analytics/net-worth-trend?months=12
Net worth trend over last N months.

#### POST /api/v1/reports/export
Generate a downloadable PDF/CSV report.
```json
{ "type": "PDF", "period": "MONTHLY", "month": 6, "year": 2025 }
```

---

### 10.11 Notifications

#### GET /api/v1/notifications?isRead=false&page=1&limit=20
#### PATCH /api/v1/notifications/:id/read
#### PATCH /api/v1/notifications/read-all
#### DELETE /api/v1/notifications/:id

#### GET /api/v1/notifications/preferences
#### PATCH /api/v1/notifications/preferences
```json
{
  "budgetAlerts": true,
  "billReminders": true,
  "unusualSpend": true,
  "aiInsights": true,
  "weeklyDigest": true,
  "emailNotifications": true
}
```

---

### 10.12 AI Financial Assistant

#### POST /api/v1/ai/chat
```json
{
  "message": "Where did I spend the most money last month?",
  "conversationId": "uuid"
}
```
**Response:** `200`
```json
{
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid",
    "response": "Last month, your highest spending was in Food & Dining at ₹8,500 (32% of total expenses), followed by Transportation at ₹3,200. Your Swiggy orders alone accounted for ₹4,200.",
    "insights": [
      { "type": "SPENDING_SPIKE", "category": "Food & Dining", "message": "38% higher than your 3-month average" }
    ],
    "cached": false
  }
}
```

#### GET /api/v1/ai/conversations
#### GET /api/v1/ai/conversations/:id
#### DELETE /api/v1/ai/conversations/:id

#### POST /api/v1/ai/categorize
Categorize a single transaction description.
```json
{ "description": "SWIGGY ORDER #12345", "amount": "450.00" }
```

#### GET /api/v1/ai/insights
Get proactive AI-generated financial insights for the user.

---

### 10.13 Payments & Premium

#### GET /api/v1/payments/plans
List all available premium plans and pricing.

#### POST /api/v1/payments/create-order
```json
{ "plan": "PREMIUM", "billingCycle": "YEARLY" }
```
**Response:**
```json
{
  "data": {
    "razorpayOrderId": "order_...",
    "amount": 199900,
    "currency": "INR",
    "key": "rzp_live_..."
  }
}
```

#### POST /api/v1/payments/verify
```json
{
  "razorpayPaymentId": "pay_...",
  "razorpayOrderId": "order_...",
  "razorpaySignature": "sig_..."
}
```

#### GET /api/v1/payments/subscription
Get the user's current premium subscription status.

#### POST /api/v1/payments/cancel
Cancel the premium subscription at period end.

---

### 10.14 Webhooks

#### POST /api/v1/webhooks/razorpay
Razorpay payment events (subscription renewals, failures).  
Validates `X-Razorpay-Signature` header before processing.

---

### 10.15 Admin (Admin-only endpoints)

All admin endpoints require `isAdmin: true` on the user.

#### GET /api/v1/admin/users?page=1&search=arjun
#### GET /api/v1/admin/users/:id
#### PATCH /api/v1/admin/users/:id/plan
#### DELETE /api/v1/admin/users/:id

#### GET /api/v1/admin/stats
Platform-wide stats: total users, MAU, revenue, AI cost.

#### GET /api/v1/admin/ai/usage
AI usage and cost breakdown by model and day.

#### POST /api/v1/admin/feature-flags
#### GET /api/v1/admin/feature-flags

---

### 10.16 Health Checks

#### GET /api/v1/health
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-06-01T10:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok"
  }
}
```

#### GET /api/v1/health/ready
Kubernetes/load balancer readiness probe.

#### GET /api/v1/health/live
Liveness probe.

---

## 11. Request ID Tracing

Every request receives a unique `X-Request-ID` header. If not provided by the client, the server generates one. This ID appears in:
- Response headers: `X-Request-ID: req_01HXYZ123`
- Response body: `"requestId": "req_01HXYZ123"`
- All log entries for the request
- Sentry error reports

This enables full request tracing across logs.
