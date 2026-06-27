import { GoalStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface SavingsGoal {
  id: string
  userId: string
  walletId: string | null
  name: string
  targetAmount: Decimal
  currentAmount: Decimal
  targetDate: Date | null
  status: GoalStatus
  icon: string | null
  color: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateGoalDto {
  name: string
  targetAmount: string
  targetDate?: string | null
  walletId?: string | null
  icon?: string | null
  color?: string | null
  description?: string | null
}
