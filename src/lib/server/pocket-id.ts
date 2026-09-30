import * as oidc from 'openid-client'

import type { PocketIdSettings } from './pocket-id-policy'
import { getRedis } from './redis'

export const POCKET_ID_LOGIN_COOKIE = 'pocket-id-login'
export const POCKET_ID_CALLBACK_PATH = '/auth/pocket-id/callback'
export const POCKET_ID_LOGIN_TTL = 10 * 60

export interface LoginAttempt {
  state: string
  nonce: string
  verifier: string
  issuer: string
  clientId: string
  redirectUri: string
}

export interface LoginStore {
  setex(key: string, ttl: number, value: string): Promise<unknown>
  getdel(key: string): Promise<string | null>
}

async function configuration(
  settings: PocketIdSettings,
  fetcher: typeof fetch
): Promise<oidc.Configuration> {
  return oidc.discovery(
    new URL(settings.issuer),
    settings.clientId,
    { id_token_signed_response_alg: 'RS256' },
    oidc.ClientSecretBasic(settings.clientSecret),
    {
      [oidc.customFetch]: (url, options) =>
        fetcher(url, {
          ...options,
          credentials: 'omit',
          body:
            options.body instanceof Uint8Array
              ? new Uint8Array(options.body).buffer
              : options.body
        }),
      execute: [oidc.enableNonRepudiationChecks],
      timeout: 10
    }
  )
}

export async function startPocketIdLogin(
  settings: PocketIdSettings,
  fetcher: typeof fetch,
  store: LoginStore = getRedis()
): Promise<{ id: string; url: string }> {
  const config = await configuration(settings, fetcher)
  const attempt: LoginAttempt = {
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    verifier: oidc.randomPKCECodeVerifier(),
    issuer: settings.issuer,
    clientId: settings.clientId,
    redirectUri: settings.redirectUri
  }
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: settings.redirectUri,
    scope: 'openid profile',
    response_mode: 'query',
    code_challenge: await oidc.calculatePKCECodeChallenge(attempt.verifier),
    code_challenge_method: 'S256',
    state: attempt.state,
    nonce: attempt.nonce
  })
  const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    'hex'
  )
  await store.setex(
    `oidc-login:${id}`,
    POCKET_ID_LOGIN_TTL,
    JSON.stringify(attempt)
  )
  return { id, url: url.href }
}

export async function finishPocketIdLogin(
  settings: PocketIdSettings,
  url: URL,
  id: string | undefined,
  fetcher: typeof fetch,
  store: LoginStore = getRedis()
): Promise<{ subject: string; username: string }> {
  if (!id || !/^[a-f0-9]{64}$/.test(id))
    throw new Error('Missing login attempt')
  // Consume the attempt atomically. A replay cannot use the same browser session.
  const value = await store.getdel(`oidc-login:${id}`)
  if (!value) throw new Error('Login attempt expired')
  const attempt: LoginAttempt = JSON.parse(value)
  if (
    attempt.issuer !== settings.issuer ||
    attempt.clientId !== settings.clientId ||
    attempt.redirectUri !== settings.redirectUri ||
    typeof attempt.state !== 'string' ||
    !attempt.state ||
    typeof attempt.nonce !== 'string' ||
    !attempt.nonce ||
    typeof attempt.verifier !== 'string' ||
    !attempt.verifier
  ) {
    throw new Error('Invalid login attempt')
  }
  if (url.origin + url.pathname !== settings.redirectUri)
    throw new Error('Invalid callback URL')
  const config = await configuration(settings, fetcher)
  const tokens = await oidc.authorizationCodeGrant(config, url, {
    expectedState: attempt.state,
    expectedNonce: attempt.nonce,
    pkceCodeVerifier: attempt.verifier,
    idTokenExpected: true
  })
  const claims = tokens.claims()
  if (!claims || !settings.adminSubjects.includes(claims.sub))
    throw new Error('Admin access denied')
  const name = claims.preferred_username ?? claims.name
  const username =
    typeof name === 'string' && name.trim()
      ? name.trim().slice(0, 128)
      : 'Admin'
  return { subject: claims.sub, username }
}
