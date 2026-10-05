import type { Handle, HandleServerError } from '@sveltejs/kit'
import { isHttpError } from '@sveltejs/kit'
import * as Sentry from '@sentry/sveltekit'

import { validateSession, SESSION_COOKIE } from '$lib/server/auth'
import { captureServerError, monitoringEnabled } from '$lib/server/monitoring'

const authHandle: Handle = async ({ event, resolve }) => {
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

const frameworkHandle = Sentry.sentryHandle({ injectFetchProxyScript: false })
const frameworkHandleError = Sentry.handleErrorWithSentry<HandleServerError>(({ message }) => ({ message }))

export const handle: Handle = ({ event, resolve }) => {
  if (!monitoringEnabled) return authHandle({ event, resolve })

  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'bun')
    scope.setTag('route', event.route.id ?? 'unmatched')
    return frameworkHandle({
      event,
      resolve: async (request, options) => {
        try {
          return await authHandle({
            event: request,
            resolve: (authenticatedEvent) => resolve(authenticatedEvent, options)
          })
        } catch (error) {
          // sentryHandle captures escaping errors before Kit invokes handleError.
          if (request.route.id) {
            Sentry.getIsolationScope().setTag('status', String(isHttpError(error) ? error.status : 500))
          }
          throw error
        }
      }
    })
  })
}

export const handleError: HandleServerError = (input) => {
  const { error, event, status, message } = input
  if (!monitoringEnabled) {
    captureServerError(error, event.route.id, status)
    return { message }
  }

  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'bun')
    scope.setTag('route', event.route.id ?? 'unmatched')
    scope.setTag('status', String(status))
    return frameworkHandleError(input)
  })
}
