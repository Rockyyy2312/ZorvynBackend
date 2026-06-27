import { GoalRepository } from './goal.repository'
import { Decimal } from '@prisma/client/runtime/library'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import { PLAN_LIMITS } from '@/shared/constants'
import { notificationService } from '../notifications/notification.service'
import { GoalStatus, NotificationType } from '@prisma/client'
import type { SavingsGoal, CreateGoalDto } from './goal.types'

export class GoalService {
  constructor(private goalRepo: GoalRepository) {}

  async findAll(userId: string): Promise<SavingsGoal[]> {
    return this.goalRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<SavingsGoal> {
    const goal = await this.goalRepo.findById(id, userId)
    if (!goal) throw new NotFoundError('Savings Goal', id)
    return goal
  }

  async assertPlanLimit(userId: string, plan: string): Promise<void> {
    const count = await this.goalRepo.findAll(userId)
    const activeCount = count.filter((g) => g.status === GoalStatus.ACTIVE).length
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.MAX_GOALS ?? 3

    if (activeCount >= limit) {
      throw new BusinessRuleError(
        'PLAN_LIMIT_REACHED',
        `Your ${plan} plan allows a maximum of ${limit} active savings goals. Upgrade to add more.`
      )
    }
  }

  async create(userId: string, dto: CreateGoalDto): Promise<SavingsGoal> {
    const goal = await this.goalRepo.create(userId, dto)

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'goal',
      resourceId: goal.id,
      newValue: { name: goal.name, target: goal.targetAmount.toString() },
    })

    return goal
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateGoalDto> & { status?: GoalStatus }
  ): Promise<SavingsGoal> {
    const goal = await this.findById(id, userId)

    const updated = await this.goalRepo.update(id, userId, dto)

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'goal',
      resourceId: id,
      oldValue: { name: goal.name, status: goal.status },
      newValue: { name: updated.name, status: updated.status },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId)
    await this.goalRepo.softDelete(id, userId)
    await auditLog({ userId, action: 'DELETE', resource: 'goal', resourceId: id })
  }

  async contribute(
    id: string,
    userId: string,
    dto: { amount: string; note?: string | null }
  ): Promise<SavingsGoal> {
    const goal = await this.findById(id, userId)

    if (goal.status !== GoalStatus.ACTIVE) {
      throw new BusinessRuleError(
        'GOAL_NOT_ACTIVE',
        `Cannot contribute to a savings goal that is in ${goal.status} status.`
      )
    }

    const contribution = new Decimal(dto.amount)
    if (contribution.isNegative() || contribution.isZero()) {
      throw new BusinessRuleError('INVALID_AMOUNT', 'Contribution amount must be greater than 0.')
    }

    // Add contribution
    await this.goalRepo.addContribution(id, contribution, dto.note)

    // Fetch updated goal
    const updatedGoal = await this.findById(id, userId)

    // Check target completion
    if (updatedGoal.currentAmount.gte(updatedGoal.targetAmount)) {
      // Mark as completed
      await this.goalRepo.update(id, userId, { status: GoalStatus.COMPLETED })
      updatedGoal.status = GoalStatus.COMPLETED

      // Send milestone notification
      await notificationService.send(
        userId,
        NotificationType.GOAL_MILESTONE,
        'Goal Completed! 🎉',
        `Congratulations! You have reached your target of ₹${updatedGoal.targetAmount} for your savings goal "${updatedGoal.name}".`
      )
    }

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'goal_contribution',
      resourceId: id,
      newValue: { amount: contribution.toString() },
    })

    return updatedGoal
  }
}

export const goalService = new GoalService(new GoalRepository())
