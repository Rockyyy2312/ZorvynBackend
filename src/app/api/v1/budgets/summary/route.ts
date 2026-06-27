import { budgetService } from '@/features/budgets/budget.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const month = searchParams.get('month') ? Number(searchParams.get('month')) : now.getMonth() + 1
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : now.getFullYear()

    const summary = await budgetService.getSummary(req.user.id, month, year)
    return ApiResponse.success(summary)
  })
)
