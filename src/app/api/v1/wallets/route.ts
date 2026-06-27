import { walletService } from '@/features/wallets/wallet.service'
import { CreateWalletSchema } from '@/features/wallets/wallet.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const wallets = await walletService.findAll(req.user.id)
    return ApiResponse.success(wallets)
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    // 1. Enforce plan limit
    await walletService.assertPlanLimit(req.user.id, req.user.plan)

    // 2. Parse request JSON and validate body
    const json = await req.json()
    const body = CreateWalletSchema.parse(json)

    // 3. Create wallet
    const wallet = await walletService.create(req.user.id, body)

    return ApiResponse.created(wallet)
  })
)
