import { describe, expect, test, mock } from 'bun:test'
import { createSign, generateKeyPairSync } from 'node:crypto'

import {
  parsePocketIdSettings,
  parseAdminSession,
  type PocketIdSettings
} from '$lib/server/pocket-id-policy'

mock.module('$env/dynamic/private', () => ({ env: {} }))
const { startPocketIdLogin, finishPocketIdLogin } =
  await import('$lib/server/pocket-id')

const settings: PocketIdSettings = {
  issuer: 'https://identity.example',
  clientId: 'test-client',
  clientSecret: 'test-only-secret',
  redirectUri: 'https://site.example/auth/pocket-id/callback',
  adminSubjects: ['admin-subject']
}
const configured = {
  POCKET_ID_ISSUER: settings.issuer,
  POCKET_ID_CLIENT_ID: settings.clientId,
  POCKET_ID_CLIENT_SECRET: settings.clientSecret,
  POCKET_ID_REDIRECT_URI: settings.redirectUri,
  POCKET_ID_ADMIN_SUBJECTS: 'admin-subject'
}
const session = {
  userId: 'pocket-id:admin-subject',
  username: 'Admin',
  provider: 'pocket-id' as const,
  subject: 'admin-subject',
  issuer: settings.issuer
}

describe('Pocket ID configuration and session policy', () => {
  test('unconfigured development keeps password sessions', () => {
    expect(parsePocketIdSettings({})).toBeNull()
    expect(
      parseAdminSession(
        JSON.stringify({ userId: 1, username: 'Admin' }),
        null,
        false
      )
    ).not.toBeNull()
  })
  test('partial configuration fails closed', () => {
    expect(() =>
      parsePocketIdSettings({ POCKET_ID_CLIENT_ID: 'client' })
    ).toThrow()
    expect(
      parseAdminSession(
        JSON.stringify({ userId: 1, username: 'Admin' }),
        null,
        true
      )
    ).toBeNull()
  })
  test('all settings are parsed without using email or username as authorization', () => {
    expect(parsePocketIdSettings(configured)).toEqual(settings)
    expect(parseAdminSession(JSON.stringify(session), settings, true)).toEqual(
      session
    )
  })
  test('HTTPS and exact callback path are required', () => {
    for (const value of [
      'http://identity.example',
      'https://user:password@identity.example',
      'https://identity.example?x=1'
    ]) {
      expect(() =>
        parsePocketIdSettings({ ...configured, POCKET_ID_ISSUER: value })
      ).toThrow()
    }
    expect(() =>
      parsePocketIdSettings({
        ...configured,
        POCKET_ID_REDIRECT_URI: 'https://site.example/admin'
      })
    ).toThrow()
    expect(() =>
      parsePocketIdSettings({ ...configured, POCKET_ID_ADMIN_SUBJECTS: ' , ' })
    ).toThrow()
  })
  test('password sessions are rejected when Pocket ID is enabled', () => {
    expect(
      parseAdminSession(
        JSON.stringify({ userId: 1, username: 'Admin' }),
        settings,
        true
      )
    ).toBeNull()
  })
  test('removed subjects and changed issuers revoke sessions', () => {
    expect(
      parseAdminSession(
        JSON.stringify(session),
        { ...settings, adminSubjects: [] },
        true
      )
    ).toBeNull()
    expect(
      parseAdminSession(
        JSON.stringify(session),
        { ...settings, issuer: 'https://other.example' },
        true
      )
    ).toBeNull()
    expect(parseAdminSession(JSON.stringify(session), null, false)).toBeNull()
  })
  test('malformed or inconsistent sessions are rejected', () => {
    for (const value of [
      'null',
      '{}',
      'broken',
      JSON.stringify({ ...session, userId: 1 }),
      JSON.stringify({ ...session, username: '' })
    ]) {
      expect(parseAdminSession(value, settings, true)).toBeNull()
    }
  })
})

const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const wrongKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = {
  ...keyPair.publicKey.export({ format: 'jwk' }),
  kid: 'test-key',
  alg: 'RS256',
  use: 'sig'
}

function fixture(
  overrides: Record<string, unknown> = {},
  invalidSignature = false,
  omitToken = false
) {
  const values = new Map<string, string>()
  let nonce = ''
  let verifier = ''
  let tokenCalls = 0
  const store = {
    async setex(key: string, ttl: number, value: string) {
      expect(ttl).toBe(600)
      values.set(key, value)
      const attempt = JSON.parse(value)
      nonce = attempt.nonce
      verifier = attempt.verifier
    },
    async getdel(key: string) {
      const value = values.get(key) ?? null
      values.delete(key)
      return value
    },
    async del(key: string) {
      values.delete(key)
    }
  }
  const fetcher = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString()
      if (url.endsWith('/.well-known/openid-configuration'))
        return Response.json({
          issuer: settings.issuer,
          authorization_endpoint: `${settings.issuer}/authorize`,
          token_endpoint: `${settings.issuer}/token`,
          jwks_uri: `${settings.issuer}/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_basic']
        })
      if (url.endsWith('/jwks')) return Response.json({ keys: [jwk] })
      if (url.endsWith('/token')) {
        tokenCalls++
        const body = new URLSearchParams(String(init?.body))
        expect(body.get('code_verifier')).toBe(verifier)
        expect(body.get('redirect_uri')).toBe(settings.redirectUri)
        expect(new Headers(init?.headers).get('authorization')).toStartWith(
          'Basic '
        )
        const now = Math.floor(Date.now() / 1000)
        const claims = {
          iss: settings.issuer,
          aud: settings.clientId,
          sub: 'admin-subject',
          iat: now,
          exp: now + 300,
          nonce,
          preferred_username: 'Test Admin',
          ...overrides
        }
        const data = [{ alg: 'RS256', kid: 'test-key' }, claims]
          .map((part) =>
            Buffer.from(JSON.stringify(part)).toString('base64url')
          )
          .join('.')
        const signature = createSign('RSA-SHA256')
          .update(data)
          .sign(
            invalidSignature ? wrongKeys.privateKey : keyPair.privateKey,
            'base64url'
          )
        return Response.json({
          access_token: 'test-only-access-token',
          token_type: 'Bearer',
          expires_in: 300,
          ...(omitToken ? {} : { id_token: `${data}.${signature}` })
        })
      }
      throw new Error('Unexpected test request')
    },
    { preconnect: fetch.preconnect }
  )
  return { store, fetcher, values, tokenCalls: () => tokenCalls }
}

async function begin(f: ReturnType<typeof fixture>) {
  const attempt = await startPocketIdLogin(settings, f.fetcher, f.store)
  const authorization = new URL(attempt.url)
  const callback = new URL(settings.redirectUri)
  callback.searchParams.set('state', authorization.searchParams.get('state')!)
  callback.searchParams.set('code', 'test-code')
  callback.searchParams.set('iss', settings.issuer)
  return { ...attempt, authorization, callback }
}

describe('Pocket ID authorization code flow', () => {
  test('uses PKCE, state, nonce, minimum scopes and one-use attempts', async () => {
    const f = fixture()
    const a = await begin(f)
    expect(a.authorization.searchParams.get('code_challenge_method')).toBe(
      'S256'
    )
    expect(a.authorization.searchParams.get('scope')).toBe('openid profile')
    expect(a.authorization.searchParams.get('nonce')).not.toBeEmpty()
    expect(a.id).toMatch(/^[a-f0-9]{64}$/)
    const user = await finishPocketIdLogin(
      settings,
      a.callback,
      a.id,
      f.fetcher,
      f.store
    )
    expect(user).toEqual({ subject: 'admin-subject', username: 'Test Admin' })
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
    expect(f.tokenCalls()).toBe(1)
  })
  test('rejects missing or expired browser attempts', async () => {
    const f = fixture()
    await expect(
      finishPocketIdLogin(
        settings,
        new URL(settings.redirectUri),
        undefined,
        f.fetcher,
        f.store
      )
    ).rejects.toThrow()
    const a = await begin(f)
    f.values.clear()
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
    expect(f.tokenCalls()).toBe(0)
  })
  test('rejects state mismatch and consumes the failed attempt', async () => {
    const f = fixture()
    const a = await begin(f)
    a.callback.searchParams.set('state', 'wrong')
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
    expect(f.tokenCalls()).toBe(0)
    expect(f.values.size).toBe(0)
  })
  test('rejects provider errors and callback host changes', async () => {
    const f = fixture()
    const a = await begin(f)
    a.callback.searchParams.delete('code')
    a.callback.searchParams.set('error', 'access_denied')
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
    const b = await begin(f)
    b.callback.hostname = 'other.example'
    await expect(
      finishPocketIdLogin(settings, b.callback, b.id, f.fetcher, f.store)
    ).rejects.toThrow()
  })
  for (const [name, claims] of Object.entries({
    'nonce mismatch': { nonce: 'wrong' },
    'wrong issuer': { iss: 'https://other.example' },
    'wrong audience': { aud: 'other-client' },
    'expired token': { exp: 1 },
    'unauthorized user': { sub: 'other-user' }
  })) {
    test(`rejects ${name}`, async () => {
      const f = fixture(claims)
      const a = await begin(f)
      await expect(
        finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
      ).rejects.toThrow()
    })
  }
  test('requires a valid token signature', async () => {
    const f = fixture({}, true)
    const a = await begin(f)
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
  })
  test('requires an ID token', async () => {
    const f = fixture({}, false, true)
    const a = await begin(f)
    await expect(
      finishPocketIdLogin(settings, a.callback, a.id, f.fetcher, f.store)
    ).rejects.toThrow()
  })
  test('rejects changed configuration during a login attempt', async () => {
    const f = fixture()
    const a = await begin(f)
    await expect(
      finishPocketIdLogin(
        { ...settings, clientId: 'other-client' },
        a.callback,
        a.id,
        f.fetcher,
        f.store
      )
    ).rejects.toThrow()
    expect(f.tokenCalls()).toBe(0)
  })
})
