import { adminService } from '@/features/admin/admin.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    if (!req.user.isAdmin) {
      return ApiResponse.error('FORBIDDEN', 'Administrative access required.', 403)
    }

    const stats = await adminService.getStats()
    return ApiResponse.success(stats)
  })
)
