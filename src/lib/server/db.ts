import { PrismaClient } from '$lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '$env/dynamic/private'

let _prisma: PrismaClient | null = null

/**
 * Get the PrismaClient instance (singleton).
 * Lazily initialized on first call.
 */
export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  _prisma = new PrismaClient({ adapter })
  return _prisma
}
