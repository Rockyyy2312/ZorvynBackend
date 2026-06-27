import { goalService } from '@/features/goals/goal.service'
import { UpdateGoalSchema } from '@/features/goals/goal.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const goal = await goalService.findById(id, req.user.id)
    return ApiResponse.success(goal)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateGoalSchema.parse(json)

    const goal = await goalService.update(id, req.user.id, body)

    return ApiResponse.success(goal)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await goalService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
