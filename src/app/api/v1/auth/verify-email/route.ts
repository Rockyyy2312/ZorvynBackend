import { authService } from '@/features/auth/auth.service'
import { VerifyEmailSchema } from '@/features/auth/auth.validators'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const POST = withErrorHandler(async (req: Request) => {
  const json = await req.json()
  const body = VerifyEmailSchema.parse(json)

  await authService.verifyEmail(body.token)

  return ApiResponse.success({ message: 'Email verified successfully.' })
})
