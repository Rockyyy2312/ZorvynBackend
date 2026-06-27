import { z } from 'zod'
import { WalletType } from '@prisma/client'

export const CreateWalletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(WalletType),
  initialBalance: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Initial balance must be a valid decimal with up to 2 decimal places')
    .optional()
    .default('0.00'),
  currency: z.string().length(3).optional().default('INR'),
  isDefault: z.boolean().optional().default(false),
  color: z.string().optional(),
  icon: z.string().optional(),
})

export const UpdateWalletSchema = CreateWalletSchema.partial()

export const WalletTransferSchema = z.object({
  fromWalletId: z.string().uuid('Invalid source wallet ID'),
  toWalletId: z.string().uuid('Invalid destination wallet ID'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
})

