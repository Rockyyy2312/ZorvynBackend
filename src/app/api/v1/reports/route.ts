import { reportsService } from '@/features/reports/reports.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)

    const now = new Date()
    const defaultStart = new Date(now.setDate(now.getDate() - 30)) // last 30 days
    const defaultEnd = new Date()

    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : defaultStart
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : defaultEnd

    const cashFlow = await reportsService.getCashFlowTrend(req.user.id, startDate, endDate)
    const categoryDistribution = await reportsService.getCategoryDistribution(
      req.user.id,
      startDate,
      endDate,
      'EXPENSE'
    )

    return ApiResponse.success({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      cashFlow,
      categoryDistribution,
    })
  })
)
