import { z } from 'zod'

export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Target amount must be a valid decimal with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Target amount must be greater than 0'),
  targetDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .optional()
    .nullable(),
  walletId: z.string().uuid('Invalid wallet ID').optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
})

export const UpdateGoalSchema = CreateGoalSchema.partial()

export const ContributeGoalSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Contribution amount must be a valid decimal with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Contribution amount must be greater than 0'),
  note: z.string().max(200).optional().nullable(),
})
