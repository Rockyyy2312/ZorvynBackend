import { goalService } from '@/features/goals/goal.service'
import { ContributeGoalSchema } from '@/features/goals/goal.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = ContributeGoalSchema.parse(json)

    const updatedGoal = await goalService.contribute(id, req.user.id, body)

    return ApiResponse.success(updatedGoal)
  })
)
