import { EMIRepository } from './emi.repository'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import { EMIStatus } from '@prisma/client'
import type { EMI, CreateEMIDto } from './emi.types'

export class EMIService {
  constructor(private emiRepo: EMIRepository) {}

  async findAll(userId: string): Promise<EMI[]> {
    return this.emiRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<EMI> {
    const emi = await this.emiRepo.findById(id, userId)
    if (!emi) throw new NotFoundError('EMI Loan', id)
    return emi
  }

  async create(userId: string, dto: CreateEMIDto): Promise<EMI> {
    const emi = await this.emiRepo.create(userId, dto)

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'emi',
      resourceId: emi.id,
      newValue: { lender: emi.lenderName, emiAmount: emi.emiAmount.toString() },
    })

    return emi
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<CreateEMIDto> & { status?: EMIStatus; paidMonths?: number }
  ): Promise<EMI> {
    const original = await this.findById(id, userId)

    const updated = await this.emiRepo.update(id, userId, dto)

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'emi',
      resourceId: id,
      oldValue: { status: original.status, emiAmount: original.emiAmount.toString() },
      newValue: { status: updated.status, emiAmount: updated.emiAmount.toString() },
    })

    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId)
    await this.emiRepo.softDelete(id, userId)
    await auditLog({ userId, action: 'DELETE', resource: 'emi', resourceId: id })
  }

  async payInstallment(
    id: string,
    userId: string,
    dto: { walletId?: string | null; paidAt?: string }
  ): Promise<EMI> {
    const emi = await this.findById(id, userId)

    // Fallback to linked wallet if not specified in request DTO
    const walletId = dto.walletId || emi.walletId
    if (!walletId) {
      throw new BusinessRuleError(
        'LINKED_WALLET_REQUIRED',
        'Please specify or link a wallet to make EMI payments.'
      )
    }

    const paidAtDate = dto.paidAt ? new Date(dto.paidAt) : new Date()

    const updated = await this.emiRepo.recordRepayment(id, userId, walletId, paidAtDate)

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'emi_payment',
      resourceId: id,
      newValue: { paidAt: paidAtDate.toISOString(), walletId },
    })

    return updated
  }

  async getPayments(id: string, userId: string) {
    await this.findById(id, userId)
    return this.emiRepo.findPayments(id)
  }
}

export const emiService = new EMIService(new EMIRepository())
