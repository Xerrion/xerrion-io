import { hash, verify } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'

import { getDb } from './db'
import { getRedis } from './redis'
import { adminUser } from './schema'

export const SESSION_COOKIE = 'session'

const SESSION_TTL_SECONDS = 604800 // 7 days

// ---------------------------------------------------------------------------
// SessionData - the shape stored in Redis and returned to callers
// ---------------------------------------------------------------------------

export interface SessionData {
  userId: number
  username: string
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return hash(password)
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  return verify(hashedPassword, password)
}

// ---------------------------------------------------------------------------
// Session management (Redis-backed)
// ---------------------------------------------------------------------------

/**
 * Create a new session for the given user and store it in Redis.
 * Returns the session ID (to be stored in the cookie).
 */
export async function createSession(
  userId: number,
  username: string
): Promise<string> {
  const redis = getRedis()
  const sessionId = crypto.randomBytes(32).toString('hex')

  await redis.setex(
    `session:${sessionId}`,
    SESSION_TTL_SECONDS,
    JSON.stringify({ userId, username })
  )

  return sessionId
}

/**
 * Validate a session ID. Returns the session data if valid, null if not found
 * or expired. Redis TTL handles expiry automatically.
 */
export async function validateSession(
  sessionId: string
): Promise<SessionData | null> {
  if (!sessionId) return null

  const redis = getRedis()
  const value = await redis.get(`session:${sessionId}`)

  if (!value) return null

  try {
    return JSON.parse(value) as SessionData
  } catch {
    // Corrupt session data - evict and treat as invalid
    await redis.del(`session:${sessionId}`)
    return null
  }
}

/**
 * Delete a session from Redis (logout).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return

  const redis = getRedis()
  await redis.del(`session:${sessionId}`)
}

// ---------------------------------------------------------------------------
// User lookup (Drizzle)
// ---------------------------------------------------------------------------

/**
 * Look up an admin user by username.
 * Returns the user row or null if not found.
 */
export async function getUserByUsername(
  username: string
): Promise<{ id: number; username: string; passwordHash: string } | null> {
  if (!username) return null

  const db = getDb()
  const rows = await db
    .select({
      id: adminUser.id,
      username: adminUser.username,
      passwordHash: adminUser.passwordHash
    })
    .from(adminUser)
    .where(eq(adminUser.username, username))
    .limit(1)

  if (rows.length === 0) return null

  return rows[0]
}
