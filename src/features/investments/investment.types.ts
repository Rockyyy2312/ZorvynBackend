import { AssetClass } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface Investment {
  id: string
  userId: string
  name: string
  assetClass: AssetClass
  purchaseAmount: Decimal
  currentValue: Decimal
  purchaseDate: Date
  quantity: Decimal | null
  purchasePrice: Decimal | null
  currentPrice: Decimal | null
  platform: string | null
  ticker: string | null
  isin: string | null
  returns: Decimal | null
  returnPercent: Decimal | null
  lastUpdated: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateInvestmentDto {
  name: string
  assetClass: AssetClass
  purchaseAmount: string
  currentValue: string
  purchaseDate: string
  quantity?: string | null
  purchasePrice?: string | null
  currentPrice?: string | null
  platform?: string | null
  ticker?: string | null
  isin?: string | null
  notes?: string | null
}
