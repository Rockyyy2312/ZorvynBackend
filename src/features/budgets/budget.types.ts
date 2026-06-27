import { BudgetPeriod } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface Budget {
  id: string
  userId: string
  categoryId: string | null
  name: string | null
  limitAmount: Decimal
  spentAmount: Decimal
  period: BudgetPeriod
  month: number | null
  year: number | null
  rollover: boolean
  rolloverAmount: Decimal
  alertAt: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateBudgetDto {
  categoryId?: string | null
  name?: string | null
  limitAmount: string
  period?: BudgetPeriod
  month?: number
  year?: number
  alertAt?: number
  rollover?: boolean
}
