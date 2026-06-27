import { profileService } from '@/features/profile/profile.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  timezone: z.string().min(1, 'Timezone cannot be empty').optional(),
  currency: z.string().min(1, 'Currency cannot be empty').optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().nullable(),
  onboardingCompleted: z.boolean().optional(),
})

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const profile = await profileService.getProfile(req.user.id)
    return ApiResponse.success(profile)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const validated = UpdateProfileSchema.parse(json)

    const updated = await profileService.updateProfile(req.user.id, validated)
    return ApiResponse.success(updated)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    await profileService.softDeleteAccount(req.user.id)
    return ApiResponse.success({ message: 'Account successfully deactivated' })
  })
)
