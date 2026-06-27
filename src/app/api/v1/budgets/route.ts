import { budgetService } from '@/features/budgets/budget.service'
import { CreateBudgetSchema } from '@/features/budgets/budget.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined

    const budgets = await budgetService.findAll(req.user.id, month, year)
    return ApiResponse.success(budgets)
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = CreateBudgetSchema.parse(json)

    const budget = await budgetService.create(req.user.id, body)

    return ApiResponse.created(budget)
  })
)
