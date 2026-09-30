import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

import {
  createPocketIdSession,
  SESSION_COOKIE,
  POCKET_ID_SESSION_TTL
} from '$lib/server/auth'
import { getPocketIdSettings } from '$lib/server/pocket-id-config'
import {
  finishPocketIdLogin,
  POCKET_ID_LOGIN_COOKIE,
  POCKET_ID_CALLBACK_PATH
} from '$lib/server/pocket-id'

export const GET: RequestHandler = async ({
  url,
  cookies,
  fetch,
  setHeaders
}) => {
  setHeaders({
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-robots-tag': 'noindex, nofollow'
  })
  const attemptId = cookies.get(POCKET_ID_LOGIN_COOKIE)
  cookies.delete(POCKET_ID_LOGIN_COOKIE, { path: POCKET_ID_CALLBACK_PATH })
  try {
    const settings = getPocketIdSettings()
    if (!settings) throw new Error('Pocket ID is not configured')
    const identity = await finishPocketIdLogin(settings, url, attemptId, fetch)
    const sessionId = await createPocketIdSession(
      identity.subject,
      identity.username
    )
    cookies.set(SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: POCKET_ID_SESSION_TTL
    })
  } catch {
    // Provider errors may contain tokens or personal data. Do not log the error object.
    console.error('Pocket ID sign-in was rejected')
    redirect(303, '/admin/login?error=sign-in')
  }
  redirect(303, '/admin')
}
