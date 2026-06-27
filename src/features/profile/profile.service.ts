import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/shared/utils/password'
import { BusinessRuleError, NotFoundError } from '@/shared/errors'
import { auditLog } from '@/lib/audit'

export class ProfileService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        googleId: true,
        avatarUrl: true,
        plan: true,
        planExpiresAt: true,
        timezone: true,
        currency: true,
        isAdmin: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) throw new NotFoundError('User', userId)
    return user
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string
      timezone?: string
      currency?: string
      avatarUrl?: string | null
      onboardingCompleted?: boolean
    }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundError('User', userId)

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        timezone: true,
        currency: true,
        onboardingCompleted: true,
      },
    })

    await auditLog({
      userId,
      action: 'UPDATE',
      resource: 'user_profile',
      resourceId: userId,
      newValue: data,
    })

    return updated
  }

  async updatePassword(userId: string, oldPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundError('User', userId)

    if (!user.passwordHash) {
      throw new BusinessRuleError('AUTH_METHOD_MISMATCH', 'Google accounts do not have passwords.')
    }

    const isValid = await verifyPassword(oldPass, user.passwordHash)
    if (!isValid) {
      throw new BusinessRuleError('INVALID_PASSWORD', 'Incorrect old password.')
    }

    const passwordHash = await hashPassword(newPass)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Invalidate all active sessions on password change
      prisma.session.updateMany({
        where: { userId },
        data: { isValid: false },
      }),
    ])

    await auditLog({
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'user_password',
      resourceId: userId,
    })
  }

  async softDeleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundError('User', userId)

    const now = new Date()

    await prisma.$transaction([
      // 1. Soft delete User
      prisma.user.update({
        where: { id: userId },
        data: { deletedAt: now },
      }),
      // 2. Soft delete related Wallets
      prisma.wallet.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // 3. Clear/Invalidate active sessions
      prisma.session.deleteMany({
        where: { userId },
      }),
    ])

    await auditLog({
      userId,
      action: 'DELETE',
      resource: 'user_account',
      resourceId: userId,
    })
  }
}

export const profileService = new ProfileService()
