import { authService } from '@/features/auth/auth.service'
import { LoginSchema } from '@/features/auth/auth.validators'
import { rateLimit, RATE_LIMITS } from '@/server/middleware/rate-limit.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { getIpAddress, getUserAgent } from '@/shared/utils/request'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { NextResponse } from 'next/server'
import { AUTH } from '@/shared/constants'
import { env } from '@/lib/env'

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getIpAddress(req)
  const userAgent = getUserAgent(req)

  // Rate limit check: 5 attempts per 15 minutes per IP
  const limitCheck = await rateLimit(ip, RATE_LIMITS.AUTH)
  if (!limitCheck.allowed) {
    return ApiResponse.error(
      'RATE_LIMIT_EXCEEDED',
      'Too many login attempts. Please try again later.',
      429
    )
  }

  const json = await req.json()
  const body = LoginSchema.parse(json)

  const result = await authService.login(body, ip, userAgent)

  // Create response
  const response = NextResponse.json(
    {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
        user: result.user,
      },
    },
    { status: 200 }
  )

  // Set refreshToken in HttpOnly cookie
  response.cookies.set({
    name: 'refreshToken',
    value: result.refreshToken,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: AUTH.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  })

  return response
})
