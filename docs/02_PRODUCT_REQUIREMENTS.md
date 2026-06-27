# 02 — Product Requirements

> **Document Type:** Product Requirements & User Stories  
> **Audience:** Engineers, product managers, designers  
> **Status:** Living Document

---

## Purpose

This document defines every feature of FinanceFlow with detailed user stories, acceptance criteria, and implementation constraints. It is the contract between product and engineering. Every feature built must satisfy the acceptance criteria defined here before it can be considered complete.

---

## 1. How to Read This Document

Each feature section follows this structure:
- **Overview** — What it is and why it exists
- **User Stories** — "As a [persona], I want [goal] so that [benefit]"
- **Acceptance Criteria** — Testable conditions that define "done"
- **Constraints** — Technical or business limits
- **Out of Scope** — What is explicitly not included

---

## 2. Authentication & User Management

### Overview
Users must be able to create accounts, verify their identity, and securely access the platform across multiple devices.

### User Stories

**US-AUTH-01:** As a new user, I want to register with my email and a password so that I can create a FinanceFlow account.

**Acceptance Criteria:**
- [ ] Registration form requires: name (2–100 chars), email (valid format), password (8+ chars, 1 uppercase, 1 lowercase, 1 digit)
- [ ] On successful registration, a verification email is sent within 30 seconds
- [ ] User cannot login until email is verified
- [ ] Duplicate email returns a descriptive error, not a 500
- [ ] Password is never stored in plaintext
- [ ] Registration completes in < 3 seconds

**US-AUTH-02:** As a registered user, I want to log in with email and password so that I can access my financial data.

**Acceptance Criteria:**
- [ ] Login requires valid email + password combination
- [ ] Failed login shows a generic error (no email enumeration)
- [ ] After 5 failed attempts within 15 minutes from the same IP, subsequent attempts are rate-limited
- [ ] Successful login returns an access token (15-min TTL) and a refresh token (30-day TTL)
- [ ] Login is recorded in login history with IP and user agent
- [ ] Login page has "Forgot password?" link

**US-AUTH-03:** As a user, I want to sign in with Google so that I can access FinanceFlow without creating a new password.

**Acceptance Criteria:**
- [ ] "Continue with Google" button visible on login and registration pages
- [ ] On first Google sign-in, a new account is created automatically
- [ ] On subsequent Google sign-ins, the existing account is accessed
- [ ] If a user registered with email and later uses Google OAuth with the same email, the accounts are linked
- [ ] Google-authenticated users do not need email verification
- [ ] Avatar from Google is imported and stored

**US-AUTH-04:** As a user, I want to reset my password if I forget it, so I can regain access to my account.

**Acceptance Criteria:**
- [ ] "Forgot password" flow sends a reset link to the registered email
- [ ] Reset link expires after 1 hour
- [ ] Reset link is single-use (invalidated after first use)
- [ ] New password must meet the same complexity requirements as registration
- [ ] After password reset, all existing sessions are invalidated
- [ ] Reset page shows meaningful error if token is expired or already used

**US-AUTH-05:** As a user, I want to see and manage all active sessions on my account so that I can revoke access from devices I no longer use.

**Acceptance Criteria:**
- [ ] Sessions page shows: device name, browser, OS, IP address, last active time
- [ ] User can revoke any individual session (except the current one)
- [ ] User can revoke all other sessions with a single action
- [ ] Revoked sessions are immediately invalidated (next request returns 401)
- [ ] Current session is clearly labeled

---

## 3. Dashboard

### Overview
The dashboard is the first screen a user sees after login. It must provide an immediate financial health snapshot, requiring no clicks to understand the key numbers.

### User Stories

**US-DASH-01:** As a user, I want to see my financial health at a glance on the dashboard so that I immediately know where I stand.

**Acceptance Criteria:**
- [ ] Dashboard loads in < 2 seconds (LCP)
- [ ] Displays current month: total income, total expenses, net savings
- [ ] Displays total net worth (sum of all wallet balances)
- [ ] Displays budget progress for top 3 active budgets
- [ ] Displays savings goal progress for top 3 active goals
- [ ] Displays upcoming bills/EMIs in next 7 days
- [ ] Displays last 5 transactions
- [ ] Dashboard data reflects the current calendar month by default
- [ ] A financial health score (0–100) is displayed with a brief explanation
- [ ] Cash flow chart (income vs expenses) shows last 6 months

**US-DASH-02:** As a user, I want my dashboard to load skeleton screens while data is fetching so that I don't see a blank screen.

**Acceptance Criteria:**
- [ ] All dashboard widgets show skeleton loaders until data is available
- [ ] No layout shift after data loads (CLS < 0.1)
- [ ] Error state is shown if data fails to load, with a retry button

---

## 4. Expense & Income Tracking

### Overview
The core feature. Users must be able to record every financial transaction quickly and accurately.

### User Stories

**US-TRX-01:** As a user, I want to add a transaction in < 30 seconds so that tracking expenses doesn't feel like a burden.

**Acceptance Criteria:**
- [ ] Transaction form requires: type (income/expense/transfer), amount, wallet, date
- [ ] Category is optional — if not selected, AI categorizes automatically
- [ ] Merchant/description field is optional with autocomplete from past entries
- [ ] Date defaults to today
- [ ] Amount field accepts decimal values with up to 2 decimal places
- [ ] Amount cannot be zero or negative
- [ ] Amount cannot exceed ₹1,00,00,000 (ten million) in a single transaction
- [ ] On save, wallet balance updates immediately in the UI (optimistic update)
- [ ] Confirmation message appears within 1 second of saving
- [ ] Newly added transaction appears at the top of the transaction list

**US-TRX-02:** As a user, I want transactions to be automatically categorized by AI so that I don't have to select a category every time.

**Acceptance Criteria:**
- [ ] When no category is provided, AI categorizes the transaction within 2 seconds
- [ ] AI-categorized transactions are marked with a small indicator (e.g., ✨ icon)
- [ ] AI confidence score is stored (not shown to user directly)
- [ ] User can correct AI categorization by editing the transaction
- [ ] After a user corrects a categorization for a merchant, future transactions from the same merchant use the corrected category
- [ ] If AI is unavailable, transaction is saved as "Uncategorized" without blocking the user

**US-TRX-03:** As a user, I want to filter and search my transactions so that I can find specific entries quickly.

**Acceptance Criteria:**
- [ ] Filter by: type, category, wallet, date range, amount range
- [ ] Search by: merchant name, description (fuzzy match, case-insensitive)
- [ ] Filter by tags (comma-separated)
- [ ] Applied filters are visible as chips that can be individually removed
- [ ] Filter state persists when navigating away and back
- [ ] Transaction list paginates with 20 items per page
- [ ] "Load more" or page navigation available

**US-TRX-04:** As a user, I want to attach a receipt photo to a transaction so that I can keep records for expense reimbursement.

**Acceptance Criteria:**
- [ ] Support JPEG, PNG, PDF receipt uploads
- [ ] Maximum file size: 5MB per receipt
- [ ] Receipt is stored securely in S3, not in the database
- [ ] Receipt thumbnail is displayed in the transaction card
- [ ] Free plan users can attach 1 receipt per transaction
- [ ] Premium users can attach 3 receipts per transaction

**US-TRX-05:** As a user, I want to import transactions from a CSV file so that I can bulk-add historical data.

**Acceptance Criteria:**
- [ ] CSV must have columns: date, amount, description, type (optional), category (optional)
- [ ] System shows a preview of parsed transactions before import
- [ ] User can map CSV columns to system fields
- [ ] Duplicate detection: warn if a transaction with same date+amount+description already exists
- [ ] Import result shows: X imported, Y skipped (duplicates), Z failed (with reason)
- [ ] Maximum 500 transactions per CSV import for Free plan, 5000 for Premium
- [ ] Import processing happens asynchronously; user is notified on completion

---

## 5. Wallet Management

### User Stories

**US-WAL-01:** As a user, I want to add multiple wallets so that I can track money across all my bank accounts, cash, and digital wallets.

**Acceptance Criteria:**
- [ ] Supported wallet types: Bank Account, Cash, Credit Card, Digital Wallet, Investment, Savings
- [ ] Free plan: maximum 3 wallets
- [ ] Premium plan: maximum 20 wallets
- [ ] Each wallet has: name (required), type (required), initial balance, color, icon
- [ ] One wallet can be marked as "default" for quick transaction entry
- [ ] Wallets cannot be hard-deleted — only soft-deleted
- [ ] Deleting a wallet does not delete its transactions (they become orphaned to the wallet)

**US-WAL-02:** As a user, I want to transfer money between wallets so that I can record moving money from savings to checking.

**Acceptance Criteria:**
- [ ] Transfer creates two linked transactions: an expense from source and income to destination
- [ ] Both transactions share a `transferId` field linking them
- [ ] Transfer amount cannot exceed source wallet balance (for non-credit wallets)
- [ ] Transfer appears in both wallets' transaction history
- [ ] Deleting one side of a transfer does not automatically delete the other (a warning is shown)

---

## 6. Budget Planning

### User Stories

**US-BUD-01:** As a user, I want to set monthly spending limits per category so that I can control my expenses.

**Acceptance Criteria:**
- [ ] Budget can be set per category or as an overall monthly budget
- [ ] Free plan: maximum 5 budgets
- [ ] Premium plan: unlimited budgets
- [ ] Budget amount must be > 0
- [ ] Only one budget per category per month is allowed
- [ ] Budget period defaults to "Monthly" (quarterly and yearly available for Premium)
- [ ] Budget can optionally roll over unused amount to next month

**US-BUD-02:** As a user, I want to receive an alert when I'm approaching or have exceeded a budget so that I can adjust my spending.

**Acceptance Criteria:**
- [ ] Alert threshold is configurable per budget (default: 80%)
- [ ] In-app notification sent when spend reaches the alert threshold
- [ ] Email notification sent when budget is exceeded (if enabled in preferences)
- [ ] Budget progress bar turns yellow at 80% and red at 100%
- [ ] Alert is sent only once per threshold crossing per month (not on every transaction)

---

## 7. Savings Goals

### User Stories

**US-GOAL-01:** As a user, I want to create a savings goal with a target amount and deadline so that I have something concrete to work toward.

**Acceptance Criteria:**
- [ ] Goal requires: name, target amount
- [ ] Optional: target date, linked wallet, icon, color, description
- [ ] Free plan: maximum 3 active goals
- [ ] Premium: unlimited goals
- [ ] Goal progress is shown as a percentage bar and ₹ amount remaining
- [ ] If a target date is set, days remaining are displayed
- [ ] Goal status: ACTIVE, COMPLETED (auto-set when current = target), PAUSED, CANCELLED
- [ ] Completed goals are archived, not deleted

**US-GOAL-02:** As a user, I want to make manual contributions to a savings goal so that I can track progress over time.

**Acceptance Criteria:**
- [ ] Contribution requires: amount, optional note
- [ ] Contribution amount cannot exceed remaining amount needed for goal
- [ ] Contribution history is visible per goal
- [ ] When current amount reaches target, goal is automatically marked COMPLETED
- [ ] A congratulations notification is sent when a goal is completed
- [ ] AI suggests optimal monthly contribution based on target and deadline

---

## 8. Investment Tracking

### User Stories

**US-INV-01:** As a user, I want to track my investment portfolio so that I can see my total wealth and returns.

**Acceptance Criteria:**
- [ ] Investment entry requires: name, asset class, purchase amount, current value, purchase date
- [ ] Optional: quantity, purchase price, current price, platform, ticker/ISIN
- [ ] Asset classes: Equity, Debt, Gold, Real Estate, Crypto, Fixed Deposit, PPF, NPS, Other
- [ ] Portfolio summary shows: total invested, current value, total returns (₹ and %)
- [ ] Asset class breakdown shown as a pie chart
- [ ] Returns calculation: `(currentValue - purchaseAmount) / purchaseAmount * 100`
- [ ] Free plan: maximum 10 investment entries
- [ ] Premium: unlimited

---

## 9. EMI Management

### User Stories

**US-EMI-01:** As a user, I want to track all my EMIs so that I know my total debt burden and upcoming payment dates.

**Acceptance Criteria:**
- [ ] EMI entry requires: lender name, total amount, EMI amount, total months, interest rate, start date, next due date
- [ ] Optional: loan type, account number, linked wallet, notes
- [ ] EMI calendar view shows all upcoming EMIs in next 30 days
- [ ] Total monthly EMI commitment is displayed prominently
- [ ] Debt-to-income ratio is calculated and shown (if income data is available)
- [ ] Reminder notification sent 3 days before next due date
- [ ] When all months are paid, EMI status changes to COMPLETED automatically
- [ ] Marking an EMI as paid for a month increments `paidMonths` and updates `nextDueDate`

---

## 10. Subscription Tracking

### User Stories

**US-SUB-01:** As a user, I want to track all my recurring subscriptions so that I can audit and cancel ones I don't use.

**Acceptance Criteria:**
- [ ] Subscription requires: name, amount, billing cycle, next billing date
- [ ] Billing cycles: Monthly, Quarterly, Yearly, Weekly
- [ ] Optional: URL, logo, category, linked wallet, notes
- [ ] Monthly and annual subscription cost summary displayed
- [ ] "Upcoming renewals" view shows subscriptions due in next 30 days
- [ ] Reminder notification sent 3 days before renewal date
- [ ] Cancelled subscriptions move to "Cancelled" tab (soft delete)
- [ ] Auto-detection of recurring charges from transaction history (Phase 2)

---

## 11. Reports & Analytics

### User Stories

**US-REP-01:** As a user, I want to view a monthly financial report so that I can understand where my money went.

**Acceptance Criteria:**
- [ ] Monthly report includes: income summary, expense summary, savings rate, top 5 categories
- [ ] Spending by category shown as donut chart + data table
- [ ] Month-over-month comparison (current vs previous month)
- [ ] Report is available for any past month
- [ ] PDF export generates a well-formatted downloadable report

**US-REP-02:** As a user, I want to see my cash flow trend over 6 months so that I can understand my saving patterns.

**Acceptance Criteria:**
- [ ] Bar chart: income vs expenses for last 6 months (configurable up to 12)
- [ ] Net savings line overlaid on the bar chart
- [ ] Clicking a bar drills down to that month's breakdown
- [ ] Chart is responsive (readable on mobile)

**US-REP-03:** As a user, I want to export my transaction data as a CSV so that I can use it in other tools.

**Acceptance Criteria:**
- [ ] Export includes: date, merchant, description, category, amount, type, wallet, tags
- [ ] User can filter by date range before exporting
- [ ] Export is generated asynchronously for large datasets (> 1000 rows)
- [ ] User is notified via email when export is ready (for async exports)
- [ ] Export download link expires after 24 hours

---

## 12. AI Financial Assistant

### User Stories

**US-AI-01:** As a user, I want to ask questions about my finances in natural language so that I can get instant insights without navigating to multiple screens.

**Acceptance Criteria:**
- [ ] Chat interface available from every page (floating button or sidebar)
- [ ] AI has access to current month's transactions, budgets, goals, wallets
- [ ] AI responses are accurate to the user's actual data (no hallucinated numbers)
- [ ] AI responds within 3 seconds for typical queries
- [ ] Streaming response (text appears progressively, not all at once)
- [ ] Free plan: 5 AI messages per day
- [ ] Premium plan: 50 AI messages per day
- [ ] Conversation history persists for 30 days
- [ ] AI clearly states when it doesn't have enough data to answer

**US-AI-02:** As a user, I want to receive proactive weekly financial insights from the AI so that I discover patterns I might miss.

**Acceptance Criteria:**
- [ ] Weekly insights generated every Sunday night
- [ ] Insights cover: top spending category change, budget alerts, goal progress
- [ ] Insights are personalized to the user's actual data
- [ ] Delivered as in-app notification + email (if preferences allow)
- [ ] User can disable AI insights in notification preferences
- [ ] Insights never include advice that could be construed as financial advice requiring a license

---

## 13. Premium Plans

### Plan Comparison

| Feature | Free | Premium | Family | Business |
|---------|------|---------|--------|----------|
| Wallets | 3 | 20 | 20 per member | 20 |
| Transactions/month | 100 | Unlimited | Unlimited | Unlimited |
| Budgets | 5 | Unlimited | Unlimited | Unlimited |
| Savings Goals | 3 | Unlimited | Unlimited | Unlimited |
| Investments | 10 | Unlimited | Unlimited | Unlimited |
| AI Messages/day | 5 | 50 | 50 per member | 200 |
| Reports | Basic | Advanced + PDF | Advanced + PDF | Advanced + PDF + Business reports |
| CSV Export | 1 per month | Unlimited | Unlimited | Unlimited |
| Receipt attachment | 1 per tx | 3 per tx | 3 per tx | 5 per tx |
| Family members | — | — | Up to 6 | — |
| Priority support | ✗ | ✓ | ✓ | ✓ |
| Price (monthly) | ₹0 | ₹199 | ₹349 | ₹499 |
| Price (annual) | ₹0 | ₹1,999 | ₹3,499 | ₹4,999 |

### User Stories

**US-PREM-01:** As a free user, I want to upgrade to Premium so that I can remove limits and access advanced features.

**Acceptance Criteria:**
- [ ] Upgrade flow is accessible from any "plan limit reached" prompt
- [ ] Razorpay payment form loads within 2 seconds
- [ ] Payment confirmation appears within 5 seconds of successful charge
- [ ] Premium features are unlocked immediately after payment
- [ ] User receives a payment confirmation email
- [ ] Razorpay webhook confirms payment server-side before unlocking features
- [ ] Annual plan shows how much the user saves vs monthly

---

## 14. Notifications

### User Stories

**US-NOTIF-01:** As a user, I want to receive timely notifications about my finances so that I never miss important events.

**Acceptance Criteria:**
- [ ] In-app notification bell shows unread count
- [ ] Notifications panel shows last 50 notifications (paginated)
- [ ] Each notification has: title, body, timestamp, read/unread state
- [ ] Clicking a notification marks it as read and navigates to the relevant feature
- [ ] "Mark all as read" button available
- [ ] User can configure which notification types to receive (per-type toggle)
- [ ] Email notifications respect user's email notification preference

**Notification Types and Triggers:**
| Type | Trigger |
|------|---------|
| Budget Alert | Spend reaches configured threshold % |
| Bill Reminder | 3 days before EMI/subscription due date |
| Goal Milestone | Goal reaches 25%, 50%, 75%, 100% |
| Unusual Spend | Transaction > 3x the user's average for that category |
| AI Insight | Weekly AI-generated insight |
| Payment Success | Premium subscription payment confirmed |
| Payment Failed | Premium subscription renewal failed |
