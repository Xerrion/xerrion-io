import { dev } from '$app/environment'
import { env as privateEnv } from '$env/dynamic/private'
import { env as publicEnv } from '$env/dynamic/public'
import * as Sentry from '@sentry/bun'

import { createMonitoringOptions } from '$lib/monitoring'

const options = createMonitoringOptions({
  dsn: privateEnv.SENTRY_DSN || publicEnv.PUBLIC_SENTRY_DSN,
  environment: publicEnv.PUBLIC_SENTRY_ENVIRONMENT || (dev ? 'development' : 'production'),
  release: publicEnv.PUBLIC_SENTRY_RELEASE
})

if (options.enabled) {
  Sentry.init({
    ...options,
    enableOpenTelemetrySetup: false,
    includeServerName: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration()
    ]
  })
  Sentry.setTag('runtime', 'bun')
}

/** Keep monitoring scope separate for each request. */
export async function withRequestMonitoring<T>(
  route: string | null,
  callback: () => T | Promise<T>
): Promise<T> {
  if (!options.enabled) return callback()

  return Sentry.withIsolationScope(async (scope) => {
    scope.setTag('runtime', 'bun')
    scope.setTag('route', route ?? 'unmatched')
    return callback()
  })
}

/** Report unexpected server failures without request or session data. */
export function captureServerError(
  error: unknown,
  route: string | null,
  status = 500
): void {
  if (status < 500) return
  if (!options.enabled) {
    console.error('[server] Unexpected request failure', { route: route ?? 'unmatched', status })
    return
  }

  Sentry.withIsolationScope((scope) => {
    scope.setTag('runtime', 'bun')
    scope.setTag('route', route ?? 'unmatched')
    scope.setTag('status', String(status))
    Sentry.captureException(error)
  })
}
