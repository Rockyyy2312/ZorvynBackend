import { aiService } from '@/features/ai/ai.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'

const ChatBodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1, 'Message content cannot be empty'),
    })
  ),
})

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // 1. Enforce AI Rate limits
    await aiService.checkRateLimit(req.user.id, req.user.plan)

    // 2. Validate request body
    const json = await req.json()
    const { messages } = ChatBodySchema.parse(json)

    // 3. Invoke chat model
    const reply = await aiService.chat(req.user.id, messages)

    return ApiResponse.success({ reply })
  })
)
