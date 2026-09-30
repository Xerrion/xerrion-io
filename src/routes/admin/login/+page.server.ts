import type { Actions, PageServerLoad } from './$types'
import { fail, redirect, isRedirect } from '@sveltejs/kit'
import {
  verifyPassword,
  createSession,
  deleteSession,
  getUserByUsername,
  SESSION_COOKIE
} from '$lib/server/auth'
import { superValidate, setError } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { loginSchema } from '$lib/schemas/admin'
import {
  getPocketIdSettings,
  pocketIdEnabled
} from '$lib/server/pocket-id-config'
import {
  startPocketIdLogin,
  POCKET_ID_LOGIN_COOKIE,
  POCKET_ID_CALLBACK_PATH,
  POCKET_ID_LOGIN_TTL
} from '$lib/server/pocket-id'

export const load: PageServerLoad = async ({ url }) => {
  let loginError: string | null = url.searchParams.has('error')
    ? 'Sign-in failed. Please try again.'
    : null
  const usePocketId = pocketIdEnabled()
  if (usePocketId) {
    try {
      const settings = getPocketIdSettings()!
      const origin = new URL(settings.redirectUri).origin
      if (url.origin !== origin) redirect(302, `${origin}/admin/login`)
    } catch (error) {
      if (isRedirect(error)) throw error
      loginError = 'Sign-in is unavailable. Please try again later.'
      console.error('Pocket ID configuration is invalid')
    }
  }
  return {
    form: await superValidate(zod4(loginSchema)),
    usePocketId,
    loginError
  }
}

export const actions: Actions = {
  pocketId: async ({ cookies, fetch, url }) => {
    let destination: string
    try {
      const settings = getPocketIdSettings()
      if (!settings) throw new Error('Pocket ID is not configured')
      const origin = new URL(settings.redirectUri).origin
      if (url.origin !== origin) redirect(303, `${origin}/admin/login`)
      const attempt = await startPocketIdLogin(settings, fetch)
      cookies.set(POCKET_ID_LOGIN_COOKIE, attempt.id, {
        path: POCKET_ID_CALLBACK_PATH,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: POCKET_ID_LOGIN_TTL
      })
      destination = attempt.url
    } catch (error) {
      if (isRedirect(error)) throw error
      console.error('Pocket ID sign-in could not start')
      return fail(503, {
        loginError: 'Sign-in is unavailable. Please try again later.'
      })
    }
    redirect(303, destination)
  },
  login: async ({ request, cookies }) => {
    if (pocketIdEnabled())
      return fail(403, { loginError: 'Use Pocket ID to sign in.' })
    const form = await superValidate(request, zod4(loginSchema))

    if (!form.valid) {
      return fail(400, { form })
    }

    const { username, password } = form.data

    const user = await getUserByUsername(username)

    if (!user) {
      return setError(form, 'username', 'Invalid credentials')
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password)

    if (!isPasswordValid) {
      return setError(form, 'username', 'Invalid credentials')
    }

    const sessionId = await createSession(user.id, user.username)

    cookies.set(SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })

    redirect(302, '/admin')
  },

  logout: async ({ cookies, locals }) => {
    const sessionId = locals.sessionId
    if (sessionId) {
      await deleteSession(sessionId)
    }

    cookies.delete(SESSION_COOKIE, { path: '/' })
    redirect(302, '/admin/login')
  }
}
