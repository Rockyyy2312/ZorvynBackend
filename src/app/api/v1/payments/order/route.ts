import { razorpayService } from '@/features/payments/razorpay.service'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { z } from 'zod'
import { UserPlan } from '@prisma/client'

const CreateOrderSchema = z.object({
  plan: z.nativeEnum(UserPlan),
})

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const { plan } = CreateOrderSchema.parse(json)

    const orderData = await razorpayService.createOrder(req.user.id, plan)

    return ApiResponse.success(orderData)
  })
)
