import { prisma } from '@/lib/prisma'
import { aiService } from '@/features/ai/ai.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // 1. Fetch latest AI Insight
    const latestInsight = await prisma.notification.findFirst({
      where: { userId: req.user.id, type: 'AI_INSIGHT' },
      orderBy: { createdAt: 'desc' },
    })

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // 2. Return latest if fresh (less than 7 days old)
    if (latestInsight && latestInsight.createdAt.getTime() > sevenDaysAgo) {
      return ApiResponse.success({
        insight: latestInsight.body,
        createdAt: latestInsight.createdAt,
      })
    }

    // 3. Generate a new one if stale or missing
    const newContent = await aiService.generateWeeklyInsight(req.user.id)

    if (!newContent) {
      return ApiResponse.success({
        insight: 'AI insights are currently disabled in your notification preferences.',
        createdAt: new Date(),
      })
    }

    return ApiResponse.success({
      insight: newContent,
      createdAt: new Date(),
    })
  })
)
