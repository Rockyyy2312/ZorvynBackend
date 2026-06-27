# 13 — UI/UX Design System

> **Document Type:** Design System & Component Library  
> **Audience:** Frontend engineers, designers, AI coding agents  
> **Status:** Living Document

---

## Purpose

This document defines FinanceFlow's complete design system — the single source of truth for typography, color, spacing, components, dark mode, accessibility, and animation. Every UI element must reference this system. Custom one-off styles are a code smell.

---

## 1. Design Principles

| Principle | What It Means in Practice |
|-----------|--------------------------|
| **Clarity over cleverness** | Financial data must be instantly readable. No decorative noise. |
| **Trust through polish** | Users entrust us with their money data. The UI must feel professional and reliable. |
| **Mobile-first** | Design for 375px first, then expand. Most users check finances on their phone. |
| **Accessible by default** | Every component passes WCAG 2.1 AA before it ships. |
| **Data-forward** | Numbers and charts are the hero. UI chrome is minimal. |
| **Consistent over unique** | Use the design system. Don't invent new patterns for every feature. |

---

## 2. Color Palette

### Semantic Color Tokens (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',   // Primary brand
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Semantic
        success:  { DEFAULT: '#22c55e', light: '#dcfce7', dark: '#15803d' },
        warning:  { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#b45309' },
        danger:   { DEFAULT: '#ef4444', light: '#fee2e2', dark: '#b91c1c' },
        income:   { DEFAULT: '#22c55e', light: '#dcfce7' },   // Always green
        expense:  { DEFAULT: '#ef4444', light: '#fee2e2' },   // Always red
        transfer: { DEFAULT: '#3b82f6', light: '#dbeafe' },   // Always blue
        // Neutral (maps to Shadcn CSS variables)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card:       'hsl(var(--card))',
        border:     'hsl(var(--border))',
        muted:      'hsl(var(--muted))',
        accent:     'hsl(var(--accent))',
      },
    },
  },
}
```

### Color Usage Rules

| Token | Use | Never Use For |
|-------|-----|--------------|
| `brand-500` | Primary actions, links, focus rings | Text on white (contrast too low) |
| `success` / `income` | Positive amounts, success states, gains | Decorative elements |
| `danger` / `expense` | Negative amounts, errors, losses | Warnings (use `warning`) |
| `warning` | Budget alerts, approaching limits | Errors |
| `muted` | Secondary text, placeholders, disabled states | Primary text |

### Dark Mode (CSS Variables Approach)

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --primary: 221 83% 53%;         /* brand-500 */
  --primary-foreground: 0 0% 100%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;
}

.dark {
  --background: 222 47% 7%;
  --foreground: 210 40% 98%;
  --card: 222 47% 11%;
  --card-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --primary: 213 93% 67%;
  --primary-foreground: 222 47% 7%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;
}
```

---

## 3. Typography

### Font Stack
- **Primary:** `Inter` (variable font, loaded via `next/font/google`)
- **Monospace (numbers/amounts):** `JetBrains Mono` — used for all currency values to ensure digit alignment

```typescript
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})
```

### Type Scale

| Class | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| `text-xs` | 12px | 400 | 1.5 | Labels, badges, metadata |
| `text-sm` | 14px | 400/500 | 1.5 | Body text, form labels |
| `text-base` | 16px | 400 | 1.6 | Default body |
| `text-lg` | 18px | 500/600 | 1.4 | Card titles, section headings |
| `text-xl` | 20px | 600 | 1.3 | Page section headings |
| `text-2xl` | 24px | 700 | 1.2 | Dashboard KPI labels |
| `text-3xl` | 30px | 700 | 1.15 | Dashboard KPI values |
| `text-4xl` | 36px | 800 | 1.1 | Net worth figure |

### Amount Display Pattern

```tsx
// src/shared/components/AmountDisplay.tsx
interface AmountDisplayProps {
  amount: string | number  // Always string from Decimal.toFixed(2)
  type?: 'income' | 'expense' | 'transfer' | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSign?: boolean
}

export function AmountDisplay({ amount, type = 'neutral', size = 'md', showSign = false }: AmountDisplayProps) {
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-4xl font-bold',
  }[size]

  const colorClass = {
    income: 'text-success',
    expense: 'text-danger',
    transfer: 'text-brand-500',
    neutral: 'text-foreground',
  }[type]

  const prefix = showSign && type === 'income' ? '+' : type === 'expense' ? '-' : ''

  return (
    <span className={`font-mono ${sizeClass} ${colorClass}`}>
      {prefix}₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </span>
  )
}
```

---

## 4. Spacing & Layout

### Spacing Scale (Tailwind defaults)
Use only multiples of 4px (Tailwind's base-4 scale). Never use arbitrary values like `mt-[13px]`.

```
4px  → p-1, m-1
8px  → p-2, m-2
12px → p-3, m-3
16px → p-4, m-4     ← Default card padding
20px → p-5, m-5
24px → p-6, m-6     ← Section padding
32px → p-8, m-8
48px → p-12, m-12
64px → p-16, m-16
```

### Grid System

```tsx
// Dashboard grid — 12 column responsive
<div className="grid grid-cols-12 gap-4 md:gap-6">
  {/* Full width on mobile, half on md, third on lg */}
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    <NetWorthCard />
  </div>
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    <MonthlySummaryCard />
  </div>
  <div className="col-span-12 lg:col-span-4">
    <BudgetOverviewCard />
  </div>
  {/* Full width chart */}
  <div className="col-span-12">
    <CashFlowChart />
  </div>
</div>
```

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar (64px collapsed / 240px expanded on desktop)     │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Topbar: Page title | Search | Notifications | Avatar │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │                                                      │ │
│ │  Main content area (scrollable)                      │ │
│ │  Max width: 1280px, centered, px-4 md:px-6 lg:px-8  │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

Mobile (< 768px): Sidebar becomes bottom navigation bar
```

---

## 5. Core Components

### Card

```tsx
// src/shared/components/ui/card.tsx (extends Shadcn)
export function FinanceCard({ title, value, subtitle, trend, icon: Icon, className }: FinanceCardProps) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div className="rounded-lg bg-accent p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold font-mono">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-success' : 'text-danger'
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% vs last month
          </div>
        )}
      </div>
    </div>
  )
}
```

### Progress Bar (Budget)

```tsx
export function BudgetProgressBar({ spent, limit, alertAt = 80 }: BudgetProgressBarProps) {
  const percentage = Math.min((spent / limit) * 100, 100)
  const isAlert = percentage >= alertAt
  const isExceeded = percentage >= 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>₹{spent.toLocaleString('en-IN')} spent</span>
        <span>{percentage.toFixed(0)}% of ₹{limit.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isExceeded ? 'bg-danger' : isAlert ? 'bg-warning' : 'bg-success'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Budget: ${percentage.toFixed(0)}% used`}
        />
      </div>
      {isExceeded && (
        <p className="text-xs text-danger font-medium">
          ₹{(spent - limit).toLocaleString('en-IN')} over budget
        </p>
      )}
    </div>
  )
}
```

### Transaction Category Badge

```tsx
export function CategoryBadge({ name, icon, color }: CategoryBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span aria-hidden="true">{icon}</span>
      {name}
    </span>
  )
}
```

---

## 6. Animation Guidelines (Framer Motion)

### Animation Tokens

```typescript
// src/shared/constants/animations.ts
export const ANIMATIONS = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  // List item stagger
  listContainer: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
  listItem: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
  },
  // Card hover
  cardHover: {
    whileHover: { y: -2, transition: { duration: 0.15 } },
  },
  // Number counter (for dashboard KPIs)
  counter: {
    // Use Framer Motion's useMotionValue + animate for counting up
    duration: 1.2,
    ease: [0.25, 0.46, 0.45, 0.94],  // easeOutQuart
  },
}
```

### Animation Rules

1. **All animations ≤ 300ms.** Longer feels sluggish for data-heavy UIs.
2. **Respect `prefers-reduced-motion`.** Wrap all animations:

```tsx
const prefersReducedMotion = useReducedMotion()

<motion.div
  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
/>
```

3. **Animate layout changes** with `layout` prop to prevent jarring shifts.
4. **Never animate content that users need to read immediately.** Dashboard KPIs fade in; don't delay them.

---

## 7. Chart Patterns (Chart.js)

### Spending by Category (Doughnut)

```typescript
// src/features/analytics/components/SpendingByCategoryChart.tsx
const chartData = {
  labels: categories.map(c => c.name),
  datasets: [{
    data: categories.map(c => c.amount),
    backgroundColor: categories.map(c => c.color),
    borderWidth: 0,
    hoverOffset: 6,
  }],
}

const options: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,  // Use custom legend for better control
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ₹${ctx.parsed.toLocaleString('en-IN')} (${ctx.dataset.data[ctx.dataIndex] as number}%)`,
      },
    },
  },
}
```

### Cash Flow (Bar + Line combo)

```typescript
const chartData = {
  labels: months,
  datasets: [
    {
      type: 'bar' as const,
      label: 'Income',
      data: incomeData,
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
      borderRadius: 4,
    },
    {
      type: 'bar' as const,
      label: 'Expenses',
      data: expenseData,
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderRadius: 4,
    },
    {
      type: 'line' as const,
      label: 'Net Savings',
      data: savingsData,
      borderColor: '#3b82f6',
      borderWidth: 2,
      pointBackgroundColor: '#3b82f6',
      tension: 0.4,
      fill: false,
    },
  ],
}
```

### Chart Accessibility

- All charts must have `aria-label` describing what the chart shows
- Data tables as a fallback (visually hidden, available to screen readers)
- Color-blind safe palettes (never rely on red/green alone — use patterns)

---

## 8. Icon System

Use **Lucide React** exclusively. Never use multiple icon libraries in the same codebase.

```tsx
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Target, CreditCard, Bell } from 'lucide-react'

// Standard sizes
// Small inline: h-4 w-4
// Medium card icon: h-5 w-5
// Large feature icon: h-8 w-8

// Icon with accessible label
<Wallet className="h-5 w-5" aria-hidden="true" />
<span className="sr-only">Wallet</span>
```

---

## 9. Responsive Breakpoints

```
xs:  0–375px      (small phones — design here first)
sm:  376–640px    (large phones)
md:  641–768px    (tablets)
lg:  769–1024px   (laptops)
xl:  1025–1280px  (desktops)
2xl: 1281px+      (large monitors — cap content at 1280px max-w)
```

### Mobile-First Component Checklist

- [ ] Tested at 375px width
- [ ] Sidebar replaced by bottom nav on mobile
- [ ] Tables have horizontal scroll on mobile (not truncated)
- [ ] Forms are full-width on mobile
- [ ] Touch targets are ≥ 44×44px (WCAG 2.5.5)
- [ ] No hover-only interactions (touch devices have no hover)

---

## 10. Empty States

Every list view needs an empty state — not a blank screen.

```tsx
// src/shared/components/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// Usage
<EmptyState
  icon={<Receipt className="h-8 w-8" />}
  title="No transactions yet"
  description="Add your first transaction to start tracking your spending and income."
  action={
    <Link href="/transactions/new" className="btn-primary">
      Add Transaction
    </Link>
  }
/>
```
