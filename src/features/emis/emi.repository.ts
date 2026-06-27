import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { EMI as PrismaEMI, EMIStatus, EMIPayment } from '@prisma/client'
import type { EMI, CreateEMIDto } from './emi.types'
import { BusinessRuleError, NotFoundError } from '@/shared/errors'

export class EMIRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaEMI): EMI {
    return {
      id: row.id,
      userId: row.userId,
      walletId: row.walletId,
      lenderName: row.lenderName,
      loanType: row.loanType,
      totalAmount: row.totalAmount,
      emiAmount: row.emiAmount,
      totalMonths: row.totalMonths,
      paidMonths: row.paidMonths,
      interestRate: row.interestRate,
      startDate: row.startDate,
      endDate: row.endDate,
      nextDueDate: row.nextDueDate,
      status: row.status as EMIStatus,
      accountNumber: row.accountNumber,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<EMI | null> {
    const row = await prisma.eMI.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(userId: string): Promise<EMI[]> {
    const rows = await prisma.eMI.findMany({
      where: { userId, ...this.base },
      orderBy: { nextDueDate: 'asc' },
    })
    return rows.map((r) => this.toDomain(r))
  }

  async create(userId: string, data: CreateEMIDto): Promise<EMI> {
    const row = await prisma.eMI.create({
      data: {
        userId,
        walletId: data.walletId || null,
        lenderName: data.lenderName,
        loanType: data.loanType || null,
        totalAmount: new Decimal(data.totalAmount),
        emiAmount: new Decimal(data.emiAmount),
        totalMonths: data.totalMonths,
        interestRate: new Decimal(data.interestRate),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        nextDueDate: new Date(data.nextDueDate),
        accountNumber: data.accountNumber || null,
        notes: data.notes || null,
        status: EMIStatus.ACTIVE,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: Partial<CreateEMIDto> & { status?: EMIStatus; paidMonths?: number }
  ): Promise<EMI> {
    const updateData: any = {}
    if (data.walletId !== undefined) updateData.walletId = data.walletId
    if (data.lenderName !== undefined) updateData.lenderName = data.lenderName
    if (data.loanType !== undefined) updateData.loanType = data.loanType
    if (data.totalAmount !== undefined) updateData.totalAmount = new Decimal(data.totalAmount)
    if (data.emiAmount !== undefined) updateData.emiAmount = new Decimal(data.emiAmount)
    if (data.totalMonths !== undefined) updateData.totalMonths = data.totalMonths
    if (data.paidMonths !== undefined) updateData.paidMonths = data.paidMonths
    if (data.interestRate !== undefined) updateData.interestRate = new Decimal(data.interestRate)
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
    if (data.nextDueDate !== undefined) updateData.nextDueDate = new Date(data.nextDueDate)
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status !== undefined) updateData.status = data.status

    const row = await prisma.eMI.update({
      where: { id, userId },
      data: updateData,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.eMI.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async findPayments(emiId: string): Promise<EMIPayment[]> {
    return prisma.eMIPayment.findMany({
      where: { emiId },
      orderBy: { paidAt: 'desc' },
    })
  }

  async recordRepayment(
    id: string,
    userId: string,
    walletId: string,
    paidAtDate: Date
  ): Promise<EMI> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch loan detail
      const emi = await tx.eMI.findFirst({
        where: { id, userId, deletedAt: null },
      })
      if (!emi) throw new NotFoundError('EMI Loan', id)
      if (emi.status !== EMIStatus.ACTIVE) {
        throw new BusinessRuleError('EMI_INACTIVE', 'This loan is no longer active.')
      }

      // 2. Fetch wallet and check balance
      const wallet = await tx.wallet.findFirst({
        where: { id: walletId, userId, deletedAt: null },
      })
      if (!wallet) throw new NotFoundError('Wallet', walletId)
      if (wallet.balance.lessThan(emi.emiAmount) && wallet.type !== 'CREDIT_CARD') {
        throw new BusinessRuleError('INSUFFICIENT_FUNDS', 'Linked wallet has insufficient funds.')
      }

      // 3. Deduct wallet balance
      const walletUpdated = await tx.wallet.updateMany({
        where: { id: walletId, version: wallet.version, deletedAt: null },
        data: {
          balance: { decrement: emi.emiAmount },
          version: { increment: 1 },
        },
      })
      if (walletUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // 4. Create EXPENSE transaction representation
      await tx.transaction.create({
        data: {
          userId,
          walletId,
          type: 'EXPENSE',
          amount: emi.emiAmount,
          description: `EMI repayment installment to ${emi.lenderName}`,
          merchant: emi.lenderName,
          transactionDate: paidAtDate,
          status: 'COMPLETED',
          version: 0,
        },
      })

      // 5. Create EMI Payment record
      await tx.eMIPayment.create({
        data: {
          emiId: id,
          amount: emi.emiAmount,
          paidAt: paidAtDate,
        },
      })

      // 6. Update EMI counts & shift nextDueDate
      const newPaidMonths = emi.paidMonths + 1
      const isCompleted = newPaidMonths >= emi.totalMonths
      const newStatus = isCompleted ? EMIStatus.COMPLETED : EMIStatus.ACTIVE

      // Calculate next due date (add 1 month)
      const nextDue = new Date(emi.nextDueDate)
      nextDue.setMonth(nextDue.getMonth() + 1)

      const updated = await tx.eMI.update({
        where: { id },
        data: {
          paidMonths: newPaidMonths,
          status: newStatus,
          nextDueDate: nextDue,
        },
      })

      return this.toDomain(updated)
    })
  }
}
