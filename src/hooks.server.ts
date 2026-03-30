import type { Handle } from '@sveltejs/kit'
import { validateSession, SESSION_COOKIE } from '$lib/server/auth'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null
  event.locals.sessionId = null

  const sessionId = event.cookies.get(SESSION_COOKIE)

  if (sessionId) {
    const session = await validateSession(sessionId)
    if (session) {
      event.locals.user = { id: session.userId, username: session.username }
      event.locals.sessionId = sessionId
    } else {
      event.cookies.delete(SESSION_COOKIE, { path: '/' })
    }
  }

  const response = await resolve(event)

  if (event.url.pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}
