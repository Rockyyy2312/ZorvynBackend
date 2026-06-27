import { walletService } from '@/features/wallets/wallet.service'
import { UpdateWalletSchema } from '@/features/wallets/wallet.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const wallet = await walletService.findById(id, req.user.id)
    return ApiResponse.success(wallet)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateWalletSchema.parse(json)

    // Check if wallet exists and belongs to user
    await walletService.findById(id, req.user.id)

    // Delegate to repository via service/direct Prisma update in service
    // Wait, let's add update method to walletService if not present.
    // Yes, we will call walletService.update(id, req.user.id, body)
    // Let's implement update in walletService if we haven't. Let's look at walletService.ts:
    // It does not have update method yet. Let's add it! Let's check what we need.
    const wallet = await walletService.update(id, req.user.id, body)

    return ApiResponse.success(wallet)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await walletService.delete(id, req.user.id)
    return ApiResponse.noContent() // Returns 204 No Content
  })
)
