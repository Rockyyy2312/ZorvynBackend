import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { TransactionType } from '@prisma/client'
import { BusinessRuleError } from '@/shared/errors'

export class ReportsService {
  async getCashFlowTrend(userId: string, start: Date, end: Date) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { transactionDate: 'asc' },
    })

    // Group by date (YYYY-MM-DD)
    const grouped: Record<string, { income: Decimal; expense: Decimal }> = {}

    for (const tx of transactions) {
      const day = tx.transactionDate.toISOString().split('T')[0]
      if (!day) continue

      if (!grouped[day]) {
        grouped[day] = { income: new Decimal(0), expense: new Decimal(0) }
      }

      const entry = grouped[day]
      if (!entry) continue

      if (tx.type === 'INCOME') {
        entry.income = entry.income.plus(tx.amount)
      } else if (tx.type === 'EXPENSE') {
        entry.expense = entry.expense.plus(tx.amount)
      }
    }

    return Object.entries(grouped).map(([date, metrics]) => ({
      date,
      income: metrics.income,
      expense: metrics.expense,
      savings: metrics.income.minus(metrics.expense),
    }))
  }

  async getCategoryDistribution(userId: string, start: Date, end: Date, type: TransactionType) {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystem: true }],
        deletedAt: null,
      },
    })

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type,
        deletedAt: null,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const distribution: Record<string, { categoryName: string; color: string; amount: Decimal }> = {}

    // Initialize map
    for (const tx of transactions) {
      const catId = tx.categoryId || 'uncategorized'
      const cat = categories.find((c) => c.id === catId)
      const catName = cat ? cat.name : 'Uncategorized'
      const color = cat?.color || '#868E96'

      if (!distribution[catId]) {
        distribution[catId] = { categoryName: catName, color, amount: new Decimal(0) }
      }
      const entry = distribution[catId]
      if (entry) {
        entry.amount = entry.amount.plus(tx.amount)
      }
    }

    return Object.values(distribution).sort((a, b) => b.amount.minus(a.amount).toNumber())
  }

  async generateCSV(userId: string, source: 'transactions' | 'investments' | 'budgets'): Promise<string> {
    let headers: string[] = []
    let rows: string[][] = []

    if (source === 'transactions') {
      headers = ['ID', 'Date', 'Type', 'Amount', 'Description', 'Merchant', 'Tags']
      const data = await prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { transactionDate: 'desc' },
      })
      rows = data.map((t) => [
        t.id,
        t.transactionDate.toISOString(),
        t.type,
        t.amount.toString(),
        t.description || '',
        t.merchant || '',
        t.tags.join(';'),
      ])
    } else if (source === 'investments') {
      headers = ['ID', 'Asset Class', 'Name', 'Purchase Date', 'Purchase Amount', 'Current Value', 'Ticker', 'Returns']
      const data = await prisma.investment.findMany({
        where: { userId, deletedAt: null },
        orderBy: { purchaseDate: 'desc' },
      })
      rows = data.map((i) => [
        i.id,
        i.assetClass,
        i.name,
        i.purchaseDate.toISOString(),
        i.purchaseAmount.toString(),
        i.currentValue.toString(),
        i.ticker || '',
        i.returns?.toString() || '0.00',
      ])
    } else if (source === 'budgets') {
      headers = ['ID', 'Month', 'Year', 'Limit Amount', 'Spent Amount', 'Period', 'Rollover']
      const data = await prisma.budget.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
      rows = data.map((b) => [
        b.id,
        String(b.month),
        String(b.year),
        b.limitAmount.toString(),
        b.spentAmount.toString(),
        b.period,
        String(b.rollover),
      ])
    } else {
      throw new BusinessRuleError('INVALID_EXPORT_SOURCE', 'Unsupported data export source.')
    }

    // Escape CSV cell format
    const escapeCell = (cell: string) => {
      const escaped = cell.replace(/"/g, '""')
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped
    }

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\n')

    return csvContent
  }
}

export const reportsService = new ReportsService()
