import { z } from 'zod'
import { SubscriptionStatus } from '@prisma/client'

export const CreateSubscriptionSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  nextBillingDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid next billing date'),
  status: z.nativeEnum(SubscriptionStatus).optional().default(SubscriptionStatus.ACTIVE),
  url: z.string().optional().nullable().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial()
