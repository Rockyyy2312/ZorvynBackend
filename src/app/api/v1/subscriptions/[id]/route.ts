import { subscriptionService } from '@/features/subscriptions/subscription.service'
import { UpdateSubscriptionSchema } from '@/features/subscriptions/subscription.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const sub = await subscriptionService.findById(id, req.user.id)
    return ApiResponse.success(sub)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateSubscriptionSchema.parse(json)

    const updated = await subscriptionService.update(id, req.user.id, body)

    return ApiResponse.success(updated)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await subscriptionService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
