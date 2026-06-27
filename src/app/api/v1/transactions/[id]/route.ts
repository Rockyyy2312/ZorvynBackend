import { transactionService } from '@/features/transactions/transaction.service'
import { UpdateTransactionSchema } from '@/features/transactions/transaction.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const transaction = await transactionService.findById(id, req.user.id)
    return ApiResponse.success(transaction)
  })
)

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const json = await req.json()
    const body = UpdateTransactionSchema.parse(json)

    const updated = await transactionService.updateTransaction(id, req.user.id, body)

    return ApiResponse.success(updated)
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    await transactionService.deleteTransaction(id, req.user.id)
    return ApiResponse.noContent() // Returns 204 No Content
  })
)
