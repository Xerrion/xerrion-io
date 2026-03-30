import Redis from 'ioredis'
import { env } from '$env/dynamic/private'

let _redis: Redis | null = null

/**
 * Get the Redis client instance (singleton).
 * Lazily initialized on first call.
 */
export function getRedis(): Redis {
  if (_redis) return _redis

  const url = env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not set')

  _redis = new Redis(url, {
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  })

  return _redis
}
