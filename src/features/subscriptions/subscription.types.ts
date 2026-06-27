import { SubscriptionStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface Subscription {
  id: string
  userId: string
  walletId: string | null
  categoryId: string | null
  name: string
  amount: Decimal
  billingCycle: string // MONTHLY, YEARLY, QUARTERLY, WEEKLY
  nextBillingDate: Date
  cancelledAt: Date | null
  status: SubscriptionStatus
  url: string | null
  logoUrl: string | null
  notes: string | null
  autoDetected: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubscriptionDto {
  walletId?: string | null
  categoryId?: string | null
  name: string
  amount: string
  billingCycle: string
  nextBillingDate: string
  status?: SubscriptionStatus
  url?: string | null
  logoUrl?: string | null
  notes?: string | null
}
