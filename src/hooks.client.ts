import { dev } from '$app/environment'
import { env } from '$env/dynamic/public'
import type { HandleClientError } from '@sveltejs/kit'
import * as Sentry from '@sentry/browser'

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
}

export const handleError: HandleClientError = ({ error, event, status, message }) => {
  if (status >= 500) {
    if (options.enabled) {
      Sentry.withScope((scope) => {
        scope.setTag('runtime', 'browser')
        scope.setTag('route', event.route.id ?? 'unmatched')
        scope.setTag('status', String(status))
        Sentry.captureException(error)
      })
    } else {
      console.error('[browser] Unexpected navigation failure', { route: event.route.id ?? 'unmatched', status })
    }
  }

  return { message }
}
