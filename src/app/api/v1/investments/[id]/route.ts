import { investmentService } from '@/features/investments/investment.service'
import { UpdateInvestmentSchema } from '@/features/investments/investment.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const investment = await investmentService.findById(id, req.user.id)
    return ApiResponse.success(investment)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateInvestmentSchema.parse(json)

    const updated = await investmentService.update(id, req.user.id, body)

    return ApiResponse.success(updated)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await investmentService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
