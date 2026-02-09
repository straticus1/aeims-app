import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'healthy', responseTime: Date.now() - startTime }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }

  // Check Redis connectivity
  try {
    const redisStart = Date.now()
    await redis.ping()
    checks.redis = { status: 'healthy', responseTime: Date.now() - redisStart }
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Overall health status
  const allHealthy = Object.values(checks).every((check: any) => check.status === 'healthy')
  const status = allHealthy ? 'healthy' : 'degraded'

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  }, {
    status: allHealthy ? 200 : 503
  })
}
