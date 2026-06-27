import { z } from 'zod'

/**
 * Environment variable schema — validated at startup.
 * If any required secret is missing, the app crashes immediately
 * with a clear error message, never silently at runtime.
 *
 * See: docs/08_SECURITY.md §6
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().url().optional().default('redis://localhost:6379'),

  // Auth
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Google OAuth (optional in dev)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  // Razorpay (payments)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // AWS S3 (receipt uploads)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional().default('ap-south-1'),

  // OpenAI (AI assistant)
  OPENAI_API_KEY: z.string().optional(),

  // Sentry (error tracking)
  SENTRY_DSN: z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors
        .map((e) => `  ✗ ${e.path.join('.')}: ${e.message}`)
        .join('\n')
      throw new Error(
        `\n❌ Environment validation failed:\n${missing}\n\nPlease check your .env file.\n`
      )
    }
    throw error
  }
}

export const env = validateEnv()
