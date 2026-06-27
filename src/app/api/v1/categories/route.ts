import { categoryService } from '@/features/categories/category.service'
import { CreateCategorySchema } from '@/features/categories/category.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const categories = await categoryService.findAll(req.user.id)
    return ApiResponse.success(categories)
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = CreateCategorySchema.parse(json)

    const category = await categoryService.create(req.user.id, body)

    return ApiResponse.created(category)
  })
)
