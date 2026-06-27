import { subscriptionService } from '@/features/subscriptions/subscription.service'
import { CreateSubscriptionSchema } from '@/features/subscriptions/subscription.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const list = await subscriptionService.findAll(req.user.id)
    const forecast = await subscriptionService.getBillingForecast(req.user.id)

    return ApiResponse.success(list, { forecast })
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // Check plan limits
    await subscriptionService.assertPlanLimit(req.user.id, req.user.plan)

    const json = await req.json()
    const body = CreateSubscriptionSchema.parse(json)

    const subscription = await subscriptionService.create(req.user.id, body)

    return ApiResponse.created(subscription)
  })
)
