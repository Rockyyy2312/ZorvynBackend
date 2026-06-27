import { goalService } from '@/features/goals/goal.service'
import { CreateGoalSchema } from '@/features/goals/goal.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const goals = await goalService.findAll(req.user.id)
    return ApiResponse.success(goals)
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // Check plan limit
    await goalService.assertPlanLimit(req.user.id, req.user.plan)

    const json = await req.json()
    const body = CreateGoalSchema.parse(json)

    const goal = await goalService.create(req.user.id, body)

    return ApiResponse.created(goal)
  })
)
