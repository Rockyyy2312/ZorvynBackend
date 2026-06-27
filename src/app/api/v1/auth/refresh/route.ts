import { authService } from '@/features/auth/auth.service'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { NextResponse } from 'next/server'
import { AUTH } from '@/shared/constants'
import { env } from '@/lib/env'

export const POST = withErrorHandler(async (req: Request) => {
  let refreshToken: string | null = null

  // 1. Try reading from cookie
  const nextReq = req as any
  if (nextReq.cookies && typeof nextReq.cookies.get === 'function') {
    refreshToken = nextReq.cookies.get('refreshToken')?.value || null
  }

  // 2. If not in cookie, try reading from request body
  if (!refreshToken) {
    try {
      const json = await req.json()
      refreshToken = json.refreshToken || null
    } catch {
      // Body not present or invalid JSON
    }
  }

  if (!refreshToken) {
    return ApiResponse.error('UNAUTHORIZED', 'Refresh token is required.', 401)
  }

  const result = await authService.refreshToken(refreshToken)

  const response = NextResponse.json(
    {
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
      },
    },
    { status: 200 }
  )

  // Rotate token cookie
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
