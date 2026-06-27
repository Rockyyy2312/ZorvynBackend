import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Wallet as PrismaWallet, WalletType } from '@prisma/client'
import type { Wallet, CreateWalletData } from './wallet.types'

export class WalletRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaWallet): Wallet {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: row.type as WalletType,
      balance: row.balance,
      currency: row.currency,
      isDefault: row.isDefault,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findAll(userId: string): Promise<Wallet[]> {
    const rows = await prisma.wallet.findMany({
      where: { userId, ...this.base },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    return rows.map((r) => this.toDomain(r))
  }

  async findById(id: string, userId: string): Promise<Wallet | null> {
    const row = await prisma.wallet.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async countByUser(userId: string): Promise<number> {
    return prisma.wallet.count({
      where: { userId, ...this.base },
    })
  }

  async countTransactions(walletId: string): Promise<number> {
    return prisma.transaction.count({
      where: { walletId, deletedAt: null },
    })
  }

  async create(data: CreateWalletData): Promise<Wallet> {
    const row = await prisma.wallet.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type,
        balance: data.balance,
        currency: data.currency || 'INR',
        isDefault: data.isDefault || false,
        color: data.color || null,
        icon: data.icon || null,
        version: 0,
      },
    })
    return this.toDomain(row)
  }

  async unsetDefault(userId: string): Promise<void> {
    await prisma.wallet.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    })
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.wallet.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async update(
    id: string,
    data: {
      name?: string
      type?: WalletType
      isDefault?: boolean
      color?: string | null
      icon?: string | null
    }
  ): Promise<Wallet> {
    const row = await prisma.wallet.update({
      where: { id },
      data,
    })
    return this.toDomain(row)
  }

  async updateBalance(
    id: string,
    delta: Decimal,
    expectedVersion: number
  ): Promise<boolean> {
    const result = await prisma.wallet.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: {
        balance: { increment: delta },
        version: { increment: 1 },
      },
    })
    return result.count > 0
  }
}
