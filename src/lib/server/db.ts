import { PrismaClient } from '@prisma/client'
import { env } from '$env/dynamic/private'

let _prisma: PrismaClient | null = null

/**
 * Get the PrismaClient instance (singleton).
 * Lazily initialized on first call.
 */
export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  _prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })
  return _prisma
}
