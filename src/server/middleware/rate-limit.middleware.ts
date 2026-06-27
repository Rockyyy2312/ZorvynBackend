import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

interface RateLimitConfig {
  windowSeconds: number
  maxRequests: number
  keyPrefix: string
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rl:${config.keyPrefix}:${identifier}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - config.windowSeconds

  try {
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.zcard(key)
    pipeline.expire(key, config.windowSeconds)

    const results = await pipeline.exec()

    if (!results) {
      return { allowed: true, remaining: config.maxRequests, resetAt: now + config.windowSeconds }
    }

    // ioredis execution results are in format: [err, result] for each pipeline command
    const cardResult = results[2]
    const requestCount = cardResult ? (cardResult[1] as number) : 1

    const allowed = requestCount <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - requestCount)
    const resetAt = now + config.windowSeconds

    return { allowed, remaining, resetAt }
  } catch (error) {
    // Fail-open strategy: log error and allow request
    logger.error({ err: error, keyPrefix: config.keyPrefix, identifier }, 'Rate limit check failed (fail-open)')
    return { allowed: true, remaining: 1, resetAt: now + config.windowSeconds }
  }
}

// Rate limit configs
export const RATE_LIMITS = {
  AUTH: { windowSeconds: 900, maxRequests: 5, keyPrefix: 'auth' },
  FREE_USER: { windowSeconds: 60, maxRequests: 100, keyPrefix: 'user' },
  PREMIUM_USER: { windowSeconds: 60, maxRequests: 300, keyPrefix: 'user' },
  AI_CHAT: { windowSeconds: 60, maxRequests: 10, keyPrefix: 'ai' },
  UNAUTHENTICATED: { windowSeconds: 60, maxRequests: 20, keyPrefix: 'ip' },
}
