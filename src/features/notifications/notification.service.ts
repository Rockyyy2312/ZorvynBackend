import { prisma } from '@/lib/prisma'
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
      return await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data || null,
          isRead: false,
        },
      })
    } catch (error) {
      console.error('Failed to create in-app notification:', error)
      return null
    }
  }
}

export const notificationService = new NotificationService()
