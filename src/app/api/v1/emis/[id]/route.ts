import { emiService } from '@/features/emis/emi.service'
import { UpdateEMISchema } from '@/features/emis/emi.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const emi = await emiService.findById(id, req.user.id)
    const payments = await emiService.getPayments(id, req.user.id)
    return ApiResponse.success(emi, { payments })
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateEMISchema.parse(json)

    const updated = await emiService.update(id, req.user.id, body)

    return ApiResponse.success(updated)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await emiService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
