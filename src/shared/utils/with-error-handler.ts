import { logger } from '@/lib/logger'
import { AppError } from '@/shared/errors'
import { ApiResponse } from './api-response'
import { ZodError } from 'zod'

export function withErrorHandler<T extends Request = Request>(
  handler: (req: any, ...args: any[]) => Promise<Response>
) {
  return async (req: T, ...args: any[]): Promise<Response> => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
        return ApiResponse.error('VALIDATION_ERROR', 'Validation failed', 400, details)
      }

      if (error instanceof AppError) {
        return ApiResponse.error(error.code, error.message, error.statusCode, error.details)
      }

      // Unexpected errors
      logger.error({ err: error, url: req.url }, 'Unhandled error in route handler')

      return ApiResponse.error('INTERNAL_ERROR', 'An unexpected error occurred', 500)
    }
  }
}
