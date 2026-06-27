import { budgetService } from '@/features/budgets/budget.service'
import { UpdateBudgetSchema } from '@/features/budgets/budget.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const budget = await budgetService.findById(id, req.user.id)
    return ApiResponse.success(budget)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateBudgetSchema.parse(json)

    const budget = await budgetService.update(id, req.user.id, body)

    return ApiResponse.success(budget)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await budgetService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
