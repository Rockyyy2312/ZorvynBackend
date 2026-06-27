import { z } from 'zod'
import { BudgetPeriod } from '@prisma/client'

export const CreateBudgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().max(100).optional().nullable(),
  limitAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Limit amount must be a valid decimal with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Limit amount must be greater than 0'),
  period: z.nativeEnum(BudgetPeriod).optional().default(BudgetPeriod.MONTHLY),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  alertAt: z.number().int().min(1).max(100).optional().default(80),
  rollover: z.boolean().optional().default(false),
})

export const UpdateBudgetSchema = CreateBudgetSchema.partial()
