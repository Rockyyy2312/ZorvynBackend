import { TransactionType, TransactionStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface Transaction {
  id: string
  userId: string
  walletId: string
  categoryId: string | null
  type: TransactionType
  amount: Decimal
  description: string | null
  merchant: string | null
  transactionDate: Date
  status: TransactionStatus
  isRecurring: boolean
  receiptUrl: string | null
  notes: string | null
  tags: string[]
  aiCategorized: boolean
  aiConfidence: Decimal | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateTransactionDto {
  walletId: string
  categoryId?: string | null
  type: TransactionType
  amount: string
  description?: string | null
  merchant?: string | null
  transactionDate: string
  tags?: string[]
}

export interface TransactionFilters {
  page?: number
  limit?: number
  type?: TransactionType
  categoryId?: string
  walletId?: string
  startDate?: string
  endDate?: string
  minAmount?: string
  maxAmount?: string
  search?: string
  tags?: string
}
