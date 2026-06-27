import { emailWorker } from './email.worker'
import { notificationWorker } from './notification.worker'
import { logger } from '../lib/logger'

logger.info('🚀 Background workers process started.')

// Handle graceful shutdowns
const shutdown = async () => {
  logger.info('Shutting down workers gracefully...')
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
  ])
  logger.info('Workers closed.')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
