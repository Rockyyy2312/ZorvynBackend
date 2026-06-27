import { Worker } from 'bullmq'
import { resend } from '../lib/resend'
import { logger } from '../lib/logger'
import { Redis } from 'ioredis'
import { env } from '../lib/env'

const workerConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { to, subject, html, text } = job.data

    logger.info({ jobId: job.id, to, subject }, 'Processing email job')

    if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 're_mock_api_key_for_testing') {
      logger.info({ to, subject }, 'Resend API key is unconfigured or mock. Logging email payload.')
      return { status: 'mocked' }
    }

    try {
      const response = await resend.emails.send({
        from: 'FinanceFlow <noreply@financeflow.com>',
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
      })

      if (response.error) {
        throw new Error(`Resend error: ${JSON.stringify(response.error)}`)
      }

      logger.info({ jobId: job.id, emailId: response.data?.id }, 'Email sent successfully')
      return { emailId: response.data?.id }
    } catch (error) {
      logger.error({ err: error, jobId: job.id }, 'Failed to send email via Resend')
      throw error
    }
  },
  {
    connection: workerConnection as any,
    concurrency: 5,
  }
)

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Email job failed')
})
