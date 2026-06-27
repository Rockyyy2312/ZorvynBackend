import { adminService } from '@/features/admin/admin.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    if (!req.user.isAdmin) {
      return ApiResponse.error('FORBIDDEN', 'Administrative access required.', 403)
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)

    const result = await adminService.listAuditLogs(page, limit)
    return ApiResponse.success(result.logs, {
      page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNext: page < result.totalPages,
      hasPrev: page > 1,
    })
  })
)
