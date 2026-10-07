# Xerrion.io

Personal website for Lasse Skovgaard Nielsen (Xerrion).

## Tech Stack

- **Framework**: SvelteKit with Svelte 5
- **Styling**: Pure CSS with CSS Variables
- **Runtime**: Bun
- **Hosting**: Cloudflare Pages
- **Storage**: Supabase (for gallery photos)

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Type check 
bun run check

# Build for production
bun run build

# Preview production build
bun run preview
```

Type checks use TypeScript 7 through `svelte-check`'s `tsgo` backend.
The `@typescript/native` dependency provides the TypeScript 7 compiler.
The `typescript` dependency uses Microsoft's TypeScript 6 compatibility package
because SvelteKit and Svelte tooling still need its JavaScript API.
Both `bun run check` and `bun run check:watch` use the native compiler.
Incremental mode tracks generated files and removes them when their Svelte source
files are deleted.
Run `bunx --no-install tsc --version` to check the installed compiler version.
See the [Svelte checker documentation](https://github.com/sveltejs/language-tools/blob/svelte-check%404.7.6/packages/svelte-check/README.md)
for the native backend's limitations.

## Deployment

This site is deployed to Cloudflare Pages. Pushes to `main` trigger automatic deployments.

### Manual deployment

```bash
bun run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```text
src/
├── routes/           # SvelteKit routes
│   ├── +layout.svelte
│   ├── +page.svelte      # Home
│   ├── about/            # About page
│   ├── projects/         # GitHub projects
│   └── gallery/          # Photo gallery (Supabase)
├── lib/
│   ├── components/   # Reusable components
│   ├── stores/       # Svelte stores
│   ├── styles/       # Global styles and theme
│   ├── types/        # TypeScript types
│   └── supabase.ts   # Supabase client
└── static/           # Static assets
```

## Gallery Setup

Photos are stored in Supabase Storage. Create a public bucket named `gallery` with folders:

- `charlie/` - Dog photos
- `life/` - Random moments
- `food/` - Food pics
- `places/` - Travel/location photos

Configure categories in `src/lib/supabase.ts`.

## Pocket ID admin login

Create a confidential OIDC client in Pocket ID with PKCE enabled. Register the
exact callback `https://xerrion.io/auth/pocket-id/callback` and launch URL
`https://xerrion.io/admin`. Keep the client restricted to a dedicated admin group.
Enable Requires Re-Authentication on the Pocket ID client.

Set these runtime environment variables in the deployment secret manager:

| Variable | Value |
| --- | --- |
| `POCKET_ID_ISSUER` | `https://auth.xerrion.io` |
| `POCKET_ID_CLIENT_ID` | The client ID from Pocket ID |
| `POCKET_ID_CLIENT_SECRET` | The client secret from Pocket ID |
| `POCKET_ID_REDIRECT_URI` | The exact registered callback URL |
| `POCKET_ID_ADMIN_SUBJECTS` | Comma-separated Pocket ID user IDs allowed to administer the site |

User IDs are the stable UUIDs in Pocket ID user detail URLs. Do not use email
addresses or usernames as the allowlist. Never commit the client secret. Docker
Compose forwards these values to the app at runtime; build jobs do not need them.

The login uses authorization code flow, PKCE, state, nonce, and signed ID tokens.
Login attempts expire after 10 minutes and can be consumed only once. Sessions
expire after 8 hours. Removing a user ID from the allowlist rejects that user's
existing sessions after the new configuration is deployed. Logout clears the
website session and keeps the Pocket ID session available for other apps.
Each admin login requires fresh Pocket ID authentication with `prompt=login`
and `max_age=0`. The callback requires a recent signed `auth_time` claim.

With all five variables empty, the existing local password login remains
available for development. Setting any Pocket ID variable disables password
login and old password sessions. Partial or invalid configuration fails closed.
The login page redirects to the callback's host so login also works from `www`.
