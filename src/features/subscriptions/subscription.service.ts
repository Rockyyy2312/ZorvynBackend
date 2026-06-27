import { SubscriptionRepository } from './subscription.repository'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import { PLAN_LIMITS } from '@/shared/constants'
import { SubscriptionStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { Subscription, CreateSubscriptionDto } from './subscription.types'

export class SubscriptionService {
  constructor(private subscriptionRepo: SubscriptionRepository) {}

  async findAll(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id, userId)
    if (!sub) throw new NotFoundError('Subscription', id)
    return sub
  }

  async assertPlanLimit(userId: string, plan: string): Promise<void> {
    const list = await this.subscriptionRepo.findAll(userId)
    const active = list.filter((s) => s.status === SubscriptionStatus.ACTIVE).length
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.MAX_SUBSCRIPTIONS ?? 5

    if (active >= limit) {
      throw new BusinessRuleError(
        'PLAN_LIMIT_REACHED',
        `Your ${plan} plan allows a maximum of ${limit} active subscriptions. Upgrade to track more.`
      )
    }
  }

  async create(userId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    const sub = await this.subscriptionRepo.create(userId, dto)

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'subscription',
      resourceId: sub.id,
      newValue: { name: sub.name, amount: sub.amount.toString() },
    })

    return sub
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateSubscriptionDto>
  ): Promise<Subscription> {
    const original = await this.findById(id, userId)

    let cancelledAt = original.cancelledAt
    if (dto.status === SubscriptionStatus.CANCELLED && original.status !== SubscriptionStatus.CANCELLED) {
      cancelledAt = new Date()
    } else if (dto.status && dto.status !== SubscriptionStatus.CANCELLED) {
      cancelledAt = null
    }

    const updated = await this.subscriptionRepo.update(id, userId, {
      ...dto,
      cancelledAt,
    })

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'subscription',
      resourceId: id,
      oldValue: { status: original.status },
      newValue: { status: updated.status },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId)
    await this.subscriptionRepo.softDelete(id, userId)
    await auditLog({ userId, action: 'DELETE', resource: 'subscription', resourceId: id })
  }

  async getBillingForecast(userId: string) {
    const list = await this.subscriptionRepo.findAll(userId)
    const active = list.filter((s) => s.status === SubscriptionStatus.ACTIVE)

    let totalMonthlyCost = new Decimal(0)

    for (const sub of active) {
      const cycle = sub.billingCycle.toUpperCase()
      const amt = sub.amount

      if (cycle === 'WEEKLY') {
        // approx 4.33 weeks per month
        totalMonthlyCost = totalMonthlyCost.plus(amt.times(4.33))
      } else if (cycle === 'MONTHLY') {
        totalMonthlyCost = totalMonthlyCost.plus(amt)
      } else if (cycle === 'QUARTERLY') {
        totalMonthlyCost = totalMonthlyCost.plus(amt.div(3))
      } else if (cycle === 'YEARLY') {
        totalMonthlyCost = totalMonthlyCost.plus(amt.div(12))
      }
    }

    return {
      totalMonthlyCost,
      activeCount: active.length,
    }
  }
}

export const subscriptionService = new SubscriptionService(new SubscriptionRepository())
