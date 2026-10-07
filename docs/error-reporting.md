# Error reporting

The app uses `@sentry/sveltekit` for browser and server error handling. The deployed server runs on Bun with `svelte-adapter-bun`. Sentry does not list this adapter as officially supported, so compatibility checks use the actual Bun build and SDK transports.

Set these runtime environment variables in the deployment configuration:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SENTRY_DSN` | DSN for browser errors. Also used by the server unless overridden. |
| `SENTRY_DSN` | Optional DSN for server errors. |
| `PUBLIC_SENTRY_ENVIRONMENT` | Environment label, such as `production` or `preview`. Defaults to `development` in the dev server and `production` in a production build. |
| `PUBLIC_SENTRY_RELEASE` | Optional release identifier, such as a commit SHA. |

Use the DSN from the Sentry project. Replace both runtime DSNs when migrating to a different project. Keep it in deployment configuration. A browser DSN contains a public ingestion key and is visible to browsers. It does not grant access to the monitoring dashboard.

Missing DSNs disable reporting. Unexpected request and navigation errors still produce a console message with the route identifier and HTTP status. DSNs do not need to be present during the build. Set preview variables in Coolify's Preview group and production variables in the production app. Use the `preview` environment label for previews.

The browser reports unhandled exceptions, unhandled promise rejections, and unexpected SvelteKit navigation errors. Browser errors include the SvelteKit route template. The server reports unexpected SvelteKit errors and process errors. Expected responses below HTTP 500 are not reported by the SvelteKit error hooks. Authentication and admin response headers keep their existing behavior.

Errors caught by application code require an explicit call. Server code can use `captureServerError(error, routeId)` from `$lib/server/monitoring`. Pass a fixed route identifier, such as `/(public)/gallery`, rather than a request URL or user value.

Reporting excludes sessions, tracing, replay, profiling, logs, metrics, and breadcrumbs. The final event filter removes users, request headers, bodies, cookies, query parameters, arbitrary context data, and frame variables. When the server SDK supplies a source snippet, it keeps up to five surrounding lines from application files. Large compiled files can exceed the SDK's snippet limit; uploaded source maps provide the original source context in Sentry. It strips URL credentials, query parameters, and fragments from error messages and stack frames. Do not place passwords, tokens, or personal data in source code or exception messages.

Source maps connect compiled stack frames to the original TypeScript and Svelte files. The build prepares maps after the Bun adapter finishes its final bundle. It flattens the map chain, injects matching debug IDs, and moves browser maps outside the public asset directory. It also refreshes precompressed JavaScript copies after injection.

Set these build environment variables to upload the final maps to Sentry:

| Variable | Purpose |
| --- | --- |
| `SENTRY_AUTH_TOKEN` | Sentry auth token with source map upload permission. Use a secret store that does not expose it in build logs. |
| `SENTRY_URL` | Optional Sentry API URL. Defaults to `https://sentry.io`. Override for a self-hosted Sentry instance. |
| `SENTRY_ORG` | Organization slug. |
| `SENTRY_PROJECT` | Project slug. The display name can differ from the slug. |

Use the Sentry organization and project slugs from the dashboard URL. The DSN contains numeric IDs and cannot replace these slugs. A token from another monitoring service cannot authenticate with Sentry.

The DSN permits error ingestion. It cannot upload source maps. Without a build token, the build prepares maps locally and prints an upload-skip message. A configured upload failure stops the build. A successful upload confirms that Sentry accepted the artifacts; Sentry processes them afterward. Do not mark these build variables as available to browsers or runtime containers. See the [Sentry source map documentation](https://docs.sentry.io/platforms/javascript/guides/sveltekit/sourcemaps/).

For Coolify 4.3.23, leave the upload token unset. Its deployment command logs can retain the base64-encoded build environment. BuildKit secret mounts do not prevent that log entry. Upload the exact build artifacts from a separate local or CI process until this behavior is fixed. See the [environment-file command](https://github.com/coollabsio/coolify/blob/v4.3.23/app/Jobs/ApplicationDeploymentJob.php#L1933-L1951) and [command-log serialization](https://github.com/coollabsio/coolify/blob/v4.3.23/app/Traits/ExecuteRemoteCommand.php#L173-L180).

Each invocation gives the SDK a temporary configuration directory. This prevents uploads from depending on the user's cached CLI database. The helper restores the original directory setting when it finishes.

An upload retry can run `bun scripts/prepare-monitoring.ts` against the same build with upload variables supplied through a private environment file or secret store. It restores archived browser maps, preserves the emitted JavaScript and debug IDs, and archives maps again after upload. A separate rebuild may have different IDs; upload the artifacts that produced the event.

Delivery tests and source map tests have different purposes. A console-injected or `bun -e` error confirms delivery but has no original application source file. Validate useful diagnostics with an error from compiled application code. Confirm its original filename, line, function, and source context in Sentry after map upload.

Run `bun run test`, `bun run check`, `bun run build`, `bun --no-env-file tests/monitoring/server.smoke.ts`, and `bunx playwright test --config tests/monitoring/playwright.config.ts` before deployment. The server smoke starts the compiled Bun server with a local fake intake and no database or Redis credentials. It verifies a real authentication failure resolves through its source map to the original application file and line. The browser test starts a separate dev server and intercepts error delivery to a fake endpoint. Validate an application error in the chosen monitoring project after configuring the DSN and map upload.
