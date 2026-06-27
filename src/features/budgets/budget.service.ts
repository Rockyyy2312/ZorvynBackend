import { BudgetRepository } from './budget.repository'
import { Decimal } from '@prisma/client/runtime/library'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import type { Budget, CreateBudgetDto } from './budget.types'

export class BudgetService {
  constructor(private budgetRepo: BudgetRepository) {}

  async findAll(userId: string, month?: number, year?: number): Promise<Budget[]> {
    return this.budgetRepo.findAll(userId, month, year)
  }

  async findById(id: string, userId: string): Promise<Budget> {
    const budget = await this.budgetRepo.findById(id, userId)
    if (!budget) throw new NotFoundError('Budget', id)
    return budget
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const now = new Date()
    const month = dto.month ?? now.getMonth() + 1
    const year = dto.year ?? now.getFullYear()

    // 1. Check for duplicates
    const existing = await this.budgetRepo.findByCategoryMonthYear(
      userId,
      dto.categoryId || null,
      month,
      year
    )
    if (existing) {
      throw new ConflictError(
        'BUDGET_ALREADY_EXISTS',
        'A budget for this category and period already exists.'
      )
    }

    // 2. Fetch already spent amount in this category & month
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    const aggregate = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId,
        categoryId: dto.categoryId || null,
        type: 'EXPENSE',
        deletedAt: null,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const initialSpent = aggregate._sum.amount || new Decimal(0)

    // 3. Create budget
    const budget = await this.budgetRepo.create(userId, {
      ...dto,
      month,
      year,
    })

    // Update the initial spent value if there was already transactions
    if (!initialSpent.isZero()) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { spentAmount: initialSpent },
      })
      budget.spentAmount = initialSpent
    }

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'budget',
      resourceId: budget.id,
      newValue: { limit: budget.limitAmount.toString(), month, year },
    })

    return budget
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateBudgetDto>
  ): Promise<Budget> {
    const budget = await this.findById(id, userId)

    const updated = await this.budgetRepo.update(id, userId, dto)

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'budget',
      resourceId: id,
      oldValue: { limit: budget.limitAmount.toString() },
      newValue: { limit: updated.limitAmount.toString() },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId)
    await this.budgetRepo.softDelete(id, userId)
    await auditLog({ userId, action: 'DELETE', resource: 'budget', resourceId: id })
  }

  async updateSpend(
    userId: string,
    categoryId: string | null,
    date: Date,
    amount: Decimal
  ) {
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    // Increment spent
    await this.budgetRepo.incrementSpent(userId, categoryId, month, year, amount)

    // Check if limit is breached
    const budget = await this.budgetRepo.findByCategoryMonthYear(userId, categoryId, month, year)
    if (budget && !budget.limitAmount.isZero()) {
      const percentage = budget.spentAmount.div(budget.limitAmount).times(100).toNumber()
      return {
        alertThresholdBreached: percentage >= budget.alertAt,
        budget,
      }
    }

    return { alertThresholdBreached: false, budget: null }
  }

  async getSummary(userId: string, month: number, year: number) {
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month,
        year,
        deletedAt: null,
      },
      include: {
        category: true,
      },
      orderBy: {
        limitAmount: 'desc',
      },
    })

    return budgets.map((b) => {
      const percentage = b.limitAmount.isZero()
        ? 0
        : b.spentAmount.div(b.limitAmount).times(100).toNumber()

      return {
        id: b.id,
        limitAmount: b.limitAmount,
        spentAmount: b.spentAmount,
        percentage,
        alertAt: b.alertAt,
        category: b.category
          ? {
              id: b.category.id,
              name: b.category.name,
              icon: b.category.icon,
              color: b.category.color,
            }
          : null,
      }
    })
  }
}

export const budgetService = new BudgetService(new BudgetRepository())
