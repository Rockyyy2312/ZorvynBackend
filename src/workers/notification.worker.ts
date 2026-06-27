import { Worker } from 'bullmq'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { Redis } from 'ioredis'
import { env } from '../lib/env'
import { NotificationType } from '@prisma/client'

const workerConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const notificationWorker = new Worker(
  'notification-queue',
  async (job) => {
    const { userId, type, title, body, data } = job.data

    logger.info({ jobId: job.id, userId, type }, 'Processing notification job')

    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: type as NotificationType,
          title,
          body,
          data: data || null,
        },
      })

      logger.info({ jobId: job.id, notificationId: notification.id }, 'Notification persisted successfully')
      return { notificationId: notification.id }
    } catch (error) {
      logger.error({ err: error, jobId: job.id }, 'Failed to persist notification in database')
      throw error
    }
  },
  {
    connection: workerConnection as any,
    concurrency: 10,
  }
)

notificationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Notification job failed')
})
