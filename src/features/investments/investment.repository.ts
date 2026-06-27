import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Investment as PrismaInvestment, AssetClass } from '@prisma/client'
import type { Investment, CreateInvestmentDto } from './investment.types'

export class InvestmentRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaInvestment): Investment {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      assetClass: row.assetClass as AssetClass,
      purchaseAmount: row.purchaseAmount,
      currentValue: row.currentValue,
      purchaseDate: row.purchaseDate,
      quantity: row.quantity,
      purchasePrice: row.purchasePrice,
      currentPrice: row.currentPrice,
      platform: row.platform,
      ticker: row.ticker,
      isin: row.isin,
      returns: row.returns,
      returnPercent: row.returnPercent,
      lastUpdated: row.lastUpdated,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<Investment | null> {
    const row = await prisma.investment.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(userId: string): Promise<Investment[]> {
    const rows = await prisma.investment.findMany({
      where: { userId, ...this.base },
      orderBy: { purchaseDate: 'desc' },
    })
    return rows.map((r) => this.toDomain(r))
  }

  async create(
    userId: string,
    data: CreateInvestmentDto & { returns: Decimal; returnPercent: Decimal }
  ): Promise<Investment> {
    const row = await prisma.investment.create({
      data: {
        userId,
        name: data.name,
        assetClass: data.assetClass,
        purchaseAmount: new Decimal(data.purchaseAmount),
        currentValue: new Decimal(data.currentValue),
        purchaseDate: new Date(data.purchaseDate),
        quantity: data.quantity ? new Decimal(data.quantity) : null,
        purchasePrice: data.purchasePrice ? new Decimal(data.purchasePrice) : null,
        currentPrice: data.currentPrice ? new Decimal(data.currentPrice) : null,
        platform: data.platform || null,
        ticker: data.ticker || null,
        isin: data.isin || null,
        notes: data.notes || null,
        returns: data.returns,
        returnPercent: data.returnPercent,
        lastUpdated: new Date(),
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateInvestmentDto> & { returns?: Decimal; returnPercent?: Decimal }
  ): Promise<Investment> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.assetClass !== undefined) updateData.assetClass = data.assetClass
    if (data.purchaseAmount !== undefined) updateData.purchaseAmount = new Decimal(data.purchaseAmount)
    if (data.currentValue !== undefined) updateData.currentValue = new Decimal(data.currentValue)
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate)
    if (data.quantity !== undefined) updateData.quantity = data.quantity ? new Decimal(data.quantity) : null
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice ? new Decimal(data.purchasePrice) : null
    if (data.currentPrice !== undefined) updateData.currentPrice = data.currentPrice ? new Decimal(data.currentPrice) : null
    if (data.platform !== undefined) updateData.platform = data.platform
    if (data.ticker !== undefined) updateData.ticker = data.ticker
    if (data.isin !== undefined) updateData.isin = data.isin
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.returns !== undefined) updateData.returns = data.returns
    if (data.returnPercent !== undefined) updateData.returnPercent = data.returnPercent

    updateData.lastUpdated = new Date()

    const row = await prisma.investment.update({
      where: { id, userId },
      data: updateData,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.investment.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }
}
