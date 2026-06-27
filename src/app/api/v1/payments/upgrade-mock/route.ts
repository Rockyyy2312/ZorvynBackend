import { razorpayService } from '@/features/payments/razorpay.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'
import { UserPlan } from '@prisma/client'

const MockUpgradeSchema = z.object({
  plan: z.nativeEnum(UserPlan),
})

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    if (process.env.NODE_ENV === 'production') {
      return ApiResponse.error('FORBIDDEN', 'Upgrade mock is disabled in production', 403)
    }

    const json = await req.json()
    const { plan } = MockUpgradeSchema.parse(json)

    await razorpayService.forceUpgrade(req.user.id, plan)

    return ApiResponse.success({ message: `Successfully upgraded user to plan ${plan}` })
  })
)
