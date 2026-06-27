import { z } from 'zod'

export const CreateEMISchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID').optional().nullable(),
  lenderName: z.string().min(1, 'Lender name is required').max(100),
  loanType: z.string().max(50).optional().nullable(),
  totalAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Total amount must be a valid decimal')
    .refine((val) => parseFloat(val) > 0, 'Total amount must be greater than 0'),
  emiAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'EMI amount must be a valid decimal')
    .refine((val) => parseFloat(val) > 0, 'EMI amount must be greater than 0'),
  totalMonths: z.number().int().min(1, 'Months must be at least 1'),
  interestRate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Interest rate must be a valid decimal')
    .refine((val) => parseFloat(val) >= 0, 'Interest rate cannot be negative'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  nextDueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid next due date'),
  accountNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const UpdateEMISchema = CreateEMISchema.partial()

export const PayEMISchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID').optional().nullable(),
  paidAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid payment date')
    .optional(),
})
