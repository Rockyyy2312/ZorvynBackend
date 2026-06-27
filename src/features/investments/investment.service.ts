import { InvestmentRepository } from './investment.repository'
import { Decimal } from '@prisma/client/runtime/library'
import { NotFoundError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import type { Investment, CreateInvestmentDto } from './investment.types'

export class InvestmentService {
  constructor(private investmentRepo: InvestmentRepository) {}

  async findAll(userId: string): Promise<Investment[]> {
    return this.investmentRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<Investment> {
    const investment = await this.investmentRepo.findById(id, userId)
    if (!investment) throw new NotFoundError('Investment', id)
    return investment
  }

  private calculateMetrics(purchaseStr: string, currentStr: string) {
    const purchase = new Decimal(purchaseStr)
    const current = new Decimal(currentStr)

    const returns = current.minus(purchase)
    const returnPercent = purchase.isZero() ? new Decimal(0) : returns.div(purchase).times(100)

    return { returns, returnPercent }
  }

  async create(userId: string, dto: CreateInvestmentDto): Promise<Investment> {
    const { returns, returnPercent } = this.calculateMetrics(
      dto.purchaseAmount,
      dto.currentValue
    )

    const investment = await this.investmentRepo.create(userId, {
      ...dto,
      returns,
      returnPercent,
    })

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'investment',
      resourceId: investment.id,
      newValue: { name: investment.name, currentValue: investment.currentValue.toString() },
    })

    return investment
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateInvestmentDto>
  ): Promise<Investment> {
    const original = await this.findById(id, userId)

    const purchaseAmount = dto.purchaseAmount || original.purchaseAmount.toString()
    const currentValue = dto.currentValue || original.currentValue.toString()

    const { returns, returnPercent } = this.calculateMetrics(purchaseAmount, currentValue)

    const updated = await this.investmentRepo.update(id, userId, {
      ...dto,
      returns,
      returnPercent,
    })

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'investment',
      resourceId: id,
      oldValue: { currentValue: original.currentValue.toString() },
      newValue: { currentValue: updated.currentValue.toString() },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId)
    await this.investmentRepo.softDelete(id, userId)
    await auditLog({ userId, action: 'DELETE', resource: 'investment', resourceId: id })
  }

  async getSummary(userId: string) {
    const items = await this.investmentRepo.findAll(userId)

    let totalInvested = new Decimal(0)
    let totalValue = new Decimal(0)

    const classAmounts: Record<string, Decimal> = {}

    for (const item of items) {
      totalInvested = totalInvested.plus(item.purchaseAmount)
      totalValue = totalValue.plus(item.currentValue)

      const cls = item.assetClass
      classAmounts[cls] = (classAmounts[cls] || new Decimal(0)).plus(item.currentValue)
    }

    const totalReturns = totalValue.minus(totalInvested)
    const returnPercent = totalInvested.isZero()
      ? new Decimal(0)
      : totalReturns.div(totalInvested).times(100)

    // Calculate allocations
    const allocations = Object.entries(classAmounts).map(([assetClass, amount]) => {
      const percentage = totalValue.isZero() ? 0 : amount.div(totalValue).times(100).toNumber()
      return {
        assetClass,
        value: amount,
        percentage,
      }
    })

    return {
      totalInvested,
      totalValue,
      totalReturns,
      returnPercent,
      allocations,
    }
  }
}

export const investmentService = new InvestmentService(new InvestmentRepository())
