import { createClient } from 'redis'

const globalForRedis = global as unknown as { redis: ReturnType<typeof createClient> }

export const redis =
  globalForRedis.redis ||
  createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  })

// Only connect at runtime, not during build
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  if (!redis.isOpen) {
    redis.connect().catch(console.error)
  }
}

// Connect in production on first use
let connecting = false
export async function ensureRedisConnected() {
  if (!redis.isOpen && !connecting) {
    connecting = true
    await redis.connect()
    connecting = false
  }
}

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
