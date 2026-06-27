import { prisma } from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth.middleware'
import { ApiResponse } from '@/shared/utils/api-response'
import { withErrorHandler } from '@/shared/utils/with-error-handler'
import { NotFoundError } from '@/shared/errors'

export const PATCH = withAuth(
  withErrorHandler(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    })

    if (!notification) {
      throw new NotFoundError('Notification', id)
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return ApiResponse.success(updated)
  })
)
