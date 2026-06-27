import { EMIStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface EMI {
  id: string
  userId: string
  walletId: string | null
  lenderName: string
  loanType: string | null
  totalAmount: Decimal
  emiAmount: Decimal
  totalMonths: number
  paidMonths: number
  interestRate: Decimal
  startDate: Date
  endDate: Date
  nextDueDate: Date
  status: EMIStatus
  accountNumber: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateEMIDto {
  walletId?: string | null
  lenderName: string
  loanType?: string | null
  totalAmount: string
  emiAmount: string
  totalMonths: number
  interestRate: string
  startDate: string
  endDate: string
  nextDueDate: string
  accountNumber?: string | null
  notes?: string | null
}
export interface PayEMIDto {
  walletId?: string | null
  paidAt?: string
}
