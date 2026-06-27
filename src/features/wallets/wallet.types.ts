import { WalletType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface Wallet {
  id: string
  userId: string
  name: string
  type: WalletType
  balance: Decimal
  currency: string
  isDefault: boolean
  color?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateWalletData {
  userId: string
  name: string
  type: WalletType
  balance: string | Decimal
  currency?: string
  isDefault?: boolean
  color?: string
  icon?: string
}

export interface CreateWalletDto {
  name: string
  type: WalletType
  initialBalance?: string
  currency?: string
  isDefault?: boolean
  color?: string
  icon?: string
}
