import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Subscription as PrismaSubscription, SubscriptionStatus } from '@prisma/client'
import type { Subscription, CreateSubscriptionDto } from './subscription.types'

export class SubscriptionRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaSubscription): Subscription {
    return {
      id: row.id,
      userId: row.userId,
      walletId: row.walletId,
      categoryId: row.categoryId,
      name: row.name,
      amount: row.amount,
      billingCycle: row.billingCycle,
      nextBillingDate: row.nextBillingDate,
      cancelledAt: row.cancelledAt,
      status: row.status as SubscriptionStatus,
      url: row.url,
      logoUrl: row.logoUrl,
      notes: row.notes,
      autoDetected: row.autoDetected,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<Subscription | null> {
    const row = await prisma.subscription.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(userId: string): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { userId, ...this.base },
      orderBy: { nextBillingDate: 'asc' },
    })
    return rows.map((r) => this.toDomain(r))
  }

  async create(userId: string, data: CreateSubscriptionDto): Promise<Subscription> {
    const row = await prisma.subscription.create({
      data: {
        userId,
        walletId: data.walletId || null,
        categoryId: data.categoryId || null,
        name: data.name,
        amount: new Decimal(data.amount),
        billingCycle: data.billingCycle,
        nextBillingDate: new Date(data.nextBillingDate),
        status: data.status || SubscriptionStatus.ACTIVE,
        url: data.url || null,
        logoUrl: data.logoUrl || null,
        notes: data.notes || null,
        autoDetected: false,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateSubscriptionDto> & { cancelledAt?: Date | null }
  ): Promise<Subscription> {
    const updateData: any = {}
    if (data.walletId !== undefined) updateData.walletId = data.walletId
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.name !== undefined) updateData.name = data.name
    if (data.amount !== undefined) updateData.amount = new Decimal(data.amount)
    if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle
    if (data.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(data.nextBillingDate)
    if (data.status !== undefined) updateData.status = data.status
    if (data.url !== undefined) updateData.url = data.url
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.cancelledAt !== undefined) updateData.cancelledAt = data.cancelledAt

    const row = await prisma.subscription.update({
      where: { id, userId },
      data: updateData,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.subscription.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }
}
