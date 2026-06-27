import { Queue } from 'bullmq'
import { redis } from './redis'
import { logger } from './logger'

export const emailQueue = new Queue('email-queue', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

export const notificationQueue = new Queue('notification-queue', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

logger.info('BullMQ Queues initialized.')
