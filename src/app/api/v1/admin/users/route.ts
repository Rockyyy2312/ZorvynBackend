import { adminService } from '@/features/admin/admin.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'
import { UserPlan } from '@prisma/client'

const UpdateUserSchema = z.object({
  targetUserId: z.string().min(1, 'Target User ID is required'),
  plan: z.nativeEnum(UserPlan).optional(),
  planExpiresAt: z.string().datetime({ precision: 3 }).optional().nullable(),
  isAdmin: z.boolean().optional(),
})

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    if (!req.user.isAdmin) {
      return ApiResponse.error('FORBIDDEN', 'Administrative access required.', 403)
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100)

    const result = await adminService.listUsers(page, limit)
    return ApiResponse.success(result.users, {
      page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNext: page < result.totalPages,
      hasPrev: page > 1,
    })
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    if (!req.user.isAdmin) {
      return ApiResponse.error('FORBIDDEN', 'Administrative access required.', 403)
    }

    const json = await req.json()
    const { targetUserId, plan, planExpiresAt, isAdmin } = UpdateUserSchema.parse(json)

    let updatedUser

    if (plan !== undefined) {
      const expires = planExpiresAt ? new Date(planExpiresAt) : null
      updatedUser = await adminService.updateUserPlan(targetUserId, plan, expires)
    }

    if (isAdmin !== undefined) {
      updatedUser = await adminService.toggleUserStatus(targetUserId, isAdmin)
    }

    if (!updatedUser) {
      return ApiResponse.error('BAD_REQUEST', 'No updates specified.', 400)
    }

    return ApiResponse.success({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      plan: updatedUser.plan,
      isAdmin: updatedUser.isAdmin,
    })
  })
)
