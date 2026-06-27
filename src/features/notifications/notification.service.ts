import { prisma } from '@/lib/prisma'
import { notificationQueue } from '@/lib/queue'
import { logger } from '@/lib/logger'
import { NotificationType } from '@prisma/client'

export class NotificationService {
  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any
  ) {
    try {
      // 1. Asynchronous push to queue
      await notificationQueue.add('send-notification', {
        userId,
        type,
        title,
        body,
        data,
      })
      logger.info({ userId, type }, 'Asynchronously queued notification')
      return { status: 'queued' }
    } catch (error) {
      logger.warn(
        { err: error, userId, type },
        'BullMQ queue error. Falling back to inline database notification.'
      )

      // 2. Fail-open synchronous fallback in database
      try {
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            body,
            data: data || null,
            isRead: false,
          },
        })
        return notification
      } catch (dbError) {
        logger.error({ err: dbError, userId }, 'Failed to persist fallback inline notification')
        return null
      }
    }
  }
}

export const notificationService = new NotificationService()
