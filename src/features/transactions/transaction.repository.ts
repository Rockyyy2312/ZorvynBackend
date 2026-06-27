import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { Transaction as PrismaTransaction, Prisma, TransactionType, TransactionStatus } from '@prisma/client'
import type { Transaction, TransactionFilters } from './transaction.types'

export class TransactionRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaTransaction): Transaction {
    return {
      id: row.id,
      userId: row.userId,
      walletId: row.walletId,
      categoryId: row.categoryId,
      type: row.type as TransactionType,
      amount: row.amount,
      description: row.description,
      merchant: row.merchant,
      transactionDate: row.transactionDate,
      status: row.status as TransactionStatus,
      isRecurring: row.isRecurring,
      receiptUrl: row.receiptUrl,
      notes: row.notes,
      tags: row.tags,
      aiCategorized: row.aiCategorized,
      aiConfidence: row.aiConfidence,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const row = await prisma.transaction.findFirst({
      where: { id, userId, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findAll(
    userId: string,
    filters: TransactionFilters
  ): Promise<{ data: Transaction[]; total: number }> {
    const page = Number(filters.page) || 1
    const limit = Math.min(Number(filters.limit) || 20, 100)
    const skip = (page - 1) * limit

    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
    }

    if (filters.type) {
      where.type = filters.type
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }
    if (filters.walletId) {
      where.walletId = filters.walletId
    }

    if (filters.startDate || filters.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {}
      if (filters.startDate) {
        dateFilter.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        dateFilter.lte = new Date(filters.endDate)
      }
      where.transactionDate = dateFilter
    }

    if (filters.minAmount || filters.maxAmount) {
      const amountFilter: Prisma.DecimalFilter = {}
      if (filters.minAmount) {
        amountFilter.gte = new Decimal(filters.minAmount)
      }
      if (filters.maxAmount) {
        amountFilter.lte = new Decimal(filters.maxAmount)
      }
      where.amount = amountFilter
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { merchant: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim())
      where.tags = { hasSome: tagList }
    }

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return {
      data: rows.map((r) => this.toDomain(r)),
      total,
    }
  }

  async create(data: {
    userId: string
    walletId: string
    categoryId?: string | null
    type: TransactionType
    amount: Decimal
    description?: string | null
    merchant?: string | null
    transactionDate: Date
    tags?: string[]
    status?: TransactionStatus
    aiCategorized?: boolean
    aiConfidence?: Decimal | null
  }): Promise<Transaction> {
    const row = await prisma.transaction.create({
      data: {
        ...data,
        isRecurring: false,
        version: 0,
      },
    })
    return this.toDomain(row)
  }

  async update(
    id: string,
    userId: string,
    data: {
      walletId?: string
      categoryId?: string | null
      type?: TransactionType
      amount?: Decimal
      description?: string | null
      merchant?: string | null
      transactionDate?: Date
      tags?: string[]
    }
  ): Promise<Transaction> {
    const row = await prisma.transaction.update({
      where: { id, userId },
      data,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await prisma.transaction.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  }

  async getRecent(userId: string, limit = 20): Promise<Transaction[]> {
    const rows = await prisma.transaction.findMany({
      where: { userId, ...this.base },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    })
    return rows.map((r) => this.toDomain(r))
  }
}
