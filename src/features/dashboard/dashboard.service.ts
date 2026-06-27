import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export class DashboardService {
  async getSummary(userId: string) {
    // 1. Calculate Net Worth (Sum of all wallet balances)
    const wallets = await prisma.wallet.findMany({
      where: { userId, deletedAt: null },
    })

    const netWorth = wallets.reduce((sum, w) => sum.plus(w.balance), new Decimal(0))

    // 2. Fetch Cash Flow (Income vs Expense for current month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const txs = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        transactionDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    let totalIncome = new Decimal(0)
    let totalExpense = new Decimal(0)

    for (const tx of txs) {
      if (tx.type === 'INCOME') {
        totalIncome = totalIncome.plus(tx.amount)
      } else if (tx.type === 'EXPENSE') {
        totalExpense = totalExpense.plus(tx.amount)
      }
    }

    const netSavings = totalIncome.minus(totalExpense)

    // 3. Budgets Progress
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        deletedAt: null,
      },
      include: {
        category: true,
      },
    })

    const budgetSummary = budgets.map((b) => {
      const percentage = b.limitAmount.isZero()
        ? 0
        : b.spentAmount.div(b.limitAmount).times(100).toNumber()
      return {
        id: b.id,
        limitAmount: b.limitAmount,
        spentAmount: b.spentAmount,
        percentage,
        category: b.category ? b.category.name : 'Uncategorized',
      }
    })

    // 4. Savings Goals Progress
    const goals = await prisma.savingsGoal.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
    })

    const goalSummary = goals.map((g) => {
      const percentage = g.targetAmount.isZero()
        ? 0
        : g.currentAmount.div(g.targetAmount).times(100).toNumber()
      return {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        percentage,
      }
    })

    // 5. Recent Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
      take: 5,
    })

    // 6. Calculate Financial Health Score (Simple algorithm out of 100)
    let healthScore = 70
    if (!totalIncome.isZero()) {
      const savingsRate = netSavings.div(totalIncome).toNumber()
      if (savingsRate >= 0.2) healthScore += 15
      else if (savingsRate > 0) healthScore += 5
      else healthScore -= 10
    }
    const exceededBudgets = budgetSummary.filter((b) => b.percentage > 100).length
    if (exceededBudgets === 0 && budgetSummary.length > 0) healthScore += 15
    else if (exceededBudgets > 0) healthScore -= exceededBudgets * 5

    healthScore = Math.max(10, Math.min(100, healthScore))

    return {
      netWorth,
      cashFlow: {
        income: totalIncome,
        expense: totalExpense,
        savings: netSavings,
      },
      budgets: budgetSummary,
      savingsGoals: goalSummary,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        merchant: tx.merchant,
        transactionDate: tx.transactionDate,
        category: tx.category ? tx.category.name : null,
      })),
      financialHealthScore: healthScore,
    }
  }
}

export const dashboardService = new DashboardService()
