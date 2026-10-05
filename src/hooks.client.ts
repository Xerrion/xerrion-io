import { dev } from '$app/environment'
import { page } from '$app/state'
import { env } from '$env/dynamic/public'
import type { HandleClientError } from '@sveltejs/kit'
import * as Sentry from '@sentry/sveltekit'

import { createMonitoringOptions } from '$lib/monitoring'

const options = createMonitoringOptions({
  dsn: env.PUBLIC_SENTRY_DSN,
  environment: env.PUBLIC_SENTRY_ENVIRONMENT || (dev ? 'development' : 'production'),
  release: env.PUBLIC_SENTRY_RELEASE
})

if (options.enabled) {
  Sentry.init({
    ...options,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration()
    ]
  })
  Sentry.setTag('runtime', 'browser')
  Sentry.addEventProcessor((event) => ({
    ...event,
    tags: {
      ...event.tags,
      // Route templates identify the page without sending dynamic parameter values.
      route: event.tags?.route ?? page.route.id ?? 'unmatched'
    }
  }))
}

const frameworkHandleError = Sentry.handleErrorWithSentry<HandleClientError>(({ message }) => ({ message }))

export const handleError: HandleClientError = (input) => {
  const { event, status, message } = input
  if (!options.enabled) {
    if (status >= 500) {
      console.error('[browser] Unexpected navigation failure', { route: event.route.id ?? 'unmatched', status })
    }
    return { message }
  }

  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'browser')
    scope.setTag('route', event.route.id ?? 'unmatched')
    scope.setTag('status', String(status))
    return frameworkHandleError(input)
  })
}
