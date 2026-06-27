import { emiService } from '@/features/emis/emi.service'
import { CreateEMISchema } from '@/features/emis/emi.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const list = await emiService.findAll(req.user.id)
    return ApiResponse.success(list)
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = CreateEMISchema.parse(json)

    const emi = await emiService.create(req.user.id, body)

    return ApiResponse.created(emi)
  })
)
