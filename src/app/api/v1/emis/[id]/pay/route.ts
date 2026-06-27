import { emiService } from '@/features/emis/emi.service'
import { PayEMISchema } from '@/features/emis/emi.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = PayEMISchema.parse(json)

    const updated = await emiService.payInstallment(id, req.user.id, body)

    return ApiResponse.success(updated)
  })
)
