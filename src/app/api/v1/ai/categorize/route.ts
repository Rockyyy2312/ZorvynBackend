import { aiService } from '@/features/ai/ai.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'

const CategorizeBodySchema = z.object({
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']).optional().default('EXPENSE'),
})

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const { description, merchant, type } = CategorizeBodySchema.parse(json)

    const suggestedCategory = await aiService.categorizeTransaction(
      description,
      merchant,
      type
    )

    return ApiResponse.success({ category: suggestedCategory })
  })
)
