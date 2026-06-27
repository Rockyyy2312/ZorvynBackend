import { TransactionRepository } from './transaction.repository'
import { WalletRepository } from '../wallets/wallet.repository'
import { BudgetService, budgetService } from '../budgets/budget.service'
import { notificationService } from '../notifications/notification.service'
import { aiService } from '../ai/ai.service'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'
import { NotificationType, TransactionType } from '@prisma/client'
import type { Transaction, CreateTransactionDto, TransactionFilters } from './transaction.types'

export class TransactionService {
  constructor(
    private transactionRepo: TransactionRepository,
    _walletRepo: WalletRepository,
    _budgetService: BudgetService
  ) {}

  async findAll(
    userId: string,
    filters: TransactionFilters
  ): Promise<{ data: Transaction[]; total: number }> {
    return this.transactionRepo.findAll(userId, filters)
  }

  async findById(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(id, userId)
    if (!transaction) throw new NotFoundError('Transaction', id)
    return transaction
  }

  async createTransaction(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const amount = new Decimal(dto.amount)
    if (amount.isNegative() || amount.isZero()) {
      throw new BusinessRuleError('INVALID_AMOUNT', 'Transaction amount must be greater than 0.')
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch wallet and verify ownership
      const wallet = await tx.wallet.findFirst({
        where: { id: dto.walletId, userId, deletedAt: null },
      })
      if (!wallet) throw new NotFoundError('Wallet', dto.walletId)

      // 2. Adjust wallet balance
      let delta = amount
      if (dto.type === 'EXPENSE') {
        delta = amount.negated()
      } else if (dto.type === 'TRANSFER') {
        throw new BusinessRuleError('INVALID_OPERATION', 'Use dedicated /transfer route for wallet transfers.')
      }

      // Check balance check for credit/debit limitations if needed (avoiding negative cash/bank balances if required)
      if (dto.type === 'EXPENSE' && wallet.balance.plus(delta).isNegative() && wallet.type !== 'CREDIT_CARD') {
        throw new BusinessRuleError('INSUFFICIENT_BALANCE', 'Wallet has insufficient balance.')
      }

      const walletUpdated = await tx.wallet.updateMany({
        where: { id: dto.walletId, version: wallet.version, deletedAt: null },
        data: {
          balance: { increment: delta },
          version: { increment: 1 },
        },
      })
      if (walletUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // 3. Resolve categoryId (auto-suggest if missing)
      let categoryId = dto.categoryId || null
      let aiCategorized = false
      if (!categoryId) {
        const name = await aiService.categorizeTransaction(
          dto.description || '',
          dto.merchant || '',
          dto.type
        )
        const cat = await tx.category.findFirst({
          where: {
            name,
            OR: [{ userId }, { isSystem: true }],
            deletedAt: null,
          },
        })
        if (cat) {
          categoryId = cat.id
          aiCategorized = true
        }
      }

      // 4. Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId: dto.walletId,
          categoryId,
          type: dto.type,
          amount,
          description: dto.description || null,
          merchant: dto.merchant || null,
          transactionDate: new Date(dto.transactionDate),
          status: 'COMPLETED',
          tags: dto.tags || [],
          aiCategorized,
          version: 0,
        },
      })

      // 4. Update budget asynchronously / within txn
      if (dto.type === 'EXPENSE') {
        const month = transaction.transactionDate.getMonth() + 1
        const year = transaction.transactionDate.getFullYear()

        await tx.budget.updateMany({
          where: {
            userId,
            categoryId: dto.categoryId || null,
            month,
            year,
            deletedAt: null,
          },
          data: {
            spentAmount: { increment: amount },
          },
        })

        // Check alerts
        const budget = await tx.budget.findFirst({
          where: {
            userId,
            categoryId: dto.categoryId || null,
            month,
            year,
            deletedAt: null,
          },
        })

        if (budget && !budget.limitAmount.isZero()) {
          const percentage = budget.spentAmount.div(budget.limitAmount).times(100).toNumber()
          if (percentage >= budget.alertAt) {
            // Trigger in-app notification
            await notificationService.send(
              userId,
              NotificationType.BUDGET_ALERT,
              'Budget Alert',
              `Your budget for this category has reached ${percentage.toFixed(0)}% of its limit.`
            )
          }
        }
      }

      await auditLog({
        userId,
        action: 'CREATE',
        resource: 'transaction',
        resourceId: transaction.id,
        newValue: { description: transaction.description, amount: amount.toString() },
      })

      // Return mapped domain type
      return {
        id: transaction.id,
        userId: transaction.userId,
        walletId: transaction.walletId,
        categoryId: transaction.categoryId,
        type: transaction.type as TransactionType,
        amount: transaction.amount,
        description: transaction.description,
        merchant: transaction.merchant,
        transactionDate: transaction.transactionDate,
        status: transaction.status,
        isRecurring: transaction.isRecurring,
        receiptUrl: transaction.receiptUrl,
        notes: transaction.notes,
        tags: transaction.tags,
        aiCategorized: transaction.aiCategorized,
        aiConfidence: transaction.aiConfidence,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }
    })
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    const tx = await this.transactionRepo.findById(id, userId)
    if (!tx) throw new NotFoundError('Transaction', id)

    await prisma.$transaction(async (dbTx) => {
      // 1. Fetch wallet
      const wallet = await dbTx.wallet.findFirst({
        where: { id: tx.walletId, userId, deletedAt: null },
      })
      if (!wallet) throw new NotFoundError('Wallet', tx.walletId)

      // 2. Revert wallet balance
      // If original was EXPENSE, we add it back. If INCOME, we subtract.
      let delta = tx.amount
      if (tx.type === 'INCOME') {
        delta = tx.amount.negated()
      }

      const walletUpdated = await dbTx.wallet.updateMany({
        where: { id: tx.walletId, version: wallet.version, deletedAt: null },
        data: {
          balance: { increment: delta },
          version: { increment: 1 },
        },
      })
      if (walletUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // 3. Revert budget if EXPENSE
      if (tx.type === 'EXPENSE') {
        const month = tx.transactionDate.getMonth() + 1
        const year = tx.transactionDate.getFullYear()

        await dbTx.budget.updateMany({
          where: {
            userId,
            categoryId: tx.categoryId,
            month,
            year,
            deletedAt: null,
          },
          data: {
            spentAmount: { decrement: tx.amount },
          },
        })
      }

      // 4. Soft delete transaction
      await dbTx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      await auditLog({
        userId,
        action: 'DELETE',
        resource: 'transaction',
        resourceId: id,
      })
    })
  }

  async updateTransaction(
    id: string,
    userId: string,
    dto: Partial<CreateTransactionDto>
  ): Promise<Transaction> {
    const original = await this.transactionRepo.findById(id, userId)
    if (!original) throw new NotFoundError('Transaction', id)

    return prisma.$transaction(async (tx) => {
      // 1. If modifying wallet/amount/type, perform revert and apply
      const walletId = dto.walletId || original.walletId
      const amount = dto.amount ? new Decimal(dto.amount) : original.amount
      const type = dto.type || original.type

      // Check amount validity
      if (amount.isNegative() || amount.isZero()) {
        throw new BusinessRuleError('INVALID_AMOUNT', 'Transaction amount must be greater than 0.')
      }

      // Revert original transaction from original wallet
      const origWallet = await tx.wallet.findFirst({
        where: { id: original.walletId, userId, deletedAt: null },
      })
      if (!origWallet) throw new NotFoundError('Original wallet')

      let origDelta = original.amount
      if (original.type === 'INCOME') {
        origDelta = original.amount.negated()
      }

      const origWalletUpdated = await tx.wallet.updateMany({
        where: { id: original.walletId, version: origWallet.version, deletedAt: null },
        data: {
          balance: { increment: origDelta },
          version: { increment: 1 },
        },
      })
      if (origWalletUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // Revert original budget if original was EXPENSE
      if (original.type === 'EXPENSE') {
        const month = original.transactionDate.getMonth() + 1
        const year = original.transactionDate.getFullYear()

        await tx.budget.updateMany({
          where: {
            userId,
            categoryId: original.categoryId,
            month,
            year,
            deletedAt: null,
          },
          data: {
            spentAmount: { decrement: original.amount },
          },
        })
      }

      // Apply new transaction to new/same wallet
      const newWallet = await tx.wallet.findFirst({
        where: { id: walletId, userId, deletedAt: null },
      })
      if (!newWallet) throw new NotFoundError('Target wallet')

      let newDelta = amount
      if (type === 'EXPENSE') {
        newDelta = amount.negated()
      }

      if (type === 'EXPENSE' && newWallet.balance.plus(newDelta).isNegative() && newWallet.type !== 'CREDIT_CARD') {
        throw new BusinessRuleError('INSUFFICIENT_BALANCE', 'Wallet has insufficient balance.')
      }

      const newWalletUpdated = await tx.wallet.updateMany({
        where: { id: walletId, version: newWallet.version, deletedAt: null },
        data: {
          balance: { increment: newDelta },
          version: { increment: 1 },
        },
      })
      if (newWalletUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // Apply new budget if type is EXPENSE
      if (type === 'EXPENSE') {
        const txnDate = dto.transactionDate ? new Date(dto.transactionDate) : original.transactionDate
        const month = txnDate.getMonth() + 1
        const year = txnDate.getFullYear()
        const categoryId = dto.categoryId !== undefined ? dto.categoryId : original.categoryId

        await tx.budget.updateMany({
          where: {
            userId,
            categoryId,
            month,
            year,
            deletedAt: null,
          },
          data: {
            spentAmount: { increment: amount },
          },
        })
      }

      // 2. Perform transaction update
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          walletId,
          categoryId: dto.categoryId !== undefined ? dto.categoryId : original.categoryId,
          type,
          amount,
          description: dto.description !== undefined ? dto.description : original.description,
          merchant: dto.merchant !== undefined ? dto.merchant : original.merchant,
          transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : original.transactionDate,
          tags: dto.tags !== undefined ? dto.tags : original.tags,
        },
      })

      await auditLog({
        userId,
        action: 'UPDATE',
        resource: 'transaction',
        resourceId: id,
        oldValue: { amount: original.amount.toString() },
        newValue: { amount: amount.toString() },
      })

      return {
        id: updated.id,
        userId: updated.userId,
        walletId: updated.walletId,
        categoryId: updated.categoryId,
        type: updated.type as TransactionType,
        amount: updated.amount,
        description: updated.description,
        merchant: updated.merchant,
        transactionDate: updated.transactionDate,
        status: updated.status,
        isRecurring: updated.isRecurring,
        receiptUrl: updated.receiptUrl,
        notes: updated.notes,
        tags: updated.tags,
        aiCategorized: updated.aiCategorized,
        aiConfidence: updated.aiConfidence,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }
    })
  }
}

// Singleton export
export const transactionService = new TransactionService(
  new TransactionRepository(),
  new WalletRepository(),
  budgetService
)
