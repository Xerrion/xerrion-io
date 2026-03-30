import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
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

export const load: PageServerLoad = async () => {
  return {
    form: await superValidate(zod4(loginSchema))
  }
}

export const actions: Actions = {
  login: async ({ request, cookies }) => {
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
