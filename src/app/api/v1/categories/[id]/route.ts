import { categoryService } from '@/features/categories/category.service'
import { UpdateCategorySchema } from '@/features/categories/category.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const category = await categoryService.findById(id, req.user.id)
    return ApiResponse.success(category)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateCategorySchema.parse(json)

    const category = await categoryService.update(id, req.user.id, body)

    return ApiResponse.success(category)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await categoryService.delete(id, req.user.id)
    return ApiResponse.noContent()
  })
)
