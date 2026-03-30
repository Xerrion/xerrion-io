import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '$env/dynamic/private'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

/**
 * Get the Drizzle database instance (singleton).
 * Lazily initialized on first call.
 */
export function getDb() {
  if (_db) return _db

  const url = env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const sql = postgres(url, { max: 10 })
  _db = drizzle(sql, { schema, casing: 'snake_case' })
  return _db
}
