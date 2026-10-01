Run `bun run test:admin-mobile` to test the admin interface without PostgreSQL, Redis, R2, or a login session. To use an installed Chrome browser, set `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`.

The fixture server imports the production admin components and uses sample data. Its routes and hooks are separate from the production app. It does not include database writes or upload endpoints.

The tests check phone, tablet, and desktop widths, touch controls, keyboard navigation, long content, inline editing, the upload queue, and gallery dialogs. Each test also checks browser errors and warnings. Authentication has separate tests in `admin-auth.spec.ts`.
