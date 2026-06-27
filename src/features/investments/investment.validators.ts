import { z } from 'zod'
import { AssetClass } from '@prisma/client'

export const CreateInvestmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  assetClass: z.nativeEnum(AssetClass),
  purchaseAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Purchase amount must be a valid decimal')
    .refine((val) => parseFloat(val) >= 0, 'Purchase amount cannot be negative'),
  currentValue: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Current value must be a valid decimal')
    .refine((val) => parseFloat(val) >= 0, 'Current value cannot be negative'),
  purchaseDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid purchase date'),
  quantity: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/, 'Quantity must be a valid decimal')
    .optional()
    .nullable(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Purchase price must be a valid decimal')
    .optional()
    .nullable(),
  currentPrice: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Current price must be a valid decimal')
    .optional()
    .nullable(),
  platform: z.string().max(100).optional().nullable(),
  ticker: z.string().max(20).optional().nullable(),
  isin: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const UpdateInvestmentSchema = CreateInvestmentSchema.partial()
