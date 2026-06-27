import { transactionService } from '@/features/transactions/transaction.service'
import { CreateTransactionSchema } from '@/features/transactions/transaction.validators'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)

    const filters = {
      page: Number(searchParams.get('page') || '1'),
      limit: Number(searchParams.get('limit') || '20'),
      type: searchParams.get('type') as any,
      categoryId: searchParams.get('categoryId') || undefined,
      walletId: searchParams.get('walletId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      minAmount: searchParams.get('minAmount') || undefined,
      maxAmount: searchParams.get('maxAmount') || undefined,
      search: searchParams.get('search') || undefined,
      tags: searchParams.get('tags') || undefined,
    }

    const { data, total } = await transactionService.findAll(req.user.id, filters)

    const totalPages = Math.ceil(total / filters.limit)

    return ApiResponse.success(data, {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasNext: filters.page < totalPages,
      hasPrev: filters.page > 1,
    })
  })
)

export const POST = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const json = await req.json()
    const body = CreateTransactionSchema.parse(json)

    const transaction = await transactionService.createTransaction(req.user.id, body)

    return ApiResponse.created(transaction)
  })
)
