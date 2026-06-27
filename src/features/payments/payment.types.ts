import { PaymentStatus, UserPlan } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface PremiumSubscription {
  id: string
  userId: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  razorpaySubscriptionId: string | null
  amount: Decimal
  status: PaymentStatus
  plan: UserPlan
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateOrderDto {
  plan: UserPlan
}
