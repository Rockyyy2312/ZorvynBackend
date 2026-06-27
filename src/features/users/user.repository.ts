import { prisma } from '@/lib/prisma'
import { User as PrismaUser } from '@prisma/client'
import type { User } from './user.types'

export class UserRepository {
  private readonly base = { deletedAt: null }

  private toDomain(row: PrismaUser): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      plan: row.plan,
      planExpiresAt: row.planExpiresAt,
      timezone: row.timezone,
      currency: row.currency,
      isAdmin: row.isAdmin,
      onboardingCompleted: row.onboardingCompleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findById(id: string): Promise<User | null> {
    const row = await prisma.user.findFirst({
      where: { id, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma.user.findFirst({
      where: { email, ...this.base },
    })
    return row ? this.toDomain(row) : null
  }

  async findByEmailWithPassword(email: string): Promise<PrismaUser | null> {
    return prisma.user.findFirst({
      where: { email, ...this.base },
    })
  }

  async create(data: {
    name: string
    email: string
    passwordHash?: string
    googleId?: string
    avatarUrl?: string | null
    emailVerified?: boolean
    timezone?: string
  }): Promise<User> {
    const row = await prisma.user.create({
      data: {
        ...data,
        plan: 'FREE',
      },
    })
    return this.toDomain(row)
  }

  async update(id: string, data: Partial<Omit<PrismaUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<User> {
    const row = await prisma.user.update({
      where: { id },
      data,
    })
    return this.toDomain(row)
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // Session mappings
  async createSession(session: {
    userId: string
    token: string
    refreshToken: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
  }) {
    return prisma.session.create({
      data: {
        userId: session.userId,
        token: session.token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isValid: true,
      },
    })
  }

  async findSessionByRefreshToken(refreshToken: string) {
    return prisma.session.findFirst({
      where: { refreshToken, isValid: true },
      include: { user: true },
    })
  }

  async invalidateSession(refreshToken: string): Promise<void> {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { isValid: false },
    })
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    })
  }

  async getActiveSessionsCount(userId: string): Promise<number> {
    return prisma.session.count({
      where: { userId, isValid: true, expiresAt: { gt: new Date() } },
    })
  }

  async invalidateOldestSession(userId: string): Promise<void> {
    const oldest = await prisma.session.findFirst({
      where: { userId, isValid: true },
      orderBy: { createdAt: 'asc' },
    })
    if (oldest) {
      await prisma.session.update({
        where: { id: oldest.id },
        data: { isValid: false },
      })
    }
  }

  async logLoginAttempt(attempt: {
    userId: string
    ipAddress?: string | null
    userAgent?: string | null
    success: boolean
    failReason?: string | null
  }) {
    return prisma.loginHistory.create({
      data: attempt,
    })
  }
}
