import { hash, verify } from '@node-rs/argon2'
import crypto from 'node:crypto'

import { getPrisma } from './db'
import { getRedis } from './redis'
import { getPocketIdSettings, pocketIdEnabled } from './pocket-id-config'
import { parseAdminSession, type SessionData } from './pocket-id-policy'

export const SESSION_COOKIE = 'session'
const SESSION_TTL_SECONDS = 604800 // 7 days

export type { SessionData } from './pocket-id-policy'
export const POCKET_ID_SESSION_TTL = 8 * 60 * 60

export async function hashPassword(password: string): Promise<string> {
  return hash(password)
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  return verify(hashedPassword, password)
}

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

export async function validateSession(
  sessionId: string
): Promise<SessionData | null> {
  if (!/^[a-f0-9]{64}$/.test(sessionId)) return null
  const redis = getRedis()
  const value = await redis.get(`session:${sessionId}`)
  if (!value) return null
  try {
    const session = parseAdminSession(
      value,
      getPocketIdSettings(),
      pocketIdEnabled()
    )
    if (!session) await redis.del(`session:${sessionId}`)
    return session
  } catch {
    await redis.del(`session:${sessionId}`)
    return null
  }
}

export async function createPocketIdSession(
  subject: string,
  username: string
): Promise<string> {
  const settings = getPocketIdSettings()
  if (!settings || !settings.adminSubjects.includes(subject))
    throw new Error('Admin access denied')
  const sessionId = crypto.randomBytes(32).toString('hex')
  const session: SessionData = {
    userId: `pocket-id:${subject}`,
    username,
    provider: 'pocket-id',
    subject,
    issuer: settings.issuer
  }
  await getRedis().setex(
    `session:${sessionId}`,
    POCKET_ID_SESSION_TTL,
    JSON.stringify(session)
  )
  return sessionId
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return
  const redis = getRedis()
  await redis.del(`session:${sessionId}`)
}

export async function getUserByUsername(
  username: string
): Promise<{ id: number; username: string; passwordHash: string } | null> {
  if (!username) return null
  const prisma = getPrisma()
  return prisma.adminUser.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true }
  })
}
