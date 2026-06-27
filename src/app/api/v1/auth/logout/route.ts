import { authService } from '@/features/auth/auth.service'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { NextResponse } from 'next/server'

export const POST = withErrorHandler(async (req: Request) => {
  let refreshToken: string | null = null

  // 1. Try reading from cookie
  const nextReq = req as any
  if (nextReq.cookies && typeof nextReq.cookies.get === 'function') {
    refreshToken = nextReq.cookies.get('refreshToken')?.value || null
  }

  // 2. Try reading from request body
  if (!refreshToken) {
    try {
      const json = await req.json()
      refreshToken = json.refreshToken || null
    } catch {
      // Body not present or invalid JSON
    }
  }

  if (refreshToken) {
    await authService.logout(refreshToken)
  }

  // 204 No Content response
  const response = new NextResponse(null, { status: 204 })

  // Delete refreshToken cookie
  response.cookies.delete('refreshToken')

  return response
})
