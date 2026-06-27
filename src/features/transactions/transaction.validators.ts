import { z } from 'zod'

export const CreateTransactionSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .refine((val) => parseFloat(val) <= 10000000, 'Amount cannot exceed ₹1,00,00,000'),
  description: z.string().max(500).optional().nullable(),
  merchant: z.string().max(200).optional().nullable(),
  transactionDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
})

export const UpdateTransactionSchema = CreateTransactionSchema.partial()
