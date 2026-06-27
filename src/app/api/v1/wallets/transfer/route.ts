import { walletService } from '@/features/wallets/wallet.service'
import { WalletTransferSchema } from '@/features/wallets/wallet.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = WalletTransferSchema.parse(json)

    const transaction = await walletService.transfer(req.user.id, body)

    return ApiResponse.success(transaction)
  })
)
