import { authService } from '@/features/auth/auth.service'
import { ResetPasswordSchema } from '@/features/auth/auth.validators'
import { rateLimit, RATE_LIMITS } from '@/server/middleware/rate-limit.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { getIpAddress } from '@/shared/utils/request'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getIpAddress(req)

  // Rate limit: 5 requests per 15 minutes per IP
  const limitCheck = await rateLimit(ip, RATE_LIMITS.AUTH)
  if (!limitCheck.allowed) {
    return ApiResponse.error(
      'RATE_LIMIT_EXCEEDED',
      'Too many password reset attempts. Please try again later.',
      429
    )
  }

  const json = await req.json()
  const body = ResetPasswordSchema.parse(json)

  await authService.resetPassword(body)

  return ApiResponse.success({ message: 'Password has been reset successfully.' })
})
