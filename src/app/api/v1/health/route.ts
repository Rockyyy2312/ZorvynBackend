import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  let databaseStatus = 'UP'
  let redisStatus = 'UP'
  let isHealthy = true

  // 1. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    console.error('Healthcheck DB error:', err)
    databaseStatus = 'DOWN'
    isHealthy = false
  }

  // 2. Check Redis
  try {
    const ping = await redis.ping()
    if (ping !== 'PONG') {
      redisStatus = 'DOWN'
      isHealthy = false
    }
  } catch (err) {
    console.error('Healthcheck Redis error:', err)
    redisStatus = 'DOWN'
    isHealthy = false
  }

  const payload = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      database: databaseStatus,
      redis: redisStatus,
    },
  }

  return NextResponse.json(
    payload,
    { status: isHealthy ? 200 : 503 }
  )
}
