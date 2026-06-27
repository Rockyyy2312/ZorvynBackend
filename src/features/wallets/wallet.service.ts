import { WalletRepository } from './wallet.repository'
import { NotificationService, notificationService } from '../notifications/notification.service'
import { NotFoundError, BusinessRuleError } from '@/shared/errors'
import { PLAN_LIMITS } from '@/shared/constants'
import { auditLog } from '@/lib/audit'
import type { Wallet, CreateWalletDto } from './wallet.types'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/prisma'

export class WalletService {
  constructor(
    private walletRepo: WalletRepository,
    _notificationService: NotificationService
  ) {}

  async findAll(userId: string): Promise<Wallet[]> {
    return this.walletRepo.findAll(userId)
  }

  async findById(id: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findById(id, userId)
    if (!wallet) throw new NotFoundError('Wallet', id)
    return wallet
  }

  async assertPlanLimit(userId: string, plan: string): Promise<void> {
    const count = await this.walletRepo.countByUser(userId)
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.MAX_WALLETS ?? 3

    if (count >= limit) {
      throw new BusinessRuleError(
        'PLAN_LIMIT_REACHED',
        `Your ${plan} plan allows a maximum of ${limit} wallets. Upgrade to add more.`
      )
    }
  }

  async create(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    // If this is the first wallet, make it default
    const existingCount = await this.walletRepo.countByUser(userId)
    const isDefault = existingCount === 0 ? true : (dto.isDefault ?? false)

    // If setting as default, unset any existing default
    if (isDefault) {
      await this.walletRepo.unsetDefault(userId)
    }

    const wallet = await this.walletRepo.create({
      userId,
      ...dto,
      isDefault,
      balance: dto.initialBalance ?? '0',
    })

    await auditLog({
      userId,
      action: 'CREATE',
      resource: 'wallet',
      resourceId: wallet.id,
      newValue: { name: wallet.name, type: wallet.type },
    })

    return wallet
  }

  async delete(id: string, userId: string): Promise<void> {
    const wallet = await this.findById(id, userId)

    if (wallet.isDefault) {
      throw new BusinessRuleError(
        'CANNOT_DELETE_DEFAULT_WALLET',
        'Cannot delete your default wallet. Set another wallet as default first.'
      )
    }

    await this.walletRepo.softDelete(id, userId)

    await auditLog({ userId, action: 'DELETE', resource: 'wallet', resourceId: id })
  }

  async update(id: string, userId: string, dto: Partial<CreateWalletDto>): Promise<Wallet> {
    const wallet = await this.findById(id, userId)

    if (dto.isDefault) {
      await this.walletRepo.unsetDefault(userId)
    }

    const updated = await this.walletRepo.update(id, {
      name: dto.name,
      type: dto.type,
      isDefault: dto.isDefault,
      color: dto.color,
      icon: dto.icon,
    })

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'wallet',
      resourceId: id,
      oldValue: { name: wallet.name, type: wallet.type, isDefault: wallet.isDefault },
      newValue: { name: updated.name, type: updated.type, isDefault: updated.isDefault },
    })

    return updated
  }

  async transfer(
    userId: string,
    dto: {
      fromWalletId: string
      toWalletId: string
      amount: string
      note?: string
      date?: string
    }
  ): Promise<any> {
    const amount = new Decimal(dto.amount)
    if (amount.isNegative() || amount.isZero()) {
      throw new BusinessRuleError('INVALID_AMOUNT', 'Transfer amount must be greater than 0.')
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch wallets
      const fromWallet = await tx.wallet.findFirst({
        where: { id: dto.fromWalletId, userId, deletedAt: null },
      })
      const toWallet = await tx.wallet.findFirst({
        where: { id: dto.toWalletId, userId, deletedAt: null },
      })

      if (!fromWallet) throw new NotFoundError('Source wallet')
      if (!toWallet) throw new NotFoundError('Destination wallet')

      if (fromWallet.balance.lt(amount)) {
        throw new BusinessRuleError('INSUFFICIENT_BALANCE', 'Source wallet has insufficient balance.')
      }

      // 2. Update balances
      const fromUpdated = await tx.wallet.updateMany({
        where: { id: dto.fromWalletId, version: fromWallet.version, deletedAt: null },
        data: {
          balance: { decrement: amount },
          version: { increment: 1 },
        },
      })
      if (fromUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      const toUpdated = await tx.wallet.updateMany({
        where: { id: dto.toWalletId, version: toWallet.version, deletedAt: null },
        data: {
          balance: { increment: amount },
          version: { increment: 1 },
        },
      })
      if (toUpdated.count === 0) {
        throw new BusinessRuleError('TRANSACTION_CONFLICT', 'Concurrent write conflict. Please retry.')
      }

      // 3. Create transfer transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId: dto.fromWalletId,
          type: 'TRANSFER',
          amount: amount,
          description: dto.note || `Transfer to ${toWallet.name}`,
          transactionDate: dto.date ? new Date(dto.date) : new Date(),
          status: 'COMPLETED',
          metadata: {
            toWalletId: dto.toWalletId,
            transfer: true,
          },
        },
      })

      await auditLog({
        userId,
        action: 'CREATE',
        resource: 'transaction',
        resourceId: transaction.id,
        newValue: {
          type: 'TRANSFER',
          fromWalletId: dto.fromWalletId,
          toWalletId: dto.toWalletId,
          amount: amount.toString(),
        },
      })

      return transaction
    })
  }
}

// Singleton instance
export const walletService = new WalletService(
  new WalletRepository(),
  notificationService
)
