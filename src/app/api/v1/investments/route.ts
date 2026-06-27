import { investmentService } from '@/features/investments/investment.service'
import { CreateInvestmentSchema } from '@/features/investments/investment.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const list = await investmentService.findAll(req.user.id)
    const summary = await investmentService.getSummary(req.user.id)

    return ApiResponse.success(list, { summary })
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = CreateInvestmentSchema.parse(json)

    const investment = await investmentService.create(req.user.id, body)

    return ApiResponse.created(investment)
  })
)
