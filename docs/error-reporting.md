# Error reporting

The app uses the Sentry browser SDK and the Sentry Bun SDK. Both can send errors to Sentry or GlitchTip.

Set these runtime environment variables in the deployment configuration:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SENTRY_DSN` | DSN for browser errors. Also used by the server unless overridden. |
| `SENTRY_DSN` | Optional DSN for server errors. |
| `PUBLIC_SENTRY_ENVIRONMENT` | Environment label, such as `production` or `preview`. Defaults to `development` in the dev server and `production` in a production build. |
| `PUBLIC_SENTRY_RELEASE` | Optional release identifier, such as a commit SHA. |

Use the DSN from the monitoring project. Keep it in deployment configuration. A browser DSN contains a public ingestion key and is visible to browsers. It does not grant access to the monitoring dashboard.

Missing DSNs disable reporting. Unexpected request and navigation errors still produce a console message with the route identifier and HTTP status. DSNs do not need to be present during the build. Set preview variables in Coolify's Preview group and production variables in the production app. Use the `preview` environment label for previews.

The browser reports unhandled exceptions, unhandled promise rejections, and unexpected SvelteKit navigation errors. The server reports unexpected SvelteKit errors and Bun process errors. Expected responses below HTTP 500 are not reported by the SvelteKit error hooks. Authentication and admin response headers keep their existing behavior.

Errors caught by application code require an explicit call. Server code can use `captureServerError(error, routeId)` from `$lib/server/monitoring`. Pass a fixed route identifier, such as `/(public)/gallery`, rather than a request URL or user value.

Reporting excludes sessions, tracing, replay, profiling, logs, metrics, and breadcrumbs. The final event filter removes users, request headers, bodies, cookies, query parameters, arbitrary context data, and frame variables. It strips URL credentials, query parameters, and fragments from error messages and stack frames. Do not place passwords, tokens, or personal data in exception messages.

GlitchTip supports Sentry error ingestion. Source map upload is a separate feature and needs a GlitchTip API token, organization slug, and project slug. The DSN alone does not supply these values. See the [GlitchTip CLI documentation](https://glitchtip.com/documentation/cli/#source-maps) for optional source map upload.

Run `bun run test`, `bun run check`, `bun run build`, and `bunx playwright test --config tests/monitoring/playwright.config.ts` before deployment. The monitoring browser test starts a separate dev server and intercepts error delivery to a fake endpoint. Validate a synthetic error in the chosen monitoring project after configuring the DSN.
