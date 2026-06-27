import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { SavingsGoal as PrismaGoal, GoalStatus } from '@prisma/client'
import type { SavingsGoal, CreateGoalDto } from './goal.types'

export class GoalRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaGoal): SavingsGoal {
    return {
      id: row.id,
      userId: row.userId,
      walletId: row.walletId,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      targetDate: row.targetDate,
      status: row.status as GoalStatus,
      icon: row.icon,
      color: row.color,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<SavingsGoal | null> {
    const row = await prisma.savingsGoal.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(userId: string): Promise<SavingsGoal[]> {
    const rows = await prisma.savingsGoal.findMany({
      where: { userId, ...this.base },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toDomain(r))
  }

  async create(userId: string, data: CreateGoalDto): Promise<SavingsGoal> {
    const row = await prisma.savingsGoal.create({
      data: {
        userId,
        name: data.name,
        targetAmount: new Decimal(data.targetAmount),
        currentAmount: new Decimal(0),
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        walletId: data.walletId || null,
        icon: data.icon || null,
        color: data.color || null,
        description: data.description || null,
        status: GoalStatus.ACTIVE,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateGoalDto> & { status?: GoalStatus }
  ): Promise<SavingsGoal> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.targetAmount !== undefined) updateData.targetAmount = new Decimal(data.targetAmount)
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
    if (data.walletId !== undefined) updateData.walletId = data.walletId
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status

    const row = await prisma.savingsGoal.update({
      where: { id, userId },
      data: updateData,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.savingsGoal.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async addContribution(
    goalId: string,
    amount: Decimal,
    note?: string | null
  ): Promise<void> {
    await prisma.$transaction([
      prisma.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: { increment: amount },
        },
      }),
      prisma.goalContribution.create({
        data: {
          goalId,
          amount,
          note: note || null,
        },
      }),
    ])
  }
}
