import { dashboardService } from '@/features/dashboard/dashboard.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const summary = await dashboardService.getSummary(req.user.id)
    return ApiResponse.success(summary)
  })
)
