import { profileService } from '@/features/profile/profile.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const { oldPassword, newPassword } = ChangePasswordSchema.parse(json)

    await profileService.updatePassword(req.user.id, oldPassword, newPassword)

    return ApiResponse.success({ message: 'Password updated successfully. Sessions reset.' })
  })
)
