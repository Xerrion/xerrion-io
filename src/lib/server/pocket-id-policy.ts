export interface PocketIdSettings {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  adminSubjects: string[]
}

const keys = [
  'POCKET_ID_ISSUER',
  'POCKET_ID_CLIENT_ID',
  'POCKET_ID_CLIENT_SECRET',
  'POCKET_ID_REDIRECT_URI',
  'POCKET_ID_ADMIN_SUBJECTS'
] as const

export function hasPocketIdSettings(
  values: Record<string, string | undefined>
): boolean {
  return keys.some((key) => Boolean(values[key]?.trim()))
}

export function parsePocketIdSettings(
  values: Record<string, string | undefined>
): PocketIdSettings | null {
  if (!hasPocketIdSettings(values)) return null
  for (const key of keys) {
    if (!values[key]?.trim())
      throw new Error(`Missing environment variable: ${key}`)
  }
  const issuer = new URL(values.POCKET_ID_ISSUER!.trim())
  const callback = new URL(values.POCKET_ID_REDIRECT_URI!.trim())
  for (const url of [issuer, callback]) {
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        'Pocket ID URLs must use HTTPS without credentials, queries, or fragments'
      )
    }
  }
  if (callback.pathname !== '/auth/pocket-id/callback') {
    throw new Error('Pocket ID callback must use /auth/pocket-id/callback')
  }
  const adminSubjects = values
    .POCKET_ID_ADMIN_SUBJECTS!.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!adminSubjects.length)
    throw new Error('Pocket ID requires at least one admin subject')
  return {
    issuer: issuer.href.replace(/\/$/, ''),
    clientId: values.POCKET_ID_CLIENT_ID!.trim(),
    clientSecret: values.POCKET_ID_CLIENT_SECRET!.trim(),
    redirectUri: callback.href,
    adminSubjects
  }
}

export interface SessionData {
  userId: number | string
  username: string
  provider?: 'pocket-id'
  subject?: string
  issuer?: string
}

export function parseAdminSession(
  value: string,
  settings: PocketIdSettings | null,
  pocketIdEnabled: boolean
): SessionData | null {
  try {
    const session: unknown = JSON.parse(value)
    if (typeof session !== 'object' || session === null) return null
    const data = session as Record<string, unknown>
    if (
      typeof data.username !== 'string' ||
      !data.username.trim() ||
      data.username.length > 128
    )
      return null
    if (data.provider === 'pocket-id') {
      if (
        !settings ||
        typeof data.subject !== 'string' ||
        !settings.adminSubjects.includes(data.subject) ||
        data.issuer !== settings.issuer ||
        data.userId !== `pocket-id:${data.subject}`
      )
        return null
      return {
        userId: data.userId,
        username: data.username,
        provider: 'pocket-id',
        subject: data.subject,
        issuer: settings.issuer
      }
    }
    if (
      pocketIdEnabled ||
      data.provider !== undefined ||
      typeof data.userId !== 'number' ||
      !Number.isSafeInteger(data.userId) ||
      data.userId <= 0
    )
      return null
    return { userId: data.userId, username: data.username }
  } catch {
    return null
  }
}
