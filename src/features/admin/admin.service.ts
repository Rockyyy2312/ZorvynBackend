import { prisma } from '@/lib/prisma'
import { UserPlan } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { NotFoundError } from '@/shared/errors'

export class AdminService {
  async getStats() {
    const [
      totalUsers,
      totalWallets,
      totalTransactions,
      activeSubscriptions,
      revAggregate,
      txAggregate,
      usersByPlan,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.wallet.count({ where: { deletedAt: null } }),
      prisma.transaction.count({ where: { deletedAt: null } }),
      prisma.premiumSubscription.count({ where: { status: 'COMPLETED' } }),
      prisma.premiumSubscription.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: { in: ['INCOME', 'EXPENSE'] }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.user.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
    ])

    const revenue = revAggregate._sum.amount || new Decimal(0)
    const transactionVolume = txAggregate._sum.amount || new Decimal(0)

    const planDistribution = usersByPlan.reduce(
      (acc, curr) => {
        acc[curr.plan] = curr._count._all
        return acc
      },
      {} as Record<UserPlan, number>
    )

    return {
      totalUsers,
      totalWallets,
      totalTransactions,
      activeSubscriptions,
      totalRevenue: revenue,
      totalTransactionVolume: transactionVolume,
      planDistribution,
    }
  }

  async listUsers(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          plan: true,
          planExpiresAt: true,
          isAdmin: true,
          createdAt: true,
          _count: {
            select: {
              wallets: true,
              transactions: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ])

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  async updateUserPlan(userId: string, plan: UserPlan, planExpiresAt?: Date | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User', userId)

    return prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planExpiresAt: planExpiresAt ?? null,
      },
    })
  }

  async toggleUserStatus(userId: string, isAdmin: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundError('User', userId)

    return prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
      },
    })
  }

  async listAuditLogs(page: number, limit: number) {
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count(),
    ])

    return {
      logs,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
}

export const adminService = new AdminService()
