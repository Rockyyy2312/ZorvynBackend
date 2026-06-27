# 10 — Frontend Guidelines

> **Document Type:** Frontend Architecture & Standards  
> **Audience:** Frontend engineers, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines how frontend code is structured, written, and maintained in FinanceFlow. It covers Next.js 15 App Router patterns, component design, state management, data fetching, performance, and accessibility. Every frontend decision must trace back here.

---

## 1. Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 15 (App Router) | Framework, routing, SSR/SSG |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Shadcn UI | Latest | Accessible component primitives |
| Framer Motion | 11.x | Animations and transitions |
| TanStack Query | 5.x | Server state, caching, background refetch |
| React Hook Form | 7.x | Form state management |
| Zod | 3.x | Form validation schemas (shared with backend) |
| Chart.js | 4.x | Data visualizations |
| Zustand | 4.x | Client-only global state (auth, UI preferences) |

---

## 2. App Router Structure

### Route Groups and Layout Hierarchy

```
src/app/
├── layout.tsx                    # Root layout (fonts, global providers)
├── (auth)/                       # Route group — no shared layout with dashboard
│   ├── layout.tsx                # Auth layout (centered card, no sidebar)
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── verify-email/
│   │   └── page.tsx
│   └── forgot-password/
│       └── page.tsx
├── (dashboard)/                  # Protected route group
│   ├── layout.tsx                # Dashboard layout (sidebar + topbar)
│   ├── page.tsx                  # /  → Dashboard home
│   ├── transactions/
│   │   ├── page.tsx              # Transaction list
│   │   ├── new/
│   │   │   └── page.tsx          # Add transaction
│   │   └── [id]/
│   │       └── page.tsx          # Transaction detail/edit
│   ├── wallets/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── budgets/
│   │   └── page.tsx
│   ├── goals/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── investments/
│   │   └── page.tsx
│   ├── emis/
│   │   └── page.tsx
│   ├── subscriptions/
│   │   └── page.tsx
│   ├── reports/
│   │   └── page.tsx
│   ├── analytics/
│   │   └── page.tsx
│   └── settings/
│       ├── page.tsx
│       ├── profile/
│       │   └── page.tsx
│       ├── security/
│       │   └── page.tsx
│       ├── notifications/
│       │   └── page.tsx
│       └── billing/
│           └── page.tsx
├── (admin)/                      # Admin-only route group
│   ├── layout.tsx
│   └── admin/
│       ├── page.tsx              # Admin overview
│       ├── users/
│       │   └── page.tsx
│       └── ai-usage/
│           └── page.tsx
└── api/                          # API routes (see 06_API_STANDARDS.md)
```

### When to Use Server Components vs Client Components

**Default: Server Components.** Every page and layout is a Server Component unless it needs client-side interactivity.

| Use Server Component | Use Client Component (`'use client'`) |
|---------------------|--------------------------------------|
| Fetching initial page data | Event handlers (onClick, onChange) |
| Database access (via server actions) | Browser APIs (window, localStorage) |
| Rendering static or SEO content | React hooks (useState, useEffect) |
| Access to env vars (server-side) | TanStack Query hooks |
| Auth checks in layouts | Form interactions |
| Heavy computation | Real-time data (polling) |

```tsx
// GOOD — Server Component fetches data directly
// src/app/(dashboard)/transactions/page.tsx
import { auth } from '@/lib/auth'
import { transactionService } from '@/features/transactions/transaction.service'
import { TransactionList } from '@/features/transactions/components/TransactionList'

export default async function TransactionsPage() {
  const session = await auth()
  const transactions = await transactionService.findAll(session!.user.id, { page: 1, limit: 20 })

  return <TransactionList initialData={transactions} />
}

// GOOD — Client Component handles interactivity
// src/features/transactions/components/TransactionList.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchTransactions } from '../transaction.api'

export function TransactionList({ initialData }: { initialData: TransactionPage }) {
  const { data } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    initialData,         // Hydrates with server-fetched data
    staleTime: 2 * 60 * 1000,  // 2 minutes
  })
  // ...
}
```

---

## 3. Component Architecture

### Component Hierarchy

```
Page (Server Component)
└── Feature Container (Client Component, TanStack Query)
    ├── UI Components (Shadcn primitives)
    ├── Feature-Specific Components
    └── Shared Components
```

### Component File Structure

```
src/features/transactions/
├── components/
│   ├── TransactionList.tsx       # Main list container
│   ├── TransactionCard.tsx       # Single transaction row
│   ├── TransactionForm.tsx       # Create/edit form
│   ├── TransactionFilters.tsx    # Filter controls
│   └── TransactionSkeleton.tsx   # Loading skeleton
├── hooks/
│   ├── useTransactions.ts        # TanStack Query hook
│   └── useTransactionForm.ts     # Form logic
└── transaction.api.ts            # API call functions
```

### Component Rules

1. **One component per file.** No multiple exports of components from a single file.
2. **Props interfaces must be explicit and named:**

```tsx
// GOOD
interface TransactionCardProps {
  transaction: Transaction
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export function TransactionCard({ transaction, onEdit, onDelete, isLoading = false }: TransactionCardProps) { }

// BAD
export function TransactionCard(props: any) { }
```

3. **No business logic in components.** Business logic belongs in hooks or service layer.
4. **All interactive elements must have `data-testid`:**

```tsx
<button data-testid="save-transaction" onClick={handleSave}>Save</button>
<input data-testid="amount-input" {...register('amount')} />
```

5. **Never use inline styles.** Tailwind classes only.

---

## 4. Data Fetching Patterns

### Pattern 1: Server Component Initial Fetch + Client Hydration (Preferred)

```tsx
// Server: fetch data at render time
export default async function BudgetsPage() {
  const session = await auth()
  const budgets = await budgetService.findAll(session!.user.id, currentMonth())

  return (
    <QueryClientProvider>
      <BudgetsContainer initialBudgets={budgets} />
    </QueryClientProvider>
  )
}

// Client: use initialData for instant render, TanStack Query for updates
'use client'
export function BudgetsContainer({ initialBudgets }: Props) {
  const { data: budgets } = useQuery({
    queryKey: ['budgets', currentMonth()],
    queryFn: () => api.getBudgets(currentMonth()),
    initialData: initialBudgets,
    staleTime: 5 * 60 * 1000,
  })
  return <BudgetList budgets={budgets} />
}
```

### Pattern 2: TanStack Query for Mutations

```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function TransactionForm() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionDto) => api.createTransaction(data),
    onSuccess: (newTransaction) => {
      // Optimistic update: insert new transaction into cached list
      queryClient.setQueryData(['transactions'], (old: TransactionPage) => ({
        ...old,
        data: [newTransaction, ...old.data],
      }))
      // Invalidate summary caches
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Transaction added')
    },
    onError: (error: AppError) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (data: CreateTransactionDto) => createMutation.mutate(data)
  // ...
}
```

### TanStack Query Key Conventions

```typescript
// src/shared/constants/query-keys.ts
export const QUERY_KEYS = {
  dashboard: ['dashboard'] as const,
  transactions: {
    all: ['transactions'] as const,
    list: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', id] as const,
  },
  wallets: {
    all: ['wallets'] as const,
    detail: (id: string) => ['wallets', id] as const,
  },
  budgets: {
    all: (month: string) => ['budgets', month] as const,
  },
  goals: {
    all: ['goals'] as const,
    detail: (id: string) => ['goals', id] as const,
  },
  ai: {
    conversations: ['ai', 'conversations'] as const,
    conversation: (id: string) => ['ai', 'conversations', id] as const,
  },
}
```

---

## 5. Form Handling

All forms use React Hook Form + Zod. **Never use uncontrolled forms or manual `useState` for form fields.**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

// Reuse the same Zod schema from the backend validators
const CreateTransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  walletId: z.string().uuid(),
  transactionDate: z.string(),
  description: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof CreateTransactionSchema>

export function TransactionForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateTransactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      transactionDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (values: FormValues) => {
    // Call mutation
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  data-testid="amount-input"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  {...field}
                />
              </FormControl>
              <FormMessage data-testid="amount-error" />
            </FormItem>
          )}
        />
        {/* Other fields */}
        <button
          type="submit"
          data-testid="save-transaction"
          disabled={form.formState.isSubmitting}
          className="btn-primary w-full"
        >
          {form.formState.isSubmitting ? 'Saving...' : 'Save Transaction'}
        </button>
      </form>
    </Form>
  )
}
```

---

## 6. Loading and Error States

Every data-dependent UI must handle three states: loading, error, and success.

```tsx
// Loading: use skeleton, not spinner (less jarring)
if (isLoading) return <TransactionListSkeleton />

// Error: show actionable error with retry
if (isError) return (
  <EmptyState
    icon={<AlertCircle />}
    title="Couldn't load transactions"
    description={error.message}
    action={<button onClick={() => refetch()}>Try again</button>}
  />
)

// Empty: inform user + call to action
if (data.length === 0) return (
  <EmptyState
    icon={<Receipt />}
    title="No transactions yet"
    description="Add your first transaction to start tracking your finances."
    action={<Link href="/transactions/new">Add Transaction</Link>}
  />
)
```

### Skeleton Component Pattern

```tsx
// src/features/transactions/components/TransactionSkeleton.tsx
import { Skeleton } from '@/shared/components/ui/skeleton'

export function TransactionListSkeleton() {
  return (
    <div className="space-y-3" data-testid="transaction-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[120px]" />
          </div>
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  )
}
```

---

## 7. Performance Rules

1. **Images:** Always use `next/image` with explicit `width` and `height`. Never `<img>`.
2. **Links:** Always use `next/link`. Never `<a href>` for internal routes.
3. **Code splitting:** Dynamic import heavy components (Chart.js, PDF viewer):
```tsx
import dynamic from 'next/dynamic'
const SpendingChart = dynamic(() => import('./SpendingChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Chart.js is browser-only
})
```
4. **`staleTime`:** Every TanStack Query must have an explicit `staleTime`. The default (0) causes unnecessary refetches.
5. **Memoization:** Use `useMemo` only when computations are expensive (> 1ms). Don't premature-optimize.
6. **Avoid layout shift:** Skeleton screens must match the exact dimensions of loaded content.

---

## 8. Accessibility Rules

- All interactive elements must be keyboard navigable
- All images must have `alt` text (or `alt=""` if decorative)
- Color alone must not convey information (use icon + color)
- All form inputs must have associated `<label>`
- Focus ring must always be visible (never `outline: none` without replacement)
- ARIA labels on icon-only buttons: `<button aria-label="Delete transaction">`
- Modal dialogs must trap focus and return focus on close
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text

---

## 9. API Client Layer

```typescript
// src/features/transactions/transaction.api.ts
import { apiClient } from '@/lib/api-client'
import type { Transaction, CreateTransactionDto, TransactionPage } from './transaction.types'

export const transactionApi = {
  getAll: (filters?: TransactionFilters): Promise<TransactionPage> =>
    apiClient.get('/transactions', { params: filters }),

  getById: (id: string): Promise<Transaction> =>
    apiClient.get(`/transactions/${id}`),

  create: (dto: CreateTransactionDto): Promise<Transaction> =>
    apiClient.post('/transactions', dto),

  update: (id: string, dto: Partial<CreateTransactionDto>): Promise<Transaction> =>
    apiClient.patch(`/transactions/${id}`, dto),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/transactions/${id}`),
}
```

```typescript
// src/lib/api-client.ts
const BASE_URL = '/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(data.error?.code, data.error?.message, response.status)
  }

  return data.data
}

export const apiClient = {
  get: <T>(path: string, opts?: { params?: Record<string, unknown> }) => {
    const url = opts?.params ? `${path}?${new URLSearchParams(opts.params as Record<string, string>)}` : path
    return request<T>(url)
  },
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
```

---

## 10. Anti-Patterns (Frontend)

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| `useEffect` for data fetching | Race conditions, no caching, no loading state | TanStack Query |
| `useState` for server state | Stale data, no background refresh | TanStack Query |
| `fetch` directly in component body | No deduplication, no error handling | API client + TanStack Query |
| `localStorage` for sensitive data | XSS accessible | HttpOnly cookies (server-managed) |
| `console.log` in components | Leaks to production | Remove before commit |
| Inline styles | Bypasses design system | Tailwind classes only |
| Non-typed API responses | Type errors at runtime | Always type API returns |
| Missing `data-testid` on interactives | Tests can't find elements | Always add testid |
| Missing loading/error states | Blank screen or broken UI | Handle all 3 states |
| `<img>` instead of `next/image` | Unoptimized, no lazy loading | Always `next/image` |
