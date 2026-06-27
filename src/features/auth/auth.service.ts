import { UserRepository } from '@/features/users/user.repository'
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
} from '@/shared/utils/password'
import {
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  TokenExpiredOrInvalidError,
} from './auth.errors'
import { signJWT } from '@/lib/jwt'
import { resend } from '@/lib/resend'
import { renderEmailTemplate } from '@/features/notifications/email.templates'
import { env } from '@/lib/env'
import { createHash } from 'crypto'
import { AUTH } from '@/shared/constants'
import { prisma } from '@/lib/prisma'
import type { RegisterDto, LoginDto, ResetPasswordDto } from './auth.validators'

export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async register(dto: RegisterDto): Promise<{ userId: string; message: string }> {
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) {
      throw new EmailAlreadyExistsError(dto.email)
    }

    const passwordHash = await hashPassword(dto.password)
    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      timezone: dto.timezone,
      emailVerified: false,
    })

    // Create verify token
    const { raw: rawToken, hashed: hashedToken } = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + AUTH.VERIFY_TOKEN_TTL_HOURS)

    await prisma.emailVerifyToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    })

    // Send email
    const link = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`
    const html = renderEmailTemplate('verify-email', { name: user.name, link })

    await resend.emails.send({
      from: 'FinanceFlow <noreply@financeflow.in>',
      to: user.email,
      subject: 'Verify your email address',
      html,
    })

    return {
      userId: user.id,
      message: 'Verification email sent.',
    }
  }

  async login(
    dto: LoginDto,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; name: string; plan: string } }> {
    const dbUser = await this.userRepo.findByEmailWithPassword(dto.email)

    if (!dbUser || !dbUser.passwordHash) {
      // Log failed login
      if (dbUser) {
        await this.userRepo.logLoginAttempt({
          userId: dbUser.id,
          ipAddress,
          userAgent,
          success: false,
          failReason: 'Invalid credentials',
        })
      }
      throw new InvalidCredentialsError()
    }

    const isMatch = await verifyPassword(dto.password, dbUser.passwordHash)
    if (!isMatch) {
      await this.userRepo.logLoginAttempt({
        userId: dbUser.id,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'Invalid credentials',
      })
      throw new InvalidCredentialsError()
    }

    if (!dbUser.emailVerified) {
      await this.userRepo.logLoginAttempt({
        userId: dbUser.id,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'Email not verified',
      })
      throw new EmailNotVerifiedError()
    }

    // Check active sessions limit
    const activeSessionsCount = await this.userRepo.getActiveSessionsCount(dbUser.id)
    const maxSessions =
      dbUser.plan === 'FREE'
        ? AUTH.MAX_SESSIONS_FREE
        : AUTH.MAX_SESSIONS_PREMIUM

    if (activeSessionsCount >= maxSessions) {
      await this.userRepo.invalidateOldestSession(dbUser.id)
    }

    // Create session
    const sessionId = crypto.randomUUID()
    const { raw: rawRefreshToken, hashed: hashedRefreshToken } = generateSecureToken()
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + AUTH.REFRESH_TOKEN_TTL_DAYS)

    const session = await this.userRepo.createSession({
      userId: dbUser.id,
      token: sessionId,
      refreshToken: hashedRefreshToken,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    })

    // Log login attempt
    await this.userRepo.logLoginAttempt({
      userId: dbUser.id,
      ipAddress,
      userAgent,
      success: true,
    })

    // Generate accessToken
    const accessToken = signJWT(
      {
        sub: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        plan: dbUser.plan,
        isAdmin: dbUser.isAdmin,
        sessionId: session.id,
      },
      AUTH.ACCESS_TOKEN_TTL_SECONDS
    )

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        plan: dbUser.plan,
      },
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const hashed = createHash('sha256').update(token).digest('hex')

    const dbToken = await prisma.emailVerifyToken.findFirst({
      where: { token: hashed, usedAt: null },
    })

    if (!dbToken || dbToken.expiresAt < new Date()) {
      throw new TokenExpiredOrInvalidError('Verification token is expired or invalid.')
    }

    await prisma.$transaction([
      prisma.emailVerifyToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: dbToken.userId },
        data: { emailVerified: true },
      }),
    ])
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      // Prevent email enumeration
      return
    }

    const { raw: rawToken, hashed: hashedToken } = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + AUTH.RESET_TOKEN_TTL_HOURS)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    })

    const link = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`
    const html = renderEmailTemplate('reset-password', { name: user.name, link })

    await resend.emails.send({
      from: 'FinanceFlow <noreply@financeflow.in>',
      to: user.email,
      subject: 'Reset your password',
      html,
    })
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const hashedToken = createHash('sha256').update(dto.token).digest('hex')

    const dbToken = await prisma.passwordResetToken.findFirst({
      where: { token: hashedToken, usedAt: null },
    })

    if (!dbToken || dbToken.expiresAt < new Date()) {
      throw new TokenExpiredOrInvalidError('Password reset token is expired or invalid.')
    }

    const passwordHash = await hashPassword(dto.password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: dbToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions for security rotation
      prisma.session.updateMany({
        where: { userId: dbToken.userId },
        data: { isValid: false },
      }),
    ])
  }

  async refreshToken(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const hashed = createHash('sha256').update(rawRefreshToken).digest('hex')

    const session = await prisma.session.findFirst({
      where: { refreshToken: hashed, isValid: true },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
      if (session) {
        // Suspicious activity / reuse - invalidate all user sessions
        await this.userRepo.invalidateAllSessions(session.userId)
      }
      throw new TokenExpiredOrInvalidError('Refresh token is invalid or expired.')
    }

    // Refresh Token Rotation (RTR)
    const { raw: newRawToken, hashed: newHashedToken } = generateSecureToken()
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + AUTH.REFRESH_TOKEN_TTL_DAYS)

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newHashedToken,
        expiresAt: newExpiresAt,
      },
    })

    const accessToken = signJWT(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        plan: session.user.plan,
        isAdmin: session.user.isAdmin,
        sessionId: session.id,
      },
      AUTH.ACCESS_TOKEN_TTL_SECONDS
    )

    return {
      accessToken,
      refreshToken: newRawToken,
    }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const hashed = createHash('sha256').update(rawRefreshToken).digest('hex')
    await this.userRepo.invalidateSession(hashed)
  }
}

export const authService = new AuthService(new UserRepository())
