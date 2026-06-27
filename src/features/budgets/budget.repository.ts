import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Budget as PrismaBudget, BudgetPeriod } from '@prisma/client'
import type { Budget, CreateBudgetDto } from './budget.types'

export class BudgetRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaBudget): Budget {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      name: row.name,
      limitAmount: row.limitAmount,
      spentAmount: row.spentAmount,
      period: row.period as BudgetPeriod,
      month: row.month,
      year: row.year,
      rollover: row.rollover,
      rolloverAmount: row.rolloverAmount,
      alertAt: row.alertAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    const row = await prisma.budget.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(userId: string, month?: number, year?: number): Promise<Budget[]> {
    const where: any = { userId, ...this.base }
    if (month !== undefined) where.month = month
    if (year !== undefined) where.year = year

    const rows = await prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toDomain(r))
  }

  async findByCategoryMonthYear(
    userId: string,
    categoryId: string | null,
    month: number,
    year: number
  ): Promise<Budget | null> {
    const row = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        month,
        year,
        ...this.base,
      },
    })
    return row ? this.toDomain(row) : null
  }

  async create(userId: string, data: CreateBudgetDto): Promise<Budget> {
    const now = new Date()
    const month = data.month ?? now.getMonth() + 1
    const year = data.year ?? now.getFullYear()

    const row = await prisma.budget.create({
      data: {
        userId,
        categoryId: data.categoryId || null,
        name: data.name || null,
        limitAmount: new Decimal(data.limitAmount),
        spentAmount: new Decimal(0),
        period: data.period || BudgetPeriod.MONTHLY,
        month,
        year,
        alertAt: data.alertAt ?? 80,
        rollover: data.rollover ?? false,
        rolloverAmount: new Decimal(0),
        version: 0,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateBudgetDto>
  ): Promise<Budget> {
    const updateData: any = {}
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.name !== undefined) updateData.name = data.name
    if (data.limitAmount !== undefined) updateData.limitAmount = new Decimal(data.limitAmount)
    if (data.period !== undefined) updateData.period = data.period
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.alertAt !== undefined) updateData.alertAt = data.alertAt
    if (data.rollover !== undefined) updateData.rollover = data.rollover

    const row = await prisma.budget.update({
      where: { id, userId },
      data: updateData,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.budget.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async incrementSpent(
    userId: string,
    categoryId: string | null,
    month: number,
    year: number,
    amount: Decimal
  ) {
    return prisma.budget.updateMany({
      where: {
        userId,
        categoryId,
        month,
        year,
        deletedAt: null,
      },
      data: {
        spentAmount: { increment: amount },
      },
    })
  }
}
