import { prisma } from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'

export const GET = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit

    const [list, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: req.user.id },
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    return ApiResponse.success(list, {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    })
  })
)

export const DELETE = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest) => {
    await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
        isRead: true,
      },
    })

    return ApiResponse.success({ message: 'Cleared all read notifications' })
  })
)
